function normalizeRow(row, intKeys = []) {
  if (!row) return null;
  const out = { ...row };
  for (const key of intKeys) {
    if (out[key] !== null && out[key] !== undefined) {
      out[key] = Number(out[key]);
    }
  }
  return out;
}

function normalizeRows(rows, intKeys = []) {
  return rows.map((row) => normalizeRow(row, intKeys));
}

const USER_INT_KEYS = ["id", "hospital_id"];
const PATIENT_INT_KEYS = ["id", "user_id"];
const RECORD_INT_KEYS = ["id", "patient_id", "user_id"];

module.exports = { normalizeRow, normalizeRows, USER_INT_KEYS, PATIENT_INT_KEYS, RECORD_INT_KEYS };