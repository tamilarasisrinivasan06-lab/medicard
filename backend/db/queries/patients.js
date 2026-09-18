const pool = require("../pool");
const { normalizeRow, normalizeRows, PATIENT_INT_KEYS } = require("./utils");
const { generateMediCardId, generateQRCodeData } = require("../../services/medicardService");

function toPublicPatient(row) {
  if (!row) return null;
  const p = normalizeRow(row, PATIENT_INT_KEYS);
  return {
    id: p.id,
    userId: p.user_id,
    medicardId: p.medicard_id ?? null,
    name: p.name ?? null,
    bloodGroup: p.blood_group ?? null,
    dateOfBirth: p.date_of_birth ?? null,
    gender: p.gender ?? null,
    height: p.height ? Number(p.height) : null,
    weight: p.weight ? Number(p.weight) : null,
    emergencyContact: {
      name: p.emergency_contact_name ?? null,
      phone: p.emergency_contact_phone ?? null,
    },
    address: p.address ?? null,
    city: p.city ?? null,
    state: p.state ?? null,
    pincode: p.pincode ?? null,
  };
}

async function createPatientProfile(userId, options = {}) {
  const { client } = options;
  const db = client || pool;
  const ownsTxn = !client;

  const run = async () => {
    const { rows: profileRows } = await db.query(
      "INSERT INTO patient_profiles (user_id) VALUES ($1) RETURNING *",
      [userId]
    );
    const profile = profileRows[0];

    let medicardId;
    let qrCodeData;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      medicardId = generateMediCardId();
      qrCodeData = generateQRCodeData();
      try {
        await db.query(
          "INSERT INTO medicards (patient_id, medicard_id, qr_code_data) VALUES ($1, $2, $3)",
          [profile.id, medicardId, qrCodeData]
        );
        break;
      } catch (err) {
        if (err.code === "23505" && attempt < 9) continue;
        throw err;
      }
    }
    profile.medicard_id = medicardId;
    return toPublicPatient(profile);
  };

  if (ownsTxn) {
    await db.query("BEGIN");
    try {
      const out = await run();
      await db.query("COMMIT");
      return out;
    } catch (err) {
      await db.query("ROLLBACK");
      throw err;
    }
  }
  return run();
}

async function getPatientByUserId(userId) {
  const { rows } = await pool.query(
    `SELECT p.*, m.medicard_id, u.full_name AS name
     FROM patient_profiles p
     LEFT JOIN medicards m ON m.patient_id = p.id
     LEFT JOIN users u ON u.id = p.user_id
     WHERE p.user_id = $1`,
    [userId]
  );
  return toPublicPatient(rows[0]);
}

async function getPatientById(patientId) {
  const { rows } = await pool.query(
    `SELECT p.*, m.medicard_id, u.full_name AS name
     FROM patient_profiles p
     LEFT JOIN medicards m ON m.patient_id = p.id
     LEFT JOIN users u ON u.id = p.user_id
     WHERE p.id = $1`,
    [patientId]
  );
  return toPublicPatient(rows[0]);
}

async function getMediCardByQr(qrPayload) {
  const { rows } = await pool.query(
    `SELECT m.medicard_id, m.patient_id, u.id AS user_id, u.full_name AS name
     FROM medicards m
     JOIN patient_profiles p ON p.id = m.patient_id
     JOIN users u ON u.id = p.user_id
     WHERE m.qr_code_data = $1`,
    [qrPayload]
  );
  return rows[0] ? normalizeRow(rows[0], ["patient_id", "user_id"]) : null;
}

async function getMediCardByMediCardId(medicardId) {
  const { rows } = await pool.query(
    `SELECT m.medicard_id, m.patient_id, u.id AS user_id, u.full_name AS name
     FROM medicards m
     JOIN patient_profiles p ON p.id = m.patient_id
     JOIN users u ON u.id = p.user_id
     WHERE m.medicard_id = $1`,
    [medicardId]
  );
  return rows[0] ? normalizeRow(rows[0], ["patient_id", "user_id"]) : null;
}

async function getQrDataByUserId(userId) {
  const { rows } = await pool.query(
    `SELECT m.qr_code_data
     FROM medicards m
     JOIN patient_profiles p ON p.id = m.patient_id
     WHERE p.user_id = $1`,
    [userId]
  );
  return rows[0] ? rows[0].qr_code_data : null;
}

async function updatePatientProfile(userId, fields) {
  const map = {
    bloodGroup: "blood_group",
    dateOfBirth: "date_of_birth",
    gender: "gender",
    height: "height",
    weight: "weight",
    emergencyContactName: "emergency_contact_name",
    emergencyContactPhone: "emergency_contact_phone",
    address: "address",
    city: "city",
    state: "state",
    pincode: "pincode",
  };

  const entries = Object.entries(map).filter(([key]) => fields[key] !== undefined);
  if (entries.length === 0) return getPatientByUserId(userId);

  const sets = entries.map(([, col], i) => `${col} = $${i + 1}`);
  const values = entries.map(([key]) => fields[key] ?? null);
  values.push(userId);

  await pool.query(
    `UPDATE patient_profiles SET ${sets.join(", ")} WHERE user_id = $${values.length}`,
    values
  );
  return getPatientByUserId(userId);
}

async function listPatients() {
  const { rows } = await pool.query(
    `SELECT p.*, m.medicard_id, u.full_name AS name
     FROM patient_profiles p
     LEFT JOIN medicards m ON m.patient_id = p.id
     LEFT JOIN users u ON u.id = p.user_id
     ORDER BY p.created_at`
  );
  return normalizeRows(rows, PATIENT_INT_KEYS).map(toPublicPatient);
}

module.exports = {
  toPublicPatient,
  createPatientProfile,
  getPatientByUserId,
  getPatientById,
  getMediCardByQr,
  getMediCardByMediCardId,
  getQrDataByUserId,
  updatePatientProfile,
  listPatients,
};