const pool = require("../pool");

const APPOINTMENT_STATUSES = ["scheduled", "confirmed", "completed", "cancelled", "no_show"];

function toPublicAppointment(row) {
  return {
    id: Number(row.id),
    patientId: Number(row.patient_id),
    doctorId: row.doctor_id ? Number(row.doctor_id) : null,
    hospitalId: row.hospital_id ? Number(row.hospital_id) : null,
    appointmentDate: row.appointment_date,
    appointmentTime: row.appointment_time ? row.appointment_time.slice(0, 5) : null,
    reason: row.reason ?? null,
    status: row.status,
    notes: row.notes ?? null,
    doctorName: row.doctor_full_name ?? row.doctor_name ?? null,
    hospitalName: row.hospital_name ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function createAppointment({ patientId, doctorId, hospitalId, appointmentDate, appointmentTime, reason, notes }) {
  const { rows } = await pool.query(
    `INSERT INTO appointments (patient_id, doctor_id, hospital_id, appointment_date, appointment_time, reason, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [patientId, doctorId || null, hospitalId || null, appointmentDate, appointmentTime || null, reason || null, notes || null]
  );
  return getAppointmentById(rows[0].id);
}

async function getAppointmentById(id) {
  const { rows } = await pool.query(
    `SELECT a.*, du.full_name AS doctor_full_name, h.name AS hospital_name
     FROM appointments a
     LEFT JOIN doctors d ON d.id = a.doctor_id
     LEFT JOIN users du ON du.id = d.user_id
     LEFT JOIN hospitals h ON h.id = a.hospital_id
     WHERE a.id = $1`,
    [id]
  );
  return rows[0] ? toPublicAppointment(rows[0]) : null;
}

async function listAppointmentsByPatient(patientId) {
  const { rows } = await pool.query(
    `SELECT a.*, du.full_name AS doctor_full_name, h.name AS hospital_name
     FROM appointments a
     LEFT JOIN doctors d ON d.id = a.doctor_id
     LEFT JOIN users du ON du.id = d.user_id
     LEFT JOIN hospitals h ON h.id = a.hospital_id
     WHERE a.patient_id = $1
     ORDER BY a.appointment_date DESC, a.appointment_time DESC NULLS LAST`,
    [patientId]
  );
  return rows.map(toPublicAppointment);
}

const DOCTOR_APPT_SELECT = `SELECT a.*, h.name AS hospital_name, m.medicard_id
  FROM appointments a
  LEFT JOIN hospitals h ON h.id = a.hospital_id
  LEFT JOIN medicards m ON m.patient_id = a.patient_id
  LEFT JOIN doctors d ON d.id = a.doctor_id`;

async function listAppointmentsByDoctorUserId(userId) {
  const { rows } = await pool.query(
    `${DOCTOR_APPT_SELECT} WHERE d.user_id = $1 ORDER BY a.appointment_date DESC, a.created_at DESC`,
    [userId]
  );
  return rows.map((r) => ({ ...toPublicAppointment(r), medicardId: r.medicard_id ?? null }));
}

async function listAppointments(limit = 100) {
  const { rows } = await pool.query(
    `${DOCTOR_APPT_SELECT} ORDER BY a.appointment_date DESC, a.created_at DESC LIMIT $1`,
    [limit]
  );
  return rows.map((r) => ({ ...toPublicAppointment(r), medicardId: r.medicard_id ?? null }));
}

async function updateAppointmentStatus(id, status) {
  const { rows } = await pool.query(
    "UPDATE appointments SET status = $1 WHERE id = $2 RETURNING *",
    [status, id]
  );
  return rows[0] ? getAppointmentById(rows[0].id) : null;
}

async function updateAppointment(id, fields) {
  const map = { appointmentDate: "appointment_date", appointmentTime: "appointment_time", reason: "reason", notes: "notes" };
  const cols = Object.entries(map)
    .filter(([key]) => fields[key] !== undefined)
    .map(([, col]) => col);
  if (cols.length === 0) return getAppointmentById(id);
  const sets = cols.map((col, i) => `${col} = $${i + 1}`);
  const values = cols.map((col) => {
    const key = Object.keys(map).find((k) => map[k] === col);
    return fields[key] ?? null;
  });
  values.push(id);
  await pool.query(`UPDATE appointments SET ${sets.join(", ")} WHERE id = $${values.length}`, values);
  return getAppointmentById(id);
}

module.exports = {
  APPOINTMENT_STATUSES,
  createAppointment,
  getAppointmentById,
  listAppointmentsByPatient,
  listAppointmentsByDoctorUserId,
  listAppointments,
  updateAppointmentStatus,
  updateAppointment,
};