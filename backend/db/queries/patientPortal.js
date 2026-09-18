const pool = require("../pool");
const notifications = require("./notifications");

// Everything in this module is scoped to a single patient_profiles.id. The id
// is always resolved from the authenticated user, never from request input.

async function getPatientContext(patientId) {
  const { rows } = await pool.query(
    `SELECT pp.id, pp.user_id, pp.blood_group, pp.date_of_birth, pp.gender,
            pp.height, pp.weight, pp.address, pp.city, pp.state, pp.pincode,
            u.full_name AS name, u.email, u.phone, m.medicard_id, m.qr_code_data, m.created_at AS card_issued
     FROM patient_profiles pp
     JOIN users u ON u.id = pp.user_id
     LEFT JOIN medicards m ON m.patient_id = pp.id
     WHERE pp.id = $1`,
    [patientId]
  );
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    id: Number(r.id),
    userId: Number(r.user_id),
    name: r.name,
    email: r.email ?? null,
    phone: r.phone ?? null,
    bloodGroup: r.blood_group ?? null,
    dateOfBirth: r.date_of_birth ?? null,
    gender: r.gender ?? null,
    height: r.height ? Number(r.height) : null,
    weight: r.weight ? Number(r.weight) : null,
    address: r.address ?? null,
    city: r.city ?? null,
    state: r.state ?? null,
    pincode: r.pincode ?? null,
    medicardId: r.medicard_id ?? null,
    qrCodeData: r.qr_code_data ?? null,
    cardIssued: r.card_issued ?? null,
  };
}

function toActivity(row) {
  return {
    type: row.type,
    id: Number(row.id),
    title: row.title,
    subtitle: row.subtitle ?? null,
    doctorName: row.doctor_name ?? null,
    hospitalName: row.hospital_name ?? null,
    date: row.date,
  };
}

async function getDashboardStats(patientId) {
  const [consultations, prescriptions, labReports, scans, records, doctors, appts, followUps, pendingAccess] =
    await Promise.all([
      pool.query("SELECT COUNT(*)::int AS c FROM consultations WHERE patient_id = $1", [patientId]),
      pool.query("SELECT COUNT(*)::int AS c FROM prescriptions WHERE patient_id = $1", [patientId]),
      pool.query("SELECT COUNT(*)::int AS c FROM lab_reports WHERE patient_id = $1", [patientId]),
      pool.query("SELECT COUNT(*)::int AS c FROM medical_records WHERE patient_id = $1 AND record_type = 'scan'", [patientId]),
      pool.query("SELECT COUNT(*)::int AS c FROM medical_records WHERE patient_id = $1", [patientId]),
      pool.query("SELECT COUNT(DISTINCT doctor_id)::int AS c FROM consultations WHERE patient_id = $1", [patientId]),
      pool.query(
        `SELECT COUNT(*)::int AS c FROM appointments
         WHERE patient_id = $1 AND status IN ('scheduled','confirmed') AND appointment_date >= CURRENT_DATE`,
        [patientId]
      ),
      pool.query(
        "SELECT COUNT(*)::int AS c FROM follow_ups WHERE patient_id = $1 AND status = 'scheduled' AND follow_up_date <= CURRENT_DATE",
        [patientId]
      ),
      pool.query("SELECT COUNT(*)::int AS c FROM doctor_patient_access WHERE patient_id = $1 AND status = 'pending'", [patientId]),
    ]);

  return {
    doctors: doctors.rows[0].c,
    consultations: consultations.rows[0].c,
    prescriptions: prescriptions.rows[0].c,
    labReports: labReports.rows[0].c,
    scans: scans.rows[0].c,
    records: records.rows[0].c,
    upcomingAppointments: appts.rows[0].c,
    followUpsDue: followUps.rows[0].c,
    pendingAccessRequests: pendingAccess.rows[0].c,
  };
}

async function getRecentActivity(patientId, limit = 8) {
  const { rows } = await pool.query(
    `SELECT 'consultation' AS type, c.id, c.title,
            COALESCE(c.diagnosis, c.symptoms) AS subtitle,
            c.consultation_date AS date, u.full_name AS doctor_name, c.hospital_name
       FROM consultations c JOIN users u ON u.id = c.doctor_id WHERE c.patient_id = $1
     UNION ALL
     SELECT 'prescription', p.id, COALESCE(NULLIF(p.diagnosis, ''), 'Prescription'),
            p.notes, p.prescription_date, u.full_name, NULL
       FROM prescriptions p LEFT JOIN users u ON u.id = p.doctor_id WHERE p.patient_id = $1
     UNION ALL
     SELECT 'lab_report', lr.id, lr.title, lr.summary, lr.report_date, u.full_name, NULL
       FROM lab_reports lr LEFT JOIN users u ON u.id = lr.doctor_id WHERE lr.patient_id = $1
     UNION ALL
     SELECT 'record', mr.id, mr.title, mr.diagnosis, mr.record_date, mr.doctor_name, mr.hospital_name
       FROM medical_records mr WHERE mr.patient_id = $1
     ORDER BY date DESC, id DESC
     LIMIT $2`,
    [patientId, limit]
  );
  return rows.map(toActivity);
}

async function getRecentDoctors(patientId, limit = 6) {
  const { rows } = await pool.query(
    `SELECT d.user_id, u.full_name AS doctor_name, d.specialization, d.qualification,
            h.name AS hospital_name,
            COUNT(c.id)::int AS consultations,
            MAX(c.consultation_date) AS last_visit
     FROM doctors d
     JOIN users u ON u.id = d.user_id
     LEFT JOIN hospitals h ON h.id = d.hospital_id
     LEFT JOIN consultations c ON c.doctor_id = d.user_id AND c.patient_id = $1
     WHERE d.user_id IN (
       SELECT doctor_id FROM consultations WHERE patient_id = $1
       UNION SELECT doctor_id FROM prescriptions WHERE patient_id = $1 AND doctor_id IS NOT NULL
       UNION SELECT doctor_id FROM lab_requests WHERE patient_id = $1
     )
     GROUP BY d.user_id, u.full_name, d.specialization, d.qualification, h.name
     ORDER BY last_visit DESC NULLS LAST
     LIMIT $2`,
    [patientId, limit]
  );
  return rows.map((r) => ({
    doctorId: Number(r.user_id),
    name: r.doctor_name,
    specialization: r.specialization ?? null,
    qualification: r.qualification ?? null,
    hospitalName: r.hospital_name ?? null,
    consultations: Number(r.consultations || 0),
    lastVisit: r.last_visit ?? null,
  }));
}

async function getUpcomingAppointments(patientId, limit = 5) {
  const { rows } = await pool.query(
    `SELECT a.id, a.appointment_date, a.appointment_time, a.reason, a.status, a.notes,
            u.full_name AS doctor_name, d.specialization,
            COALESCE(hp.name, hd.name) AS hospital_name
     FROM appointments a
     LEFT JOIN doctors d ON d.id = a.doctor_id
     LEFT JOIN users u ON u.id = d.user_id
     LEFT JOIN hospitals hp ON hp.id = a.hospital_id
     LEFT JOIN hospitals hd ON hd.id = d.hospital_id
     WHERE a.patient_id = $1 AND a.status IN ('scheduled','confirmed') AND a.appointment_date >= CURRENT_DATE
     ORDER BY a.appointment_date ASC, a.appointment_time ASC NULLS LAST
     LIMIT $2`,
    [patientId, limit]
  );
  return rows.map((r) => ({
    id: Number(r.id),
    appointmentDate: r.appointment_date,
    appointmentTime: r.appointment_time ?? null,
    reason: r.reason ?? null,
    status: r.status,
    notes: r.notes ?? null,
    doctorName: r.doctor_name ?? null,
    specialization: r.specialization ?? null,
    hospitalName: r.hospital_name ?? null,
  }));
}

async function getUpcomingFollowUp(patientId) {
  const { rows } = await pool.query(
    `SELECT fu.id, fu.follow_up_date, fu.notes, fu.status,
            u.full_name AS doctor_name, d.specialization,
            c.title AS consultation_title, c.diagnosis
     FROM follow_ups fu
     JOIN users u ON u.id = fu.doctor_id
     LEFT JOIN doctors d ON d.user_id = fu.doctor_id
     LEFT JOIN consultations c ON c.id = fu.consultation_id
     WHERE fu.patient_id = $1 AND fu.status = 'scheduled' AND fu.follow_up_date >= CURRENT_DATE
     ORDER BY fu.follow_up_date ASC
     LIMIT 1`,
    [patientId]
  );
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    id: Number(r.id),
    followUpDate: r.follow_up_date,
    notes: r.notes ?? null,
    status: r.status,
    doctorName: r.doctor_name,
    specialization: r.specialization ?? null,
    consultationTitle: r.consultation_title ?? null,
    diagnosis: r.diagnosis ?? null,
  };
}

async function listAccessRequests(patientId, status) {
  const params = [patientId];
  let filter = "WHERE dpa.patient_id = $1";
  if (status) {
    params.push(status);
    filter += ` AND dpa.status = $${params.length}`;
  }
  const { rows } = await pool.query(
    `SELECT dpa.id, dpa.doctor_id, dpa.medicard_id, dpa.reason, dpa.status,
            dpa.requested_at, dpa.decided_at, dpa.expires_at,
            u.full_name AS doctor_name, d.specialization, h.name AS hospital_name
     FROM doctor_patient_access dpa
     JOIN users u ON u.id = dpa.doctor_id
     LEFT JOIN doctors d ON d.user_id = dpa.doctor_id
     LEFT JOIN hospitals h ON h.id = d.hospital_id
     ${filter}
     ORDER BY dpa.requested_at DESC`,
    params
  );
  return rows.map((r) => ({
    id: Number(r.id),
    doctorId: Number(r.doctor_id),
    medicardId: r.medicard_id,
    reason: r.reason ?? null,
    status: r.status,
    requestedAt: r.requested_at,
    decidedAt: r.decided_at,
    expiresAt: r.expires_at,
    doctorName: r.doctor_name,
    specialization: r.specialization ?? null,
    hospitalName: r.hospital_name ?? null,
  }));
}

// ---------------------------------------------------------------------------
// doctors
// ---------------------------------------------------------------------------
async function listPatientDoctors(patientId, search) {
  const params = [patientId];
  let searchFilter = "";
  if (search) {
    params.push(`%${search}%`);
    searchFilter = ` AND (u.full_name ILIKE $${params.length} OR d.specialization ILIKE $${params.length} OR h.name ILIKE $${params.length})`;
  }
  const { rows } = await pool.query(
    `SELECT d.user_id, u.full_name AS doctor_name, u.email, u.phone,
            d.specialization, d.qualification, d.experience, d.consultation_fee,
            h.name AS hospital_name,
            COUNT(c.id)::int AS consultations,
            MAX(c.consultation_date) AS last_visit,
            (SELECT dpa.status FROM doctor_patient_access dpa
              WHERE dpa.doctor_id = d.user_id AND dpa.patient_id = $1
              ORDER BY dpa.requested_at DESC LIMIT 1) AS access_status
     FROM doctors d
     JOIN users u ON u.id = d.user_id
     LEFT JOIN hospitals h ON h.id = d.hospital_id
     LEFT JOIN consultations c ON c.doctor_id = d.user_id AND c.patient_id = $1
     WHERE d.user_id IN (
       SELECT doctor_id FROM consultations WHERE patient_id = $1
       UNION SELECT doctor_id FROM prescriptions WHERE patient_id = $1 AND doctor_id IS NOT NULL
       UNION SELECT doctor_id FROM lab_requests WHERE patient_id = $1
     )${searchFilter}
     GROUP BY d.user_id, u.full_name, u.email, u.phone, d.specialization, d.qualification,
              d.experience, d.consultation_fee, h.name
     ORDER BY last_visit DESC NULLS LAST`,
    params
  );
  return rows.map((r) => ({
    doctorId: Number(r.user_id),
    name: r.doctor_name,
    email: r.email ?? null,
    phone: r.phone ?? null,
    specialization: r.specialization ?? null,
    qualification: r.qualification ?? null,
    experience: r.experience != null ? Number(r.experience) : null,
    consultationFee: r.consultation_fee != null ? Number(r.consultation_fee) : null,
    hospitalName: r.hospital_name ?? null,
    consultations: Number(r.consultations || 0),
    lastVisit: r.last_visit ?? null,
    accessStatus: r.access_status ?? null,
  }));
}

async function getPatientDoctorDetail(patientId, doctorId) {
  const { rows } = await pool.query(
    `SELECT d.user_id, u.full_name AS doctor_name, u.email, u.phone,
            d.specialization, d.qualification, d.registration_number, d.experience,
            d.consultation_fee, h.name AS hospital_name
     FROM doctors d
     JOIN users u ON u.id = d.user_id
     LEFT JOIN hospitals h ON h.id = d.hospital_id
     WHERE d.user_id = $1`,
    [doctorId]
  );
  if (!rows[0]) return null;

  const accessRes = await pool.query(
    `SELECT id, status, reason, requested_at, decided_at, expires_at
     FROM doctor_patient_access
     WHERE doctor_id = $1 AND patient_id = $2
     ORDER BY requested_at DESC LIMIT 1`,
    [doctorId, patientId]
  );

  const [consultations, prescriptions, labRequests, labReports, documents] = await Promise.all([
    pool.query(
      "SELECT id, title, diagnosis, consultation_date, status, hospital_name FROM consultations WHERE patient_id = $1 AND doctor_id = $2 ORDER BY consultation_date DESC",
      [patientId, doctorId]
    ),
    pool.query(
      `SELECT p.id, p.diagnosis, p.prescription_date, p.status,
              (SELECT COUNT(*)::int FROM prescription_items pi WHERE pi.prescription_id = p.id) AS item_count
       FROM prescriptions p WHERE p.patient_id = $1 AND p.doctor_id = $2
       ORDER BY p.prescription_date DESC`,
      [patientId, doctorId]
    ),
    pool.query(
      "SELECT id, title, tests, priority, status, requested_at FROM lab_requests WHERE patient_id = $1 AND doctor_id = $2 ORDER BY requested_at DESC",
      [patientId, doctorId]
    ),
    pool.query(
      "SELECT id, title, summary, report_date FROM lab_reports WHERE patient_id = $1 AND doctor_id = $2 ORDER BY report_date DESC",
      [patientId, doctorId]
    ),
    pool.query(
      "SELECT id, title, category, notes, file_url, created_at FROM medical_documents WHERE patient_id = $1 AND doctor_id = $2 ORDER BY created_at DESC",
      [patientId, doctorId]
    ),
  ]);

  const d = rows[0];
  return {
    doctor: {
      doctorId: Number(d.user_id),
      name: d.doctor_name,
      email: d.email ?? null,
      phone: d.phone ?? null,
      specialization: d.specialization ?? null,
      qualification: d.qualification ?? null,
      registrationNumber: d.registration_number ?? null,
      experience: d.experience != null ? Number(d.experience) : null,
      consultationFee: d.consultation_fee != null ? Number(d.consultation_fee) : null,
      hospitalName: d.hospital_name ?? null,
    },
    access: accessRes.rows[0]
      ? {
          id: Number(accessRes.rows[0].id),
          status: accessRes.rows[0].status,
          reason: accessRes.rows[0].reason ?? null,
          requestedAt: accessRes.rows[0].requested_at,
          decidedAt: accessRes.rows[0].decided_at,
          expiresAt: accessRes.rows[0].expires_at,
        }
      : null,
    stats: {
      consultations: consultations.rows.length,
      prescriptions: prescriptions.rows.length,
      labRequests: labRequests.rows.length,
      labReports: labReports.rows.length,
      documents: documents.rows.length,
    },
    consultations: consultations.rows.map((r) => ({
      id: Number(r.id),
      title: r.title,
      diagnosis: r.diagnosis ?? null,
      consultationDate: r.consultation_date,
      status: r.status,
      hospitalName: r.hospital_name ?? null,
    })),
    prescriptions: prescriptions.rows.map((r) => ({
      id: Number(r.id),
      diagnosis: r.diagnosis ?? null,
      prescriptionDate: r.prescription_date,
      status: r.status,
      itemCount: Number(r.item_count || 0),
    })),
    labRequests: labRequests.rows.map((r) => ({
      id: Number(r.id),
      title: r.title,
      tests: r.tests,
      priority: r.priority,
      status: r.status,
      requestedAt: r.requested_at,
    })),
    labReports: labReports.rows.map((r) => ({
      id: Number(r.id),
      title: r.title,
      summary: r.summary ?? null,
      reportDate: r.report_date,
    })),
    documents: documents.rows.map((r) => ({
      id: Number(r.id),
      title: r.title,
      category: r.category,
      notes: r.notes ?? null,
      fileUrl: r.file_url ?? null,
      createdAt: r.created_at,
    })),
  };
}

// ---------------------------------------------------------------------------
// timeline / records / labs / scans / documents
// ---------------------------------------------------------------------------
async function getTimeline(patientId, types) {
  const params = [patientId];
  let typeFilter = "";
  if (Array.isArray(types) && types.length > 0) {
    params.push(types);
    typeFilter = ` WHERE type = ANY($${params.length})`;
  }
  const { rows } = await pool.query(
    `SELECT * FROM (
       SELECT 'consultation' AS type, c.id, c.title AS title,
              COALESCE(c.diagnosis, c.symptoms) AS subtitle,
              c.consultation_date AS date, u.full_name AS doctor_name, c.hospital_name
         FROM consultations c JOIN users u ON u.id = c.doctor_id WHERE c.patient_id = $1
       UNION ALL
       SELECT 'prescription', p.id, COALESCE(NULLIF(p.diagnosis, ''), 'Prescription'),
              p.notes, p.prescription_date, u.full_name, NULL
         FROM prescriptions p LEFT JOIN users u ON u.id = p.doctor_id WHERE p.patient_id = $1
       UNION ALL
       SELECT 'lab_report', lr.id, lr.title, lr.summary, lr.report_date, u.full_name, NULL
         FROM lab_reports lr LEFT JOIN users u ON u.id = lr.doctor_id WHERE lr.patient_id = $1
       UNION ALL
       SELECT 'record', mr.id, mr.title, mr.diagnosis, mr.record_date, mr.doctor_name, mr.hospital_name
         FROM medical_records mr WHERE mr.patient_id = $1
       UNION ALL
       SELECT 'appointment', a.id, COALESCE(NULLIF(a.reason, ''), 'Appointment'),
              a.status, a.appointment_date, u.full_name, COALESCE(hp.name, hd.name)
         FROM appointments a
         LEFT JOIN doctors d ON d.id = a.doctor_id
         LEFT JOIN users u ON u.id = d.user_id
         LEFT JOIN hospitals hp ON hp.id = a.hospital_id
         LEFT JOIN hospitals hd ON hd.id = d.hospital_id
        WHERE a.patient_id = $1
     ) events${typeFilter}
     ORDER BY date DESC, id DESC
     LIMIT 300`,
    params
  );
  return rows.map(toActivity);
}

async function getPatientDocuments(patientId) {
  const { rows } = await pool.query(
    `SELECT md.id, md.category, md.title, md.notes, md.file_url, md.created_at,
            u.full_name AS doctor_name
     FROM medical_documents md
     LEFT JOIN users u ON u.id = md.doctor_id
     WHERE md.patient_id = $1
     ORDER BY md.created_at DESC`,
    [patientId]
  );
  return rows.map((r) => ({
    id: Number(r.id),
    category: r.category,
    title: r.title,
    notes: r.notes ?? null,
    fileUrl: r.file_url ?? null,
    createdAt: r.created_at,
    doctorName: r.doctor_name ?? null,
  }));
}

async function getScans(patientId) {
  const { rows } = await pool.query(
    `SELECT id, title, description, diagnosis, doctor_name, hospital_name, record_date, file_url
     FROM medical_records
     WHERE patient_id = $1 AND record_type = 'scan'
     ORDER BY record_date DESC, created_at DESC`,
    [patientId]
  );
  return rows.map((r) => ({
    id: Number(r.id),
    title: r.title,
    description: r.description ?? null,
    diagnosis: r.diagnosis ?? null,
    doctorName: r.doctor_name ?? null,
    hospitalName: r.hospital_name ?? null,
    recordDate: r.record_date,
    fileUrl: r.file_url ?? null,
  }));
}

async function getLabReports(patientId) {
  const { rows } = await pool.query(
    `SELECT lr.id, lr.title, lr.summary, lr.report_text, lr.file_url, lr.report_date,
            lr.lab_request_id, u.full_name AS doctor_name, req.title AS request_title
     FROM lab_reports lr
     LEFT JOIN users u ON u.id = lr.doctor_id
     LEFT JOIN lab_requests req ON req.id = lr.lab_request_id
     WHERE lr.patient_id = $1
     ORDER BY lr.report_date DESC, lr.created_at DESC`,
    [patientId]
  );
  const reports = rows.map((r) => ({
    id: Number(r.id),
    title: r.title,
    summary: r.summary ?? null,
    reportText: r.report_text ?? null,
    fileUrl: r.file_url ?? null,
    reportDate: r.report_date,
    labRequestId: r.lab_request_id ? Number(r.lab_request_id) : null,
    doctorName: r.doctor_name ?? null,
    requestTitle: r.request_title ?? null,
  }));

  const requestsRes = await pool.query(
    `SELECT lr.id, lr.title, lr.tests, lr.instructions, lr.priority, lr.status,
            lr.requested_at, u.full_name AS doctor_name
     FROM lab_requests lr
     LEFT JOIN users u ON u.id = lr.doctor_id
     WHERE lr.patient_id = $1
     ORDER BY lr.requested_at DESC`,
    [patientId]
  );
  const requests = requestsRes.rows.map((r) => ({
    id: Number(r.id),
    title: r.title,
    tests: r.tests,
    instructions: r.instructions ?? null,
    priority: r.priority,
    status: r.status,
    requestedAt: r.requested_at,
    doctorName: r.doctor_name ?? null,
  }));

  return { reports, requests };
}

async function getPharmacy(patientId) {
  const { rows } = await pool.query(
    `SELECT p.id, p.diagnosis, p.notes, p.prescription_date, p.status, p.dispensed_at,
            u.full_name AS doctor_name, h.name AS hospital_name,
            ph.full_name AS dispensed_by_name,
            (SELECT COUNT(*)::int FROM prescription_items pi WHERE pi.prescription_id = p.id) AS item_count
     FROM prescriptions p
     LEFT JOIN users u ON u.id = p.doctor_id
     LEFT JOIN doctors d ON d.user_id = p.doctor_id
     LEFT JOIN hospitals h ON h.id = d.hospital_id
     LEFT JOIN users ph ON ph.id = p.dispensed_by
     WHERE p.patient_id = $1
     ORDER BY p.prescription_date DESC, p.created_at DESC`,
    [patientId]
  );
  return rows.map((r) => ({
    id: Number(r.id),
    diagnosis: r.diagnosis ?? null,
    notes: r.notes ?? null,
    prescriptionDate: r.prescription_date,
    status: r.status,
    dispensedAt: r.dispensed_at ?? null,
    doctorName: r.doctor_name ?? null,
    hospitalName: r.hospital_name ?? null,
    dispensedByName: r.dispensed_by_name ?? null,
    itemCount: Number(r.item_count || 0),
  }));
}

async function getFollowUps(patientId) {
  const { rows } = await pool.query(
    `SELECT fu.id, fu.follow_up_date, fu.notes, fu.status,
            u.full_name AS doctor_name, d.specialization,
            c.title AS consultation_title, c.diagnosis
     FROM follow_ups fu
     JOIN users u ON u.id = fu.doctor_id
     LEFT JOIN doctors d ON d.user_id = fu.doctor_id
     LEFT JOIN consultations c ON c.id = fu.consultation_id
     WHERE fu.patient_id = $1
     ORDER BY fu.follow_up_date DESC`,
    [patientId]
  );
  return rows.map((r) => ({
    id: Number(r.id),
    followUpDate: r.follow_up_date,
    notes: r.notes ?? null,
    status: r.status,
    doctorName: r.doctor_name,
    specialization: r.specialization ?? null,
    consultationTitle: r.consultation_title ?? null,
    diagnosis: r.diagnosis ?? null,
  }));
}

async function searchPatientData(patientId, query) {
  const like = `%${query}%`;
  const [consultations, prescriptions, labReports, records, documents, doctors] = await Promise.all([
    pool.query(
      `SELECT c.id, c.title, c.diagnosis, c.consultation_date AS date, u.full_name AS doctor_name
       FROM consultations c JOIN users u ON u.id = c.doctor_id
       WHERE c.patient_id = $1 AND (c.title ILIKE $2 OR c.diagnosis ILIKE $2 OR c.symptoms ILIKE $2)`,
      [patientId, like]
    ),
    pool.query(
      `SELECT p.id, COALESCE(NULLIF(p.diagnosis, ''), 'Prescription') AS title, p.notes AS subtitle,
              p.prescription_date AS date, u.full_name AS doctor_name
       FROM prescriptions p LEFT JOIN users u ON u.id = p.doctor_id
       WHERE p.patient_id = $1 AND (p.diagnosis ILIKE $2 OR p.notes ILIKE $2)`,
      [patientId, like]
    ),
    pool.query(
      `SELECT lr.id, lr.title, lr.summary AS subtitle, lr.report_date AS date, u.full_name AS doctor_name
       FROM lab_reports lr LEFT JOIN users u ON u.id = lr.doctor_id
       WHERE lr.patient_id = $1 AND (lr.title ILIKE $2 OR lr.summary ILIKE $2 OR lr.report_text ILIKE $2)`,
      [patientId, like]
    ),
    pool.query(
      `SELECT id, title, diagnosis AS subtitle, record_date AS date, doctor_name
       FROM medical_records
       WHERE patient_id = $1 AND (title ILIKE $2 OR diagnosis ILIKE $2 OR description ILIKE $2)`,
      [patientId, like]
    ),
    pool.query(
      `SELECT id, title, notes AS subtitle, created_at::date AS date, NULL AS doctor_name
       FROM medical_documents WHERE patient_id = $1 AND (title ILIKE $2 OR notes ILIKE $2)`,
      [patientId, like]
    ),
    pool.query(
      `SELECT d.user_id AS id, u.full_name AS title, d.specialization AS subtitle,
              NULL AS date, NULL AS doctor_name
       FROM doctors d JOIN users u ON u.id = d.user_id
       WHERE d.user_id IN (
         SELECT doctor_id FROM consultations WHERE patient_id = $1
         UNION SELECT doctor_id FROM prescriptions WHERE patient_id = $1 AND doctor_id IS NOT NULL
       ) AND (u.full_name ILIKE $2 OR d.specialization ILIKE $2)`,
      [patientId, like]
    ),
  ]);

  const results = [
    ...consultations.rows.map((r) => ({ type: "consultation", ...r })),
    ...prescriptions.rows.map((r) => ({ type: "prescription", ...r })),
    ...labReports.rows.map((r) => ({ type: "lab_report", ...r })),
    ...records.rows.map((r) => ({ type: "record", ...r })),
    ...documents.rows.map((r) => ({ type: "document", ...r })),
    ...doctors.rows.map((r) => ({ type: "doctor", ...r })),
  ];
  results.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  return results.slice(0, 40).map((r) => ({
    type: r.type,
    id: Number(r.id),
    title: r.title,
    subtitle: r.subtitle ?? null,
    doctorName: r.doctor_name ?? null,
    date: r.date ?? null,
  }));
}

async function getDashboard(patientId, userId) {
  const [context, stats, recentActivity, recentDoctors, upcomingAppointments, upcomingFollowUp, accessRequests, notificationsList, unreadCount] =
    await Promise.all([
      getPatientContext(patientId),
      getDashboardStats(patientId),
      getRecentActivity(patientId, 8),
      getRecentDoctors(patientId, 6),
      getUpcomingAppointments(patientId, 5),
      getUpcomingFollowUp(patientId),
      listAccessRequests(patientId, "pending"),
      notifications.listNotificationsByUser(userId, false),
      notifications.countUnread(userId),
    ]);

  return {
    patient: context
      ? {
          id: context.id,
          name: context.name,
          medicardId: context.medicardId,
          bloodGroup: context.bloodGroup,
          gender: context.gender,
          dateOfBirth: context.dateOfBirth,
        }
      : null,
    medicard: context
      ? {
          medicardId: context.medicardId,
          qrCodeData: context.qrCodeData,
          bloodGroup: context.bloodGroup,
          dateOfBirth: context.dateOfBirth,
          gender: context.gender,
          cardIssued: context.cardIssued,
          status: "active",
        }
      : null,
    stats,
    recentActivity,
    recentDoctors,
    upcomingAppointments,
    upcomingFollowUp,
    accessRequests,
    notifications: notificationsList.slice(0, 6),
    unreadNotifications: unreadCount,
  };
}

module.exports = {
  getPatientContext,
  getDashboardStats,
  getDashboard,
  getRecentActivity,
  getRecentDoctors,
  getUpcomingAppointments,
  getUpcomingFollowUp,
  listAccessRequests,
  listPatientDoctors,
  getPatientDoctorDetail,
  getTimeline,
  getPatientDocuments,
  getScans,
  getLabReports,
  getPharmacy,
  getFollowUps,
  searchPatientData,
};
