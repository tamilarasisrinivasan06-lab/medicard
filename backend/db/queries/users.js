const pool = require("../pool");
const { normalizeRow, normalizeRows, USER_INT_KEYS } = require("./utils");

function toPublicUser(row) {
  if (!row) return null;
  const u = normalizeRow(row, USER_INT_KEYS);
  return {
    id: u.id,
    name: u.full_name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    profilePhoto: u.profile_photo,
    dateOfBirth: u.date_of_birth,
    gender: u.gender,
    hospitalId: u.hospital_id ?? null,
    createdAt: u.created_at,
  };
}

async function createUser({ fullName, email, phone, passwordHash, role, dateOfBirth, gender }) {
  const { rows } = await pool.query(
    `INSERT INTO users (full_name, email, phone, password_hash, role, date_of_birth, gender)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [fullName, email, phone || null, passwordHash, role, dateOfBirth || null, gender || null]
  );
  return toPublicUser(rows[0]);
}

async function findUserByEmail(email) {
  const { rows } = await pool.query("SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1", [email]);
  return rows[0];
}

async function findUserById(id) {
  const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
  return rows[0];
}

function toPublicUserRow(row) {
  return toPublicUser(row);
}

async function updateUser(id, fields) {
  const allowed = {
    full_name: "fullName",
    phone: "phone",
    profile_photo: "profilePhoto",
    date_of_birth: "dateOfBirth",
    gender: "gender",
  };

  const entries = Object.entries(allowed)
    .filter(([, key]) => fields[key] !== undefined)
    .map(([col]) => col);

  if (entries.length === 0) return findUserById(id);

  const sets = entries.map((col, i) => `${col} = $${i + 1}`);
  const values = entries.map((col) => fields[allowed[col]] ?? null);
  values.push(id);

  const { rows } = await pool.query(
    `UPDATE users SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING *`,
    values
  );
  return rows[0];
}

async function deleteUserById(id) {
  const { rowCount } = await pool.query("DELETE FROM users WHERE id = $1", [id]);
  return rowCount > 0;
}

async function listUsersByRole(role) {
  const { rows } = await pool.query("SELECT * FROM users WHERE role = $1 ORDER BY full_name", [role]);
  return normalizeRows(rows, USER_INT_KEYS);
}

module.exports = {
  toPublicUser,
  createUser,
  findUserByEmail,
  findUserById,
  toPublicUserRow,
  updateUser,
  deleteUserById,
  listUsersByRole,
};