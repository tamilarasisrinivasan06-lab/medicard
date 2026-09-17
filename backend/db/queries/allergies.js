const pool = require("../pool");

function toPublicAllergy(row) {
  return {
    id: Number(row.id),
    patientId: Number(row.patient_id),
    allergen: row.allergen,
    reaction: row.reaction ?? null,
    severity: row.severity ?? null,
    notes: row.notes ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listAllergies(patientId) {
  const { rows } = await pool.query("SELECT * FROM allergies WHERE patient_id = $1 ORDER BY created_at ASC", [patientId]);
  return rows.map(toPublicAllergy);
}

async function createAllergy(patientId, fields) {
  const { rows } = await pool.query(
    `INSERT INTO allergies (patient_id, allergen, reaction, severity, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [patientId, fields.allergen, fields.reaction ?? null, fields.severity ?? null, fields.notes ?? null]
  );
  return toPublicAllergy(rows[0]);
}

async function updateAllergy(id, fields) {
  const map = { allergen: "allergen", reaction: "reaction", severity: "severity", notes: "notes" };
  const cols = Object.entries(map)
    .filter(([key]) => fields[key] !== undefined)
    .map(([, col]) => col);
  if (cols.length === 0) return getAllergyById(id);
  const sets = cols.map((col, i) => `${col} = $${i + 1}`);
  const values = cols.map((col) => {
    const key = Object.keys(map).find((k) => map[k] === col);
    return fields[key] ?? null;
  });
  values.push(id);
  const { rows } = await pool.query(
    `UPDATE allergies SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING *`,
    values
  );
  return rows[0] ? toPublicAllergy(rows[0]) : null;
}

async function getAllergyById(id) {
  const { rows } = await pool.query("SELECT * FROM allergies WHERE id = $1", [id]);
  return rows[0] ? toPublicAllergy(rows[0]) : null;
}

async function deleteAllergy(id) {
  const { rowCount } = await pool.query("DELETE FROM allergies WHERE id = $1", [id]);
  return rowCount > 0;
}

module.exports = {
  listAllergies,
  createAllergy,
  updateAllergy,
  getAllergyById,
  deleteAllergy,
};