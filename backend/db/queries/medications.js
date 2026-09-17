const pool = require("../pool");

function toPublicMed(row) {
  return {
    id: Number(row.id),
    patientId: Number(row.patient_id),
    medicineName: row.medicine_name,
    dosage: row.dosage ?? null,
    frequency: row.frequency ?? null,
    duration: row.duration ?? null,
    startDate: row.start_date ?? null,
    endDate: row.end_date ?? null,
    instructions: row.instructions ?? null,
    prescribedBy: row.prescribed_by ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listMedications(patientId) {
  const { rows } = await pool.query(
    "SELECT * FROM medications WHERE patient_id = $1 ORDER BY start_date DESC NULLS LAST, created_at DESC",
    [patientId]
  );
  return rows.map(toPublicMed);
}

async function getMedicationById(id) {
  const { rows } = await pool.query("SELECT * FROM medications WHERE id = $1", [id]);
  return rows[0] ? toPublicMed(rows[0]) : null;
}

async function createMedication(patientId, fields) {
  const { rows } = await pool.query(
    `INSERT INTO medications
       (patient_id, medicine_name, dosage, frequency, duration, start_date, end_date, instructions, prescribed_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      patientId,
      fields.medicineName,
      fields.dosage ?? null,
      fields.frequency ?? null,
      fields.duration ?? null,
      fields.startDate ?? null,
      fields.endDate ?? null,
      fields.instructions ?? null,
      fields.prescribedBy ?? null,
    ]
  );
  return toPublicMed(rows[0]);
}

async function updateMedication(id, fields) {
  const map = {
    medicineName: "medicine_name",
    dosage: "dosage",
    frequency: "frequency",
    duration: "duration",
    startDate: "start_date",
    endDate: "end_date",
    instructions: "instructions",
    prescribedBy: "prescribed_by",
  };
  const cols = Object.entries(map)
    .filter(([key]) => fields[key] !== undefined)
    .map(([, col]) => col);
  if (cols.length === 0) return getMedicationById(id);
  const sets = cols.map((col, i) => `${col} = $${i + 1}`);
  const values = cols.map((col) => {
    const key = Object.keys(map).find((k) => map[k] === col);
    return fields[key] ?? null;
  });
  values.push(id);
  const { rows } = await pool.query(
    `UPDATE medications SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING *`,
    values
  );
  return rows[0] ? toPublicMed(rows[0]) : null;
}

async function deleteMedication(id) {
  const { rowCount } = await pool.query("DELETE FROM medications WHERE id = $1", [id]);
  return rowCount > 0;
}

module.exports = {
  toPublicMed,
  listMedications,
  getMedicationById,
  createMedication,
  updateMedication,
  deleteMedication,
};