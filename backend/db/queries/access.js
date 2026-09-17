const pool = require("../pool");
const { hashOtp, otpExpiry, accessGrantExpiry } = require("../../services/medicardService");
const crypto = require("crypto");

async function createVerificationRequest({ requesterId, patientId, medicardId, role, otp }) {
  const { rows } = await pool.query(
    `INSERT INTO verification_requests (requester_id, patient_id, medicard_id, role, otp_hash, otp_expires_at)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [requesterId, patientId, medicardId, role, hashOtp(otp), otpExpiry()]
  );
  const row = rows[0];
  return {
    id: Number(row.id),
    requesterId: Number(row.requester_id),
    patientId: Number(row.patient_id),
    medicardId: row.medicard_id,
    role: row.role,
    otpExpiresAt: row.otp_expires_at,
    attempts: Number(row.attempts),
    status: row.status,
    createdAt: row.created_at,
  };
}

async function getVerificationById(id) {
  const { rows } = await pool.query("SELECT * FROM verification_requests WHERE id = $1", [id]);
  return rows[0] ? {
    id: Number(rows[0].id),
    requesterId: Number(rows[0].requester_id),
    patientId: Number(rows[0].patient_id),
    medicardId: rows[0].medicard_id,
    role: rows[0].role,
    otpHash: rows[0].otp_hash,
    otpExpiresAt: rows[0].otp_expires_at,
    attempts: Number(rows[0].attempts),
    status: rows[0].status,
    createdAt: rows[0].created_at,
  } : null;
}

async function markVerificationStatus(id, status, attempts) {
  await pool.query(
    "UPDATE verification_requests SET status = $1, attempts = $2 WHERE id = $3",
    [status, attempts, id]
  );
}

async function expireVerification(id) {
  await pool.query("UPDATE verification_requests SET status = 'expired' WHERE id = $1 AND status = 'pending'", [id]);
}

async function createAccessGrant({ requesterId, patientId, medicardId, role, purpose, token, expiresAt }) {
  const { rows } = await pool.query(
    `INSERT INTO access_grants (requester_id, patient_id, medicard_id, role, purpose, token, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [requesterId, patientId, medicardId, role, purpose, token || crypto.randomBytes(24).toString("hex"), expiresAt || accessGrantExpiry()]
  );
  return {
    id: Number(rows[0].id),
    requesterId: Number(rows[0].requester_id),
    patientId: Number(rows[0].patient_id),
    medicardId: rows[0].medicard_id,
    role: rows[0].role,
    purpose: rows[0].purpose,
    token: rows[0].token,
    expiresAt: rows[0].expires_at,
    status: rows[0].status,
  };
}

async function getGrantById(id) {
  const { rows } = await pool.query("SELECT * FROM access_grants WHERE id = $1", [id]);
  return rows[0] ? {
    id: Number(rows[0].id),
    requesterId: Number(rows[0].requester_id),
    patientId: Number(rows[0].patient_id),
    medicardId: rows[0].medicard_id,
    role: rows[0].role,
    purpose: rows[0].purpose,
    token: rows[0].token,
    expiresAt: rows[0].expires_at,
    status: rows[0].status,
  } : null;
}

async function revokeGrant(id) {
  await pool.query("UPDATE access_grants SET status = 'revoked' WHERE id = $1 AND status = 'active'", [id]);
}

module.exports = {
  createVerificationRequest,
  getVerificationById,
  markVerificationStatus,
  expireVerification,
  createAccessGrant,
  getGrantById,
  revokeGrant,
};