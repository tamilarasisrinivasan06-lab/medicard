const pool = require("../pool");

function toPublicLog(row) {
  return {
    id: Number(row.id),
    userId: row.user_id ? Number(row.user_id) : null,
    role: row.role ?? null,
    action: row.action,
    targetType: row.target_type ?? null,
    targetId: row.target_id ? Number(row.target_id) : null,
    details: row.details ?? null,
    ip: row.ip ?? null,
    createdAt: row.created_at,
  };
}

async function createLog({ userId, role, action, targetType, targetId, details, ip }) {
  const { rows } = await pool.query(
    `INSERT INTO audit_logs (user_id, role, action, target_type, target_id, details, ip)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [userId || null, role || null, action, targetType || null, targetId || null, details ? JSON.stringify(details) : null, ip || null]
  );
  return toPublicLog(rows[0]);
}

async function listLogsByUser(userId, limit = 200) {
  const { rows } = await pool.query(
    "SELECT * FROM audit_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2",
    [userId, limit]
  );
  return rows.map(toPublicLog);
}

async function listRecentLogs(limit = 50) {
  const { rows } = await pool.query(
    "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1",
    [limit]
  );
  return rows.map(toPublicLog);
}

module.exports = { createLog, listLogsByUser, listRecentLogs };