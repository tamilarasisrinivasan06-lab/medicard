const pool = require("../pool");

function toPublicContact(row) {
  return {
    id: Number(row.id),
    patientId: Number(row.patient_id),
    name: row.name,
    relationship: row.relationship ?? null,
    phone: row.phone ?? null,
    alternatePhone: row.alternate_phone ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listEmergencyContacts(patientId) {
  const { rows } = await pool.query(
    "SELECT * FROM emergency_contacts WHERE patient_id = $1 ORDER BY created_at ASC",
    [patientId]
  );
  return rows.map(toPublicContact);
}

async function createEmergencyContact(patientId, fields) {
  const { rows } = await pool.query(
    `INSERT INTO emergency_contacts (patient_id, name, relationship, phone, alternate_phone)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [patientId, fields.name, fields.relationship ?? null, fields.phone ?? null, fields.alternatePhone ?? null]
  );
  return toPublicContact(rows[0]);
}

async function updateEmergencyContact(id, fields) {
  const map = { name: "name", relationship: "relationship", phone: "phone", alternatePhone: "alternate_phone" };
  const cols = Object.entries(map)
    .filter(([key]) => fields[key] !== undefined)
    .map(([, col]) => col);
  if (cols.length === 0) return getEmergencyContactById(id);
  const sets = cols.map((col, i) => `${col} = $${i + 1}`);
  const values = cols.map((col) => {
    const key = Object.keys(map).find((k) => map[k] === col);
    return fields[key] ?? null;
  });
  values.push(id);
  const { rows } = await pool.query(
    `UPDATE emergency_contacts SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING *`,
    values
  );
  return rows[0] ? toPublicContact(rows[0]) : null;
}

async function getEmergencyContactById(id) {
  const { rows } = await pool.query("SELECT * FROM emergency_contacts WHERE id = $1", [id]);
  return rows[0] ? toPublicContact(rows[0]) : null;
}

async function deleteEmergencyContact(id) {
  const { rowCount } = await pool.query("DELETE FROM emergency_contacts WHERE id = $1", [id]);
  return rowCount > 0;
}

module.exports = {
  listEmergencyContacts,
  createEmergencyContact,
  updateEmergencyContact,
  getEmergencyContactById,
  deleteEmergencyContact,
};