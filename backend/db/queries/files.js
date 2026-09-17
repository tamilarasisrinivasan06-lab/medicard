const pool = require("../pool");

function toPublicFile(row) {
  return {
    id: Number(row.id),
    uploaderId: Number(row.uploader_id),
    patientId: row.patient_id ? Number(row.patient_id) : null,
    recordId: row.record_id ? Number(row.record_id) : null,
    originalName: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes),
    url: `/api/files/${row.id}/download`,
    createdAt: row.created_at,
  };
}

async function createFile({ uploaderId, patientId, originalName, mimeType, sizeBytes, storageKey, recordId }) {
  const { rows } = await pool.query(
    `INSERT INTO file_uploads (uploader_id, patient_id, original_name, mime_type, size_bytes, storage_key, record_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [uploaderId, patientId || null, originalName, mimeType, sizeBytes, storageKey, recordId || null]
  );
  return toPublicFile(rows[0]);
}

async function getFileById(id) {
  const { rows } = await pool.query("SELECT * FROM file_uploads WHERE id = $1", [id]);
  return rows[0] ? { ...toPublicFile(rows[0]), storageKey: rows[0].storage_key } : null;
}

async function listFilesByPatient(patientId) {
  const { rows } = await pool.query(
    "SELECT * FROM file_uploads WHERE patient_id = $1 ORDER BY created_at DESC",
    [patientId]
  );
  return rows.map(toPublicFile);
}

async function deleteFile(id) {
  const { rowCount } = await pool.query("DELETE FROM file_uploads WHERE id = $1", [id]);
  return rowCount > 0;
}

async function getFileByRecordId(recordId) {
  const { rows } = await pool.query("SELECT * FROM file_uploads WHERE record_id = $1 LIMIT 1", [recordId]);
  return rows[0] ? { ...toPublicFile(rows[0]), storageKey: rows[0].storage_key } : null;
}

async function linkFileToRecord(fileId, recordId) {
  const { rowCount } = await pool.query(
    "UPDATE file_uploads SET record_id = $1 WHERE id = $2",
    [recordId, fileId]
  );
  return rowCount > 0;
}

module.exports = {
  createFile,
  getFileById,
  listFilesByPatient,
  deleteFile,
  getFileByRecordId,
  linkFileToRecord,
};