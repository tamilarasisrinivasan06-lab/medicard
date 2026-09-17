const pool = require("../pool");

function toPublicHospital(row) {
  return {
    id: Number(row.id),
    name: row.name,
    address: row.address ?? null,
    city: row.city ?? null,
    state: row.state ?? null,
    pincode: row.pincode ?? null,
    phone: row.phone ?? null,
    email: row.email ?? null,
    website: row.website ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listHospitals() {
  const { rows } = await pool.query("SELECT * FROM hospitals ORDER BY name");
  return rows.map(toPublicHospital);
}

async function getHospitalById(id) {
  const { rows } = await pool.query("SELECT * FROM hospitals WHERE id = $1", [id]);
  return rows[0] ? toPublicHospital(rows[0]) : null;
}

async function createHospital(fields) {
  const { rows } = await pool.query(
    `INSERT INTO hospitals (name, address, city, state, pincode, phone, email, website)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      fields.name,
      fields.address ?? null,
      fields.city ?? null,
      fields.state ?? null,
      fields.pincode ?? null,
      fields.phone ?? null,
      fields.email ?? null,
      fields.website ?? null,
    ]
  );
  return toPublicHospital(rows[0]);
}

async function updateHospital(id, fields) {
  const map = {
    name: "name",
    address: "address",
    city: "city",
    state: "state",
    pincode: "pincode",
    phone: "phone",
    email: "email",
    website: "website",
  };
  const cols = Object.entries(map)
    .filter(([key]) => fields[key] !== undefined)
    .map(([, col]) => col);
  if (cols.length === 0) return getHospitalById(id);
  const sets = cols.map((col, i) => `${col} = $${i + 1}`);
  const values = cols.map((col) => {
    const key = Object.keys(map).find((k) => map[k] === col);
    return fields[key] ?? null;
  });
  values.push(id);
  const { rows } = await pool.query(
    `UPDATE hospitals SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING *`,
    values
  );
  return rows[0] ? toPublicHospital(rows[0]) : null;
}

async function deleteHospital(id) {
  const { rowCount } = await pool.query("DELETE FROM hospitals WHERE id = $1", [id]);
  return rowCount > 0;
}

module.exports = {
  toPublicHospital,
  listHospitals,
  getHospitalById,
  createHospital,
  updateHospital,
  deleteHospital,
};