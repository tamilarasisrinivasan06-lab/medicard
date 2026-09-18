const pool = require("../pool");
const { normalizeRow, normalizeRows, USER_INT_KEYS } = require("./utils");

function toPublicUserRow(row) {
  const u = normalizeRow(row, USER_INT_KEYS);
  return {
    id: u.id,
    name: u.full_name,
    email: u.email,
    phone: u.phone ?? null,
    role: u.role,
    isActive: u.is_active !== false,
    hospitalId: u.hospital_id ? Number(u.hospital_id) : null,
    hospitalName: u.hospital_name ?? null,
    createdAt: u.created_at,
  };
}

async function getPlatformStats(hospitalId = null) {
  const { rows } = await pool.query(
    `SELECT
       (SELECT COUNT(*)::int FROM users WHERE ($1::bigint IS NULL OR hospital_id = $1)) AS users,
       (SELECT COUNT(*)::int FROM users WHERE role = 'patient') AS patients,
       (SELECT COUNT(*)::int FROM users WHERE role = 'doctor' AND ($1::bigint IS NULL OR hospital_id = $1)) AS doctors,
       (SELECT COUNT(*)::int FROM users WHERE role = 'pharmacist' AND ($1::bigint IS NULL OR hospital_id = $1)) AS pharmacies,
       (SELECT COUNT(*)::int FROM users WHERE role = 'diagnostic_staff' AND ($1::bigint IS NULL OR hospital_id = $1)) AS lab_technicians,
       (SELECT COUNT(*)::int FROM users WHERE role IN ('pharmacist','diagnostic_staff','hospital','admin','super_admin') AND ($1::bigint IS NULL OR hospital_id = $1)) AS staff,
       (SELECT COUNT(*)::int FROM users WHERE is_active AND ($1::bigint IS NULL OR hospital_id = $1)) AS active_users,
       (SELECT COUNT(*)::int FROM users WHERE NOT is_active AND ($1::bigint IS NULL OR hospital_id = $1)) AS disabled_users,
       (SELECT COUNT(*)::int FROM hospitals) AS hospitals,
       (SELECT COUNT(*)::int FROM appointments WHERE ($1::bigint IS NULL OR hospital_id = $1)) AS appointments,
       (SELECT COUNT(*)::int FROM prescriptions p LEFT JOIN doctors d ON d.user_id = p.doctor_id
          WHERE ($1::bigint IS NULL OR d.hospital_id = $1)) AS prescriptions,
       (SELECT COUNT(*)::int FROM prescriptions p LEFT JOIN doctors d ON d.user_id = p.doctor_id
          WHERE p.status = 'pending' AND ($1::bigint IS NULL OR d.hospital_id = $1)) AS pending_prescriptions,
       (SELECT COUNT(*)::int FROM lab_requests WHERE ($1::bigint IS NULL OR hospital_id = $1)) AS lab_requests,
       (SELECT COUNT(*)::int FROM lab_requests WHERE status = 'requested' AND ($1::bigint IS NULL OR hospital_id = $1)) AS pending_lab_requests,
       (SELECT COUNT(*)::int FROM medical_records) AS medical_records,
       (SELECT COUNT(*)::int FROM patient_profiles) AS patient_profiles`,
    [hospitalId]
  );
  const r = rows[0];
  return {
    users: r.users,
    patients: r.patients,
    doctors: r.doctors,
    pharmacies: r.pharmacies,
    labTechnicians: r.lab_technicians,
    staff: r.staff,
    activeUsers: r.active_users,
    disabledUsers: r.disabled_users,
    hospitals: r.hospitals,
    appointments: r.appointments,
    prescriptions: r.prescriptions,
    pendingPrescriptions: r.pending_prescriptions,
    labRequests: r.lab_requests,
    pendingLabRequests: r.pending_lab_requests,
    medicalRecords: r.medical_records,
    patientProfiles: r.patient_profiles,
  };
}

async function listUsers({ role = null, q = null, hospitalId = null } = {}) {
  const { rows } = await pool.query(
    `SELECT u.*, h.name AS hospital_name
     FROM users u
     LEFT JOIN hospitals h ON h.id = u.hospital_id
     WHERE ($1::text IS NULL OR u.role = $1)
       AND ($2::bigint IS NULL OR u.hospital_id = $2)
       AND ($3::text IS NULL OR u.full_name ILIKE '%' || $3 || '%' OR u.email ILIKE '%' || $3 || '%')
     ORDER BY u.created_at DESC
     LIMIT 200`,
    [role, hospitalId, q]
  );
  return normalizeRows(rows, USER_INT_KEYS).map(toPublicUserRow);
}

async function getRecentUsers(hospitalId = null, limit = 6) {
  const { rows } = await pool.query(
    `SELECT u.*, h.name AS hospital_name
     FROM users u
     LEFT JOIN hospitals h ON h.id = u.hospital_id
     WHERE ($1::bigint IS NULL OR u.hospital_id = $1)
     ORDER BY u.created_at DESC LIMIT $2`,
    [hospitalId, limit]
  );
  return normalizeRows(rows, USER_INT_KEYS).map(toPublicUserRow);
}

async function findUserById(id) {
  const { rows } = await pool.query(
    `SELECT u.*, h.name AS hospital_name
     FROM users u LEFT JOIN hospitals h ON h.id = u.hospital_id
     WHERE u.id = $1`,
    [id]
  );
  return rows[0] ? toPublicUserRow(rows[0]) : null;
}

async function setUserActive(id, isActive) {
  const { rows } = await pool.query(
    "UPDATE users SET is_active = $1 WHERE id = $2 RETURNING *",
    [isActive, id]
  );
  return rows[0] ? toPublicUserRow(rows[0]) : null;
}

async function listHospitals() {
  const { rows } = await pool.query(
    `SELECT h.*,
       (SELECT COUNT(*)::int FROM doctors d WHERE d.hospital_id = h.id) AS doctor_count,
       (SELECT COUNT(*)::int FROM users u WHERE u.hospital_id = h.id) AS user_count
     FROM hospitals h
     ORDER BY h.name`
  );
  return rows.map((h) => ({
    id: Number(h.id),
    name: h.name,
    address: h.address ?? null,
    city: h.city ?? null,
    state: h.state ?? null,
    pincode: h.pincode ?? null,
    phone: h.phone ?? null,
    email: h.email ?? null,
    website: h.website ?? null,
    doctorCount: h.doctor_count,
    userCount: h.user_count,
    createdAt: h.created_at,
  }));
}

async function createHospital(fields) {
  const { rows } = await pool.query(
    `INSERT INTO hospitals (name, address, city, state, pincode, phone, email, website)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      fields.name,
      fields.address || null,
      fields.city || null,
      fields.state || null,
      fields.pincode || null,
      fields.phone || null,
      fields.email || null,
      fields.website || null,
    ]
  );
  const h = rows[0];
  return {
    id: Number(h.id),
    name: h.name,
    address: h.address ?? null,
    city: h.city ?? null,
    state: h.state ?? null,
    pincode: h.pincode ?? null,
    phone: h.phone ?? null,
    email: h.email ?? null,
    website: h.website ?? null,
    doctorCount: 0,
    userCount: 0,
    createdAt: h.created_at,
  };
}

async function getRecentActivity(hospitalId = null, limit = 12) {
  const { rows } = await pool.query(
    `SELECT a.id, a.action, a.target_type, a.target_id, a.details, a.created_at,
            u.full_name AS user_name, a.role
     FROM audit_logs a
     LEFT JOIN users u ON u.id = a.user_id
     WHERE ($1::bigint IS NULL OR u.hospital_id = $1)
     ORDER BY a.created_at DESC LIMIT $2`,
    [hospitalId, limit]
  );
  return rows.map((a) => ({
    id: Number(a.id),
    action: a.action,
    targetType: a.target_type ?? null,
    targetId: a.target_id ? Number(a.target_id) : null,
    details: a.details ?? null,
    createdAt: a.created_at,
    userName: a.user_name ?? 'System',
    role: a.role ?? null,
  }));
}

module.exports = {
  getPlatformStats,
  listUsers,
  getRecentUsers,
  findUserById,
  setUserActive,
  listHospitals,
  createHospital,
  getRecentActivity,
};
