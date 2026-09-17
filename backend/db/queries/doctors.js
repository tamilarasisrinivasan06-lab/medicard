const pool = require("../pool");

function toPublicDoctor(row) {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    name: row.full_name ?? null,
    email: row.email ?? null,
    specialization: row.specialization ?? null,
    qualification: row.qualification ?? null,
    registrationNumber: row.registration_number ?? null,
    experience: row.experience ?? null,
    hospitalId: row.hospital_id ? Number(row.hospital_id) : null,
    hospitalName: row.hospital_name ?? null,
    consultationFee: row.consultation_fee ? Number(row.consultation_fee) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getDoctorByUserId(userId) {
  const { rows } = await pool.query(
    `SELECT d.*, u.full_name, u.email, h.name AS hospital_name
     FROM doctors d
     JOIN users u ON u.id = d.user_id
     LEFT JOIN hospitals h ON h.id = d.hospital_id
     WHERE d.user_id = $1`,
    [userId]
  );
  return rows[0] ? toPublicDoctor(rows[0]) : null;
}

async function getDoctorById(id, db = pool) {
  const { rows } = await db.query(
    `SELECT d.*, u.full_name, u.email, h.name AS hospital_name
     FROM doctors d
     JOIN users u ON u.id = d.user_id
     LEFT JOIN hospitals h ON h.id = d.hospital_id
     WHERE d.id = $1`,
    [id]
  );
  return rows[0] ? toPublicDoctor(rows[0]) : null;
}

async function getDoctorIdByUserId(userId) {
  const { rows } = await pool.query("SELECT id FROM doctors WHERE user_id = $1", [userId]);
  return rows[0] ? Number(rows[0].id) : null;
}

async function createDoctor(userId, fields = {}, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO doctors (user_id, specialization, qualification, registration_number, experience, hospital_id, consultation_fee)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      userId,
      fields.specialization ?? null,
      fields.qualification ?? null,
      fields.registrationNumber ?? null,
      fields.experience ?? null,
      fields.hospitalId ?? null,
      fields.consultationFee ?? null,
    ]
  );
  return getDoctorById(rows[0].id, db);
}

async function updateDoctor(userId, fields) {
  const map = {
    specialization: "specialization",
    qualification: "qualification",
    registrationNumber: "registration_number",
    experience: "experience",
    hospitalId: "hospital_id",
    consultationFee: "consultation_fee",
  };
  const cols = Object.entries(map)
    .filter(([key]) => fields[key] !== undefined)
    .map(([, col]) => col);
  if (cols.length === 0) return getDoctorByUserId(userId);
  const sets = cols.map((col, i) => `${col} = $${i + 1}`);
  const values = cols.map((col) => {
    const key = Object.keys(map).find((k) => map[k] === col);
    return fields[key] ?? null;
  });
  values.push(userId);
  await pool.query(`UPDATE doctors SET ${sets.join(", ")} WHERE user_id = $${values.length}`, values);
  return getDoctorByUserId(userId);
}

async function listDoctors(params = {}) {
  const conditions = [];
  const values = [];
  if (params.specialization) {
    values.push(params.specialization);
    conditions.push(`d.specialization ILIKE $${values.length}`);
  }
  if (params.hospitalId) {
    values.push(params.hospitalId);
    conditions.push(`d.hospital_id = $${values.length}`);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const { rows } = await pool.query(
    `SELECT d.*, u.full_name, u.email, h.name AS hospital_name
     FROM doctors d
     JOIN users u ON u.id = d.user_id
     LEFT JOIN hospitals h ON h.id = d.hospital_id
     ${where}
     ORDER BY d.created_at`,
    values
  );
  return rows.map(toPublicDoctor);
}

module.exports = {
  toPublicDoctor,
  getDoctorByUserId,
  getDoctorById,
  getDoctorIdByUserId,
  createDoctor,
  updateDoctor,
  listDoctors,
};