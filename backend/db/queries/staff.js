const pool = require("../pool");

async function getStaffHospitalId(userId) {
  const { rows } = await pool.query("SELECT hospital_id FROM users WHERE id = $1", [userId]);
  if (!rows[0] || rows[0].hospital_id === null || rows[0].hospital_id === undefined) return null;
  return Number(rows[0].hospital_id);
}

module.exports = { getStaffHospitalId };
