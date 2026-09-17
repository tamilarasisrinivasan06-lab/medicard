const pool = require("../pool");

function toPublicNotification(row) {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    type: row.type,
    title: row.title,
    body: row.body ?? null,
    link: row.link ?? null,
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}

async function createNotification({ userId, type, title, body, link }) {
  const { rows } = await pool.query(
    `INSERT INTO notifications (user_id, type, title, body, link)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [userId, type, title, body || null, link || null]
  );
  return toPublicNotification(rows[0]);
}

async function listNotificationsByUser(userId, unreadOnly) {
  const params = [userId];
  let filter = "WHERE user_id = $1";
  if (unreadOnly) {
    filter += " AND is_read = false";
  }
  const { rows } = await pool.query(
    `SELECT * FROM notifications ${filter} ORDER BY created_at DESC LIMIT 100`,
    params
  );
  return rows.map(toPublicNotification);
}

async function countUnread(userId) {
  const { rows } = await pool.query(
    "SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = false",
    [userId]
  );
  return rows[0].count;
}

async function markNotificationRead(id, userId) {
  const { rows } = await pool.query(
    "UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *",
    [id, userId]
  );
  return rows[0] ? toPublicNotification(rows[0]) : null;
}

async function markAllNotificationsRead(userId) {
  const { rowCount } = await pool.query(
    "UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false",
    [userId]
  );
  return rowCount;
}

module.exports = {
  createNotification,
  listNotificationsByUser,
  countUnread,
  markNotificationRead,
  markAllNotificationsRead,
};