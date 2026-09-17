const pool = require("../pool");

const ACCESS_STATUSES = ["pending", "accepted", "rejected", "revoked", "expired"];
const CONSULTATION_STATUSES = ["completed", "in_progress", "follow_up_needed"];
const LAB_REQUEST_STATUSES = ["requested", "in_progress", "ready", "delivered", "cancelled"];
const LAB_PRIORITIES = ["routine", "urgent", "stat"];
const FOLLOW_UP_STATUSES = ["scheduled", "done", "cancelled"];
const ACCESS_WINDOW_MS = 24 * 60 * 60 * 1000;

function clampInt(value) {
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
}

function dateRange(range) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const ranges = {
    today: { start: startOfDay },
    week: { start: new Date(startOfDay.getTime() - 6 * 24 * 60 * 60 * 1000) },
    month: { start: new Date(startOfDay.getFullYear(), startOfDay.getMonth(), 1) },
    year: { start: new Date(startOfDay.getFullYear(), 0, 1) },
  };
  const chosen = ranges[range];
  if (!chosen) return null;
  return { start: chosen.start, end: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000) };
}

// ---------------------------------------------------------------------------
// doctor_patient_access
// ---------------------------------------------------------------------------
async function getActiveAccess(doctorUserId, patientId) {
  const { rows } = await pool.query(
    `SELECT * FROM doctor_patient_access
     WHERE doctor_id = $1 AND patient_id = $2 AND status = 'accepted' AND expires_at > now()
     ORDER BY requested_at DESC LIMIT 1`,
    [doctorUserId, patientId]
  );
  return rows[0] ? toPublicAccess(rows[0]) : null;
}

async function latestAccess(doctorUserId, patientId) {
  const { rows } = await pool.query(
    `SELECT * FROM doctor_patient_access
     WHERE doctor_id = $1 AND patient_id = $2
     ORDER BY requested_at DESC LIMIT 1`,
    [doctorUserId, patientId]
  );
  return rows[0] ? toPublicAccess(rows[0]) : null;
}

function toPublicAccess(row) {
  return {
    id: Number(row.id),
    doctorId: Number(row.doctor_id),
    patientId: Number(row.patient_id),
    medicardId: row.medicard_id,
    reason: row.reason ?? null,
    status: row.status,
    requestedAt: row.requested_at,
    decidedAt: row.decided_at,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

async function createAccessRequest({ doctorId, patientId, medicardId, reason }) {
  const { rows } = await pool.query(
    `INSERT INTO doctor_patient_access (doctor_id, patient_id, medicard_id, reason)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [doctorId, patientId, medicardId, reason || null]
  );
  return toPublicAccess(rows[0]);
}

async function getAccessById(id) {
  const { rows } = await pool.query("SELECT * FROM doctor_patient_access WHERE id = $1", [id]);
  return rows[0] ? toPublicAccess(rows[0]) : null;
}

async function updateAccessStatus(id, status) {
  let extra = "";
  const values = [status, id];
  if (status === "accepted") {
    extra = ", decided_at = COALESCE(decided_at, now()), expires_at = now() + $3::interval";
    values.push(`${ACCESS_WINDOW_MS / 3600000} hours`);
  } else if (status === "rejected" || status === "revoked" || status === "expired") {
    extra = ", decided_at = COALESCE(decided_at, now())";
  }
  const { rows } = await pool.query(
    `UPDATE doctor_patient_access SET status = $1${extra} WHERE id = $2 RETURNING *`,
    values
  );
  return rows[0] ? toPublicAccess(rows[0]) : null;
}

async function listAccessByDoctor(doctorUserId, status) {
  const params = [doctorUserId];
  let filter = "WHERE dpa.doctor_id = $1";
  if (status) {
    params.push(status);
    filter += ` AND dpa.status = $${params.length}`;
  }
  const { rows } = await pool.query(
    `SELECT dpa.*, p.name AS patient_name, p.blood_group, p.gender
     FROM doctor_patient_access dpa
     JOIN (SELECT pp.id, u.full_name AS name, pp.blood_group, pp.gender
           FROM patient_profiles pp JOIN users u ON u.id = pp.user_id) p ON p.id = dpa.patient_id
     ${filter}
     ORDER BY dpa.requested_at DESC`,
    params
  );
  return rows.map((r) => ({ ...toPublicAccess(r), patientName: r.patient_name, bloodGroup: r.blood_group ?? null, gender: r.gender ?? null }));
}

async function listAccessByPatient(patientUserId, status) {
  const params = [patientUserId];
  let filter = "WHERE dpa.patient_id = (SELECT id FROM patient_profiles WHERE user_id = $1)";
  if (status) {
    params.push(status);
    filter += ` AND dpa.status = $${params.length}`;
  }
  const { rows } = await pool.query(
    `SELECT dpa.*, du.full_name AS doctor_name, d.specialization,
            h.name AS hospital_name, pu.full_name AS patient_name
     FROM doctor_patient_access dpa
     JOIN users du ON du.id = dpa.doctor_id
     LEFT JOIN doctors d ON d.user_id = dpa.doctor_id
     LEFT JOIN hospitals h ON h.id = d.hospital_id
     JOIN patient_profiles pp ON pp.id = dpa.patient_id
     JOIN users pu ON pu.id = pp.user_id
     ${filter}
     ORDER BY dpa.requested_at DESC`,
    params
  );
  return rows.map((r) => ({
    ...toPublicAccess(r),
    doctorName: r.doctor_name,
    specialization: r.specialization ?? null,
    hospitalName: r.hospital_name ?? null,
    patientName: r.patient_name,
  }));
}

async function expireStaleAccess() {
  const { rows } = await pool.query(
    `UPDATE doctor_patient_access SET status = 'expired'
     WHERE status = 'accepted' AND expires_at <= now() RETURNING id`
  );
  return rows.length;
}

async function listAuthorizedPatients(doctorUserId) {
  const { rows } = await pool.query(
    `SELECT dpa.id AS access_id, dpa.medicard_id, dpa.expires_at, dpa.requested_at,
            pp.id AS patient_id, u.full_name AS patient_name, pp.blood_group, pp.gender,
            pp.city, pp.state, pp.date_of_birth,
            (SELECT COUNT(*)::int FROM medical_records mr WHERE mr.patient_id = pp.id) AS record_count,
            (SELECT MAX(c.consultation_date) FROM consultations c WHERE c.patient_id = pp.id AND c.doctor_id = $1) AS last_consultation,
            (SELECT COUNT(*)::int FROM lab_requests lr WHERE lr.patient_id = pp.id AND lr.doctor_id = $1 AND lr.status = 'requested') AS pending_lab_requests
     FROM doctor_patient_access dpa
     JOIN patient_profiles pp ON pp.id = dpa.patient_id
     JOIN users u ON u.id = pp.user_id
     WHERE dpa.doctor_id = $1 AND dpa.status = 'accepted' AND dpa.expires_at > now()
     ORDER BY last_consultation DESC NULLS LAST, dpa.requested_at DESC`,
    [doctorUserId]
  );
  return rows.map((r) => ({
    accessId: Number(r.access_id),
    patientId: Number(r.patient_id),
    medicardId: r.medicard_id,
    patientName: r.patient_name,
    bloodGroup: r.blood_group ?? null,
    gender: r.gender ?? null,
    city: r.city ?? null,
    state: r.state ?? null,
    dateOfBirth: r.date_of_birth ?? null,
    recordCount: Number(r.record_count || 0),
    lastConsultation: r.last_consultation ?? null,
    pendingLabRequests: Number(r.pending_lab_requests || 0),
    expiresAt: r.expires_at,
    requestedAt: r.requested_at,
  }));
}

async function countAuthorizedPatients(doctorUserId) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM doctor_patient_access
     WHERE doctor_id = $1 AND status = 'accepted' AND expires_at > now()`,
    [doctorUserId]
  );
  return rows[0].count;
}

// ---------------------------------------------------------------------------
// consultations
// ---------------------------------------------------------------------------
function toPublicConsultation(row) {
  return {
    id: Number(row.id),
    patientId: Number(row.patient_id),
    doctorId: Number(row.doctor_id),
    appointmentId: row.appointment_id ? Number(row.appointment_id) : null,
    title: row.title,
    symptoms: row.symptoms ?? null,
    diagnosis: row.diagnosis ?? null,
    adviceNotes: row.advice_notes ?? null,
    consultationDate: row.consultation_date,
    status: row.status,
    hospitalName: row.hospital_name ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function createConsultation(fields) {
  const { rows } = await pool.query(
    `INSERT INTO consultations
       (patient_id, doctor_id, appointment_id, title, symptoms, diagnosis, advice_notes, consultation_date, status, hospital_name)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [
      fields.patientId,
      fields.doctorId,
      fields.appointmentId || null,
      fields.title,
      fields.symptoms || null,
      fields.diagnosis || null,
      fields.adviceNotes || null,
      fields.consultationDate,
      fields.status || "completed",
      fields.hospitalName || null,
    ]
  );
  return toPublicConsultation(rows[0]);
}

async function getConsultationById(id) {
  const { rows } = await pool.query("SELECT * FROM consultations WHERE id = $1", [id]);
  return rows[0] ? toPublicConsultation(rows[0]) : null;
}

async function listConsultations(doctorUserId, range) {
  const params = [doctorUserId];
  let filter = "WHERE c.doctor_id = $1";
  const r = dateRange(range);
  if (r) {
    params.push(r.start, r.end);
    filter += ` AND c.consultation_date >= $${params.length - 1} AND c.consultation_date < $${params.length}`;
  }
  const { rows } = await pool.query(
    `SELECT c.*, u.full_name AS patient_name
     FROM consultations c
     JOIN patient_profiles pp ON pp.id = c.patient_id
     JOIN users u ON u.id = pp.user_id
     ${filter}
     ORDER BY c.consultation_date DESC, c.created_at DESC`,
    params
  );
  return rows.map((r) => ({ ...toPublicConsultation(r), patientName: r.patient_name }));
}

async function listConsultationsByPatient(patientId) {
  const { rows } = await pool.query(
    `SELECT c.*, u.full_name AS doctor_name
     FROM consultations c
     JOIN users u ON u.id = c.doctor_id
     WHERE c.patient_id = $1
     ORDER BY c.consultation_date DESC, c.created_at DESC`,
    [patientId]
  );
  return rows.map((r) => ({ ...toPublicConsultation(r), doctorName: r.doctor_name }));
}

async function updateConsultation(id, fields) {
  const map = {
    title: "title",
    symptoms: "symptoms",
    diagnosis: "diagnosis",
    adviceNotes: "advice_notes",
    consultationDate: "consultation_date",
    status: "status",
    hospitalName: "hospital_name",
    appointmentId: "appointment_id",
  };
  const cols = Object.entries(map)
    .filter(([key]) => fields[key] !== undefined)
    .map(([, col]) => col);
  if (cols.length === 0) return getConsultationById(id);
  const sets = cols.map((col, i) => `${col} = $${i + 1}`);
  const values = cols.map((col) => {
    const key = Object.keys(map).find((k) => map[k] === col);
    return fields[key] ?? null;
  });
  values.push(id);
  await pool.query(`UPDATE consultations SET ${sets.join(", ")} WHERE id = $${values.length}`, values);
  return getConsultationById(id);
}

async function deleteConsultation(id) {
  const { rowCount } = await pool.query("DELETE FROM consultations WHERE id = $1", [id]);
  return rowCount > 0;
}

// ---------------------------------------------------------------------------
// lab requests / reports
// ---------------------------------------------------------------------------
function toPublicLabRequest(row) {
  return {
    id: Number(row.id),
    patientId: Number(row.patient_id),
    doctorId: Number(row.doctor_id),
    consultationId: row.consultation_id ? Number(row.consultation_id) : null,
    title: row.title,
    tests: row.tests,
    instructions: row.instructions ?? null,
    priority: row.priority,
    status: row.status,
    requestedAt: row.requested_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function createLabRequest(fields) {
  const { rows } = await pool.query(
    `INSERT INTO lab_requests (patient_id, doctor_id, consultation_id, title, tests, instructions, priority)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      fields.patientId,
      fields.doctorId,
      fields.consultationId || null,
      fields.title,
      fields.tests,
      fields.instructions || null,
      fields.priority || "routine",
    ]
  );
  return toPublicLabRequest(rows[0]);
}

async function getLabRequestById(id) {
  const { rows } = await pool.query("SELECT * FROM lab_requests WHERE id = $1", [id]);
  return rows[0] ? toPublicLabRequest(rows[0]) : null;
}

async function listLabRequests(doctorUserId, status) {
  const params = [doctorUserId];
  let filter = "WHERE lr.doctor_id = $1";
  if (status) {
    params.push(status);
    filter += ` AND lr.status = $${params.length}`;
  }
  const { rows } = await pool.query(
    `SELECT lr.*, u.full_name AS patient_name
     FROM lab_requests lr
     JOIN patient_profiles pp ON pp.id = lr.patient_id
     JOIN users u ON u.id = pp.user_id
     ${filter}
     ORDER BY lr.created_at DESC`,
    params
  );
  return rows.map((r) => ({ ...toPublicLabRequest(r), patientName: r.patient_name }));
}

async function listLabRequestsByPatient(patientId) {
  const { rows } = await pool.query(
    "SELECT * FROM lab_requests WHERE patient_id = $1 ORDER BY created_at DESC",
    [patientId]
  );
  return rows.map(toPublicLabRequest);
}

async function updateLabRequestStatus(id, status) {
  const { rows } = await pool.query(
    "UPDATE lab_requests SET status = $1 WHERE id = $2 RETURNING *",
    [status, id]
  );
  return rows[0] ? toPublicLabRequest(rows[0]) : null;
}

function toPublicLabReport(row) {
  return {
    id: Number(row.id),
    patientId: Number(row.patient_id),
    doctorId: Number(row.doctor_id),
    labRequestId: row.lab_request_id ? Number(row.lab_request_id) : null,
    title: row.title,
    summary: row.summary ?? null,
    reportText: row.report_text ?? null,
    fileUrl: row.file_url ?? null,
    reportDate: row.report_date,
    createdAt: row.created_at,
  };
}

async function createLabReport(fields) {
  const { rows } = await pool.query(
    `INSERT INTO lab_reports (patient_id, doctor_id, lab_request_id, title, summary, report_text, file_url, report_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      fields.patientId,
      fields.doctorId,
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
  const { rows } = await pool.query("SELECT * FROM lab_reports WHERE id = $1", [id]);
  return rows[0] ? toPublicLabReport(rows[0]) : null;
}

async function listLabReports(doctorUserId) {
  const { rows } = await pool.query(
    `SELECT lr.*, u.full_name AS patient_name
     FROM lab_reports lr
     JOIN patient_profiles pp ON pp.id = lr.patient_id
     JOIN users u ON u.id = pp.user_id
     WHERE lr.doctor_id = $1
     ORDER BY lr.report_date DESC, lr.created_at DESC`,
    [doctorUserId]
  );
  return rows.map((r) => ({ ...toPublicLabReport(r), patientName: r.patient_name }));
}

async function listLabReportsByPatient(patientId) {
  const { rows } = await pool.query(
    "SELECT * FROM lab_reports WHERE patient_id = $1 ORDER BY report_date DESC, created_at DESC",
    [patientId]
  );
  return rows.map(toPublicLabReport);
}

// ---------------------------------------------------------------------------
// medical_documents
// ---------------------------------------------------------------------------
function toPublicDocument(row) {
  return {
    id: Number(row.id),
    patientId: Number(row.patient_id),
    doctorId: Number(row.doctor_id),
    category: row.category,
    title: row.title,
    notes: row.notes ?? null,
    fileUrl: row.file_url ?? null,
    createdAt: row.created_at,
  };
}

async function createDocument(fields) {
  const { rows } = await pool.query(
    `INSERT INTO medical_documents (patient_id, doctor_id, category, title, notes, file_url)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [
      fields.patientId,
      fields.doctorId,
      fields.category || "other",
      fields.title,
      fields.notes || null,
      fields.fileUrl || null,
    ]
  );
  return toPublicDocument(rows[0]);
}

async function getDocumentById(id) {
  const { rows } = await pool.query("SELECT * FROM medical_documents WHERE id = $1", [id]);
  return rows[0] ? toPublicDocument(rows[0]) : null;
}

async function listDocuments(doctorUserId, patientId) {
  const params = [doctorUserId];
  let filter = "WHERE md.doctor_id = $1";
  if (patientId) {
    params.push(patientId);
    filter += ` AND md.patient_id = $${params.length}`;
  }
  const { rows } = await pool.query(
    `SELECT md.*, p.full_name AS patient_name
     FROM medical_documents md
     JOIN patient_profiles pp ON pp.id = md.patient_id
     JOIN users p ON p.id = pp.user_id
     ${filter}
     ORDER BY md.created_at DESC`,
    params
  );
  return rows.map((r) => ({ ...toPublicDocument(r), patientName: r.patient_name }));
}

async function deleteDocument(id) {
  const { rowCount } = await pool.query("DELETE FROM medical_documents WHERE id = $1", [id]);
  return rowCount > 0;
}

// ---------------------------------------------------------------------------
// follow-ups
// ---------------------------------------------------------------------------
function toPublicFollowUp(row) {
  return {
    id: Number(row.id),
    patientId: Number(row.patient_id),
    doctorId: Number(row.doctor_id),
    consultationId: row.consultation_id ? Number(row.consultation_id) : null,
    followUpDate: row.follow_up_date,
    notes: row.notes ?? null,
    status: row.status,
    createdAt: row.created_at,
  };
}

async function createFollowUp(fields) {
  const { rows } = await pool.query(
    `INSERT INTO follow_ups (patient_id, doctor_id, consultation_id, follow_up_date, notes)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [fields.patientId, fields.doctorId, fields.consultationId || null, fields.followUpDate, fields.notes || null]
  );
  return toPublicFollowUp(rows[0]);
}

async function getFollowUpById(id) {
  const { rows } = await pool.query("SELECT * FROM follow_ups WHERE id = $1", [id]);
  return rows[0] ? toPublicFollowUp(rows[0]) : null;
}

async function listFollowUps(doctorUserId, status, dueOnly) {
  const params = [doctorUserId];
  let filter = "WHERE fu.doctor_id = $1";
  if (status) {
    params.push(status);
    filter += ` AND fu.status = $${params.length}`;
  }
  if (dueOnly) {
    filter += " AND fu.status = 'scheduled' AND fu.follow_up_date <= CURRENT_DATE";
  }
  const { rows } = await pool.query(
    `SELECT fu.*, u.full_name AS patient_name
     FROM follow_ups fu
     JOIN patient_profiles pp ON pp.id = fu.patient_id
     JOIN users u ON u.id = pp.user_id
     ${filter}
     ORDER BY fu.follow_up_date ASC, fu.created_at DESC`,
    params
  );
  return rows.map((r) => ({ ...toPublicFollowUp(r), patientName: r.patient_name }));
}

async function updateFollowUpStatus(id, status) {
  const { rows } = await pool.query(
    "UPDATE follow_ups SET status = $1 WHERE id = $2 RETURNING *",
    [status, id]
  );
  return rows[0] ? toPublicFollowUp(rows[0]) : null;
}

// ---------------------------------------------------------------------------
// dashboard & analytics
// ---------------------------------------------------------------------------
async function getDoctorDashboard(doctorUserId) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), 1);

  const [patients, consultationsTotal, consultationsToday, consultationsMonth, apptsToday, apptsUpcoming, labPending, followUpsDue, unread] =
    await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int AS count FROM doctor_patient_access
         WHERE doctor_id = $1 AND status = 'accepted' AND expires_at > now()`,
        [doctorUserId]
      ),
      pool.query("SELECT COUNT(*)::int AS count FROM consultations WHERE doctor_id = $1", [doctorUserId]),
      pool.query(
        "SELECT COUNT(*)::int AS count FROM consultations WHERE doctor_id = $1 AND consultation_date >= $2 AND consultation_date < $3",
        [doctorUserId, startOfDay, endOfDay]
      ),
      pool.query(
        "SELECT COUNT(*)::int AS count FROM consultations WHERE doctor_id = $1 AND consultation_date >= $2",
        [doctorUserId, startOfMonth]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS count FROM appointments a JOIN doctors d ON d.id = a.doctor_id
         WHERE d.user_id = $1 AND a.appointment_date = $2 AND a.status IN ('scheduled','confirmed')`,
        [doctorUserId, startOfDay]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS count FROM appointments a JOIN doctors d ON d.id = a.doctor_id
         WHERE d.user_id = $1 AND a.appointment_date >= $2 AND a.status IN ('scheduled','confirmed')`,
        [doctorUserId, startOfDay]
      ),
      pool.query(
        "SELECT COUNT(*)::int AS count FROM lab_requests WHERE doctor_id = $1 AND status = 'requested'",
        [doctorUserId]
      ),
      pool.query(
        "SELECT COUNT(*)::int AS count FROM follow_ups WHERE doctor_id = $1 AND status = 'scheduled' AND follow_up_date <= CURRENT_DATE",
        [doctorUserId]
      ),
      pool.query(
        "SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = false",
        [doctorUserId]
      ),
    ]);

  const recentRes = await pool.query(
    `SELECT c.*, u.full_name AS patient_name
     FROM consultations c
     JOIN patient_profiles pp ON pp.id = c.patient_id
     JOIN users u ON u.id = pp.user_id
     WHERE c.doctor_id = $1
     ORDER BY c.consultation_date DESC, c.created_at DESC LIMIT 6`,
    [doctorUserId]
  );

  return {
    authorizedPatients: patients.rows[0].count,
    totalConsultations: consultationsTotal.rows[0].count,
    todayConsultations: consultationsToday.rows[0].count,
    monthConsultations: consultationsMonth.rows[0].count,
    todayAppointments: apptsToday.rows[0].count,
    upcomingAppointments: apptsUpcoming.rows[0].count,
    pendingLabRequests: labPending.rows[0].count,
    followUpsDue: followUpsDue.rows[0].count,
    unreadNotifications: unread.rows[0].count,
    recentConsultations: recentRes.rows.map((r) => ({ ...toPublicConsultation(r), patientName: r.patient_name })),
  };
}

async function getAnalytics(doctorUserId, range) {
  const r = dateRange(range);
  const baseParams = [doctorUserId];
  if (r) baseParams.push(r.start, r.end);

  const consFilter = r ? " consultation_date >= $2 AND consultation_date < $3" : "";
  const consParams = r ? [doctorUserId, r.start, r.end] : [doctorUserId];
  const labFilter = r ? " requested_at >= $2 AND requested_at < $3" : "";
  const labParams = r ? [doctorUserId, r.start, r.end] : [doctorUserId];

  const monthly = await pool.query(
    `SELECT to_char(date_trunc('month', c.consultation_date), 'YYYY-MM') AS month, COUNT(*)::int AS count
     FROM consultations c WHERE c.doctor_id = $1${consFilter ? ` AND${consFilter}` : ""}
     GROUP BY 1 ORDER BY 1`,
    consParams
  );

  const byStatus = await pool.query(
    `SELECT status, COUNT(*)::int AS count FROM consultations
     WHERE doctor_id = $1${consFilter ? ` AND${consFilter}` : ""} GROUP BY status`,
    consParams
  );

  const topDiagnoses = await pool.query(
    `SELECT NULLIF(trim(diagnosis), '') AS diagnosis, COUNT(*)::int AS count
     FROM consultations WHERE doctor_id = $1${consFilter ? ` AND${consFilter}` : ""}
       AND diagnosis IS NOT NULL AND trim(diagnosis) <> ''
     GROUP BY 1 ORDER BY 2 DESC LIMIT 8`,
    consParams
  );

  const summaryRes = await pool.query(
    `SELECT
       (SELECT COUNT(*)::int FROM consultations c WHERE c.doctor_id = $1${consFilter ? ` AND${consFilter}` : ""}) AS consultations,
       (SELECT COUNT(*)::int FROM lab_requests lr WHERE lr.doctor_id = $1${labFilter ? ` AND${labFilter}` : ""}) AS lab_requests`,
    r ? [doctorUserId, r.start, r.end] : [doctorUserId]
  );

  return {
    range: range || "all",
    summary: {
      consultations: summaryRes.rows[0].consultations,
      labRequests: summaryRes.rows[0].lab_requests,
    },
    monthly: monthly.rows.map((r) => ({ month: r.month, count: r.count })),
    byStatus: byStatus.rows.map((r) => ({ status: r.status, count: r.count })),
    topDiagnoses: topDiagnoses.rows.map((r) => ({ diagnosis: r.diagnosis, count: r.count })),
  };
}

module.exports = {
  ACCESS_STATUSES,
  CONSULTATION_STATUSES,
  LAB_REQUEST_STATUSES,
  LAB_PRIORITIES,
  FOLLOW_UP_STATUSES,
  getActiveAccess,
  latestAccess,
  createAccessRequest,
  getAccessById,
  updateAccessStatus,
  listAccessByDoctor,
  listAccessByPatient,
  expireStaleAccess,
  listAuthorizedPatients,
  countAuthorizedPatients,
  createConsultation,
  getConsultationById,
  listConsultations,
  listConsultationsByPatient,
  updateConsultation,
  deleteConsultation,
  createLabRequest,
  getLabRequestById,
  listLabRequests,
  listLabRequestsByPatient,
  updateLabRequestStatus,
  createLabReport,
  getLabReportById,
  listLabReports,
  listLabReportsByPatient,
  createDocument,
  getDocumentById,
  listDocuments,
  deleteDocument,
  createFollowUp,
  getFollowUpById,
  listFollowUps,
  updateFollowUpStatus,
  getDoctorDashboard,
  getAnalytics,
};