const pool = require("../pool");

const LAB_REQUEST_STATUSES = ["requested", "in_progress", "ready", "delivered", "cancelled"];

function toPublicLabRequest(row) {
  return {
    id: Number(row.id),
    patientId: Number(row.patient_id),
    doctorId: row.doctor_id ? Number(row.doctor_id) : null,
    consultationId: row.consultation_id ? Number(row.consultation_id) : null,
    hospitalId: row.hospital_id ? Number(row.hospital_id) : null,
    assignedTo: row.assigned_to ? Number(row.assigned_to) : null,
    title: row.title,
    tests: row.tests,
    instructions: row.instructions ?? null,
    priority: row.priority,
    status: row.status,
    requestedAt: row.requested_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    patientName: row.patient_name ?? null,
    medicardId: row.medicard_id ?? null,
    doctorName: row.doctor_name ?? null,
    hospitalName: row.hospital_name ?? null,
  };
}

function toPublicLabReport(row) {
  return {
    id: Number(row.id),
    patientId: Number(row.patient_id),
    doctorId: row.doctor_id ? Number(row.doctor_id) : null,
    labRequestId: row.lab_request_id ? Number(row.lab_request_id) : null,
    title: row.title,
    summary: row.summary ?? null,
    reportText: row.report_text ?? null,
    fileUrl: row.file_url ?? null,
    reportDate: row.report_date,
    createdAt: row.created_at,
    patientName: row.patient_name ?? null,
    medicardId: row.medicard_id ?? null,
    labRequestTitle: row.lab_request_title ?? null,
  };
}

const REQUEST_SELECT = `
  SELECT lr.*, pu.full_name AS patient_name, m.medicard_id,
         du.full_name AS doctor_name, h.name AS hospital_name
  FROM lab_requests lr
  JOIN patient_profiles pp ON pp.id = lr.patient_id
  JOIN users pu ON pu.id = pp.user_id
  LEFT JOIN medicards m ON m.patient_id = pp.id
  LEFT JOIN users du ON du.id = lr.doctor_id
  LEFT JOIN hospitals h ON h.id = lr.hospital_id
`;

async function listLabRequests({ status = null, hospitalId = null } = {}) {
  const { rows } = await pool.query(
    `${REQUEST_SELECT}
     WHERE ($1::text IS NULL OR lr.status = $1)
       AND ($2::bigint IS NULL OR lr.hospital_id = $2 OR lr.hospital_id IS NULL)
     ORDER BY
       CASE lr.priority WHEN 'stat' THEN 0 WHEN 'urgent' THEN 1 ELSE 2 END,
       lr.requested_at DESC`,
    [status, hospitalId]
  );
  return rows.map(toPublicLabRequest);
}

async function getLabRequestById(id, hospitalId = null) {
  const { rows } = await pool.query(
    `${REQUEST_SELECT}
     WHERE lr.id = $1 AND ($2::bigint IS NULL OR lr.hospital_id = $2 OR lr.hospital_id IS NULL)
     LIMIT 1`,
    [id, hospitalId]
  );
  return rows[0] ? toPublicLabRequest(rows[0]) : null;
}

async function updateLabRequestStatus(id, status, staffUserId) {
  const assigned = status === "in_progress" ? ", assigned_to = COALESCE(assigned_to, $3)" : "";
  const params = [status, id];
  if (status === "in_progress") params.push(staffUserId);
  const { rows } = await pool.query(
    `UPDATE lab_requests SET status = $1${assigned} WHERE id = $2 RETURNING *`,
    params
  );
  return rows[0] ? toPublicLabRequest(rows[0]) : null;
}

async function listLabReports({ hospitalId = null, staffUserId = null } = {}) {
  const params = [];
  const filters = [];
  if (staffUserId) {
    params.push(staffUserId);
    filters.push(`lr.doctor_id = $${params.length}`);
  }
  if (hospitalId !== null) {
    params.push(hospitalId);
    filters.push(`(h.id = $${params.length} OR h.id IS NULL)`);
  }
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const { rows } = await pool.query(
    `SELECT lr.*, pu.full_name AS patient_name, m.medicard_id,
            req.title AS lab_request_title
     FROM lab_reports lr
     JOIN patient_profiles pp ON pp.id = lr.patient_id
     JOIN users pu ON pu.id = pp.user_id
     LEFT JOIN medicards m ON m.patient_id = pp.id
     LEFT JOIN lab_requests req ON req.id = lr.lab_request_id
     LEFT JOIN users du ON du.id = lr.doctor_id
     LEFT JOIN doctors d ON d.user_id = lr.doctor_id
     LEFT JOIN hospitals h ON h.id = d.hospital_id
     ${where}
     ORDER BY lr.report_date DESC, lr.created_at DESC`,
    params
  );
  return rows.map(toPublicLabReport);
}

async function createLabReport(fields) {
  const { rows } = await pool.query(
    `INSERT INTO lab_reports
       (patient_id, doctor_id, lab_request_id, title, summary, report_text, file_url, report_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      fields.patientId,
      fields.staffUserId,
      fields.labRequestId || null,
      fields.title,
      fields.summary || null,
      fields.reportText || null,
      fields.fileUrl || null,
      fields.reportDate || new Date(),
    ]
  );
  return toPublicLabReport(rows[0]);
}

async function getLabReportById(id) {
  const { rows } = await pool.query(
    `SELECT lr.*, pu.full_name AS patient_name, m.medicard_id
     FROM lab_reports lr
     JOIN patient_profiles pp ON pp.id = lr.patient_id
     JOIN users pu ON pu.id = pp.user_id
     LEFT JOIN medicards m ON m.patient_id = pp.id
     WHERE lr.id = $1`,
    [id]
  );
  return rows[0] ? toPublicLabReport(rows[0]) : null;
}

async function getLabDashboard(hospitalId = null) {
  const { rows } = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'requested')::int AS requested,
       COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
       COUNT(*) FILTER (WHERE status = 'ready')::int AS ready,
       COUNT(*) FILTER (WHERE status = 'delivered')::int AS delivered,
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE priority IN ('urgent','stat') AND status IN ('requested','in_progress'))::int AS urgent
     FROM lab_requests
     WHERE ($1::bigint IS NULL OR hospital_id = $1 OR hospital_id IS NULL)`,
    [hospitalId]
  );
  const recent = await pool.query(
    `${REQUEST_SELECT}
     WHERE ($1::bigint IS NULL OR lr.hospital_id = $1 OR lr.hospital_id IS NULL)
     ORDER BY lr.requested_at DESC LIMIT 5`,
    [hospitalId]
  );
  const reportsToday = await pool.query(
    "SELECT COUNT(*)::int AS count FROM lab_reports WHERE report_date = CURRENT_DATE"
  );
  const r = rows[0];
  return {
    requested: r.requested,
    inProgress: r.in_progress,
    ready: r.ready,
    delivered: r.delivered,
    total: r.total,
    urgent: r.urgent,
    reportsToday: reportsToday.rows[0].count,
    recentRequests: recent.rows.map(toPublicLabRequest),
  };
}

async function patientHasLabRequestInHospital(patientId, hospitalId = null) {
  const { rows } = await pool.query(
    `SELECT 1 AS found FROM lab_requests
     WHERE patient_id = $1 AND ($2::bigint IS NULL OR hospital_id = $2 OR hospital_id IS NULL)
     LIMIT 1`,
    [patientId, hospitalId]
  );
  return rows.length > 0;
}

// Patients a lab technician may legitimately work with: ones that have lab
// requests at the staff member's hospital.
async function listLabPortalPatients({ hospitalId = null, q = null } = {}) {
  const params = [hospitalId];
  let filter = "WHERE ($1::bigint IS NULL OR lr.hospital_id = $1 OR lr.hospital_id IS NULL)";
  if (typeof q === "string" && q.trim()) {
    params.push(`%${q.trim()}%`);
    filter += ` AND (pu.full_name ILIKE $${params.length} OR m.medicard_id ILIKE $${params.length})`;
  }
  const { rows } = await pool.query(
    `SELECT pp.id AS patient_id, pu.full_name AS name, m.medicard_id,
            MAX(lr.requested_at) AS last_request_at
     FROM lab_requests lr
     JOIN patient_profiles pp ON pp.id = lr.patient_id
     JOIN users pu ON pu.id = pp.user_id
     LEFT JOIN medicards m ON m.patient_id = pp.id
     ${filter}
     GROUP BY pp.id, pu.full_name, m.medicard_id
     ORDER BY pu.full_name ASC
     LIMIT 200`,
    params
  );
  return rows.map((r) => ({
    patientId: Number(r.patient_id),
    name: r.name,
    medicardId: r.medicard_id ?? null,
    lastRequestAt: r.last_request_at ?? null,
  }));
}

module.exports = {
  LAB_REQUEST_STATUSES,
  listLabRequests,
  getLabRequestById,
  updateLabRequestStatus,
  listLabReports,
  getLabReportById,
  createLabReport,
  getLabDashboard,
  patientHasLabRequestInHospital,
  listLabPortalPatients,
};
