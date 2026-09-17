const pool = require("../pool");
const { normalizeRow, normalizeRows, RECORD_INT_KEYS } = require("./utils");

const RECORD_TYPES = ["prescription", "lab_report", "scan", "diagnosis", "discharge_summary", "vaccination", "other"];

function toPublicRecord(row) {
  if (!row) return null;
  const r = normalizeRow(row, RECORD_INT_KEYS);
  return {
    id: r.id,
    patientId: r.patient_id,
    userId: r.user_id ?? null,
    recordType: r.record_type,
    title: r.title,
    description: r.description ?? null,
    diagnosis: r.diagnosis ?? null,
    doctorName: r.doctor_name ?? null,
    hospitalName: r.hospital_name ?? null,
    recordDate: r.record_date,
    fileUrl: r.file_url ?? null,
    hasFile: !!r.file_url,
    doctor: r.doctor_name ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

async function createRecord({
  patientId,
  userId,
  recordType,
  title,
  description,
  diagnosis,
  doctorName,
  hospitalName,
  recordDate,
  fileUrl,
}) {
  const { rows } = await pool.query(
    `INSERT INTO medical_records
       (patient_id, user_id, record_type, title, description, diagnosis, doctor_name, hospital_name, record_date, file_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      patientId,
      userId || null,
      recordType,
      title,
      description || null,
      diagnosis || null,
      doctorName || null,
      hospitalName || null,
      recordDate,
      fileUrl || null,
    ]
  );
  return toPublicRecord(rows[0]);
}

async function listRecordsByPatient(patientId) {
  const { rows } = await pool.query(
    "SELECT * FROM medical_records WHERE patient_id = $1 ORDER BY record_date DESC, created_at DESC",
    [patientId]
  );
  return rows.map(toPublicRecord);
}

async function getRecordById(recordId) {
  const { rows } = await pool.query("SELECT * FROM medical_records WHERE id = $1", [recordId]);
  return toPublicRecord(rows[0]);
}

function buildRecordUpdate(record, fields) {
  const map = {
    recordType: "record_type",
    title: "title",
    description: "description",
    diagnosis: "diagnosis",
    doctorName: "doctor_name",
    hospitalName: "hospital_name",
    recordDate: "record_date",
  };
  const updates = {};
  for (const [key, col] of Object.entries(map)) {
    if (fields[key] !== undefined) updates[col] = fields[key];
  }
  return updates;
}

async function updateRecord(recordId, updates) {
  const cols = Object.keys(updates);
  if (cols.length === 0) return getRecordById(recordId);
  const sets = cols.map((col, i) => `${col} = $${i + 1}`);
  const values = [...Object.values(updates), recordId];
  const { rows } = await pool.query(
    `UPDATE medical_records SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING *`,
    values
  );
  return toPublicRecord(rows[0]);
}

async function deleteRecord(recordId) {
  const { rowCount } = await pool.query("DELETE FROM medical_records WHERE id = $1", [recordId]);
  return rowCount > 0;
}

async function getRecordFileUrl(recordId) {
  const { rows } = await pool.query("SELECT file_url FROM medical_records WHERE id = $1", [recordId]);
  return rows[0] ? rows[0].file_url : null;
}

async function setRecordFileUrl(recordId, fileUrl) {
  await pool.query("UPDATE medical_records SET file_url = $1 WHERE id = $2", [fileUrl, recordId]);
}

async function getDoctorStats(userId) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  const totalRes = await pool.query("SELECT COUNT(*)::int AS count FROM medical_records WHERE user_id = $1", [userId]);
  const todayRes = await pool.query(
    "SELECT COUNT(*)::int AS count FROM medical_records WHERE user_id = $1 AND record_date >= $2 AND record_date < $3",
    [userId, startOfToday, startOfTomorrow]
  );
  const recentRes = await pool.query(
    `SELECT mr.*, m.medicard_id
     FROM medical_records mr
     LEFT JOIN medicards m ON m.patient_id = mr.patient_id
     WHERE mr.user_id = $1
     ORDER BY mr.created_at DESC
     LIMIT 5`,
    [userId]
  );

  return {
    totalConsultations: totalRes.rows[0].count,
    todayConsultations: todayRes.rows[0].count,
    recentConsultations: recentRes.rows.map((r) => ({
      ...toPublicRecord(r),
      medicardId: r.medicard_id ?? null,
    })),
  };
}

module.exports = {
  RECORD_TYPES,
  toPublicRecord,
  createRecord,
  listRecordsByPatient,
  getRecordById,
  buildRecordUpdate,
  updateRecord,
  deleteRecord,
  getRecordFileUrl,
  setRecordFileUrl,
  getDoctorStats,
};