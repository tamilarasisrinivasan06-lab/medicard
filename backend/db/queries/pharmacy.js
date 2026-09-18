const pool = require("../pool");

const PRESCRIPTION_STATUSES = ["pending", "dispensed", "cancelled"];

function toPublicPrescription(row) {
  return {
    id: Number(row.id),
    patientId: Number(row.patient_id),
    doctorId: row.doctor_id ? Number(row.doctor_id) : null,
    diagnosis: row.diagnosis ?? null,
    notes: row.notes ?? null,
    prescriptionDate: row.prescription_date,
    status: row.status,
    dispensedAt: row.dispensed_at ?? null,
    dispensedBy: row.dispensed_by ? Number(row.dispensed_by) : null,
    patientName: row.patient_name ?? null,
    medicardId: row.medicard_id ?? null,
    doctorName: row.doctor_name ?? null,
    hospitalName: row.hospital_name ?? null,
    itemCount: row.item_count !== undefined ? Number(row.item_count) : undefined,
    items: row.items ?? undefined,
  };
}

function toPublicItem(row) {
  return {
    id: Number(row.id),
    medicineName: row.medicine_name,
    dosage: row.dosage ?? null,
    frequency: row.frequency ?? null,
    duration: row.duration ?? null,
    instructions: row.instructions ?? null,
  };
}

const LIST_SELECT = `
  SELECT p.*, pu.full_name AS patient_name, m.medicard_id,
         du.full_name AS doctor_name, h.name AS hospital_name,
         (SELECT COUNT(*)::int FROM prescription_items pi WHERE pi.prescription_id = p.id) AS item_count
  FROM prescriptions p
  JOIN patient_profiles pp ON pp.id = p.patient_id
  JOIN users pu ON pu.id = pp.user_id
  LEFT JOIN medicards m ON m.patient_id = pp.id
  LEFT JOIN users du ON du.id = p.doctor_id
  LEFT JOIN doctors d ON d.user_id = p.doctor_id
  LEFT JOIN hospitals h ON h.id = d.hospital_id
`;

async function listPrescriptions({ status = null, hospitalId = null } = {}) {
  const { rows } = await pool.query(
    `${LIST_SELECT}
     WHERE ($1::text IS NULL OR p.status = $1)
       AND ($2::bigint IS NULL OR d.hospital_id = $2)
     ORDER BY p.created_at DESC`,
    [status, hospitalId]
  );
  return rows.map(toPublicPrescription);
}

async function getPrescriptionById(id, hospitalId = null) {
  const { rows } = await pool.query(
    `${LIST_SELECT}
     WHERE p.id = $1 AND ($2::bigint IS NULL OR d.hospital_id = $2)
     LIMIT 1`,
    [id, hospitalId]
  );
  if (!rows[0]) return null;
  const items = await pool.query(
    "SELECT * FROM prescription_items WHERE prescription_id = $1 ORDER BY id",
    [id]
  );
  return { ...toPublicPrescription(rows[0]), items: items.rows.map(toPublicItem) };
}

async function listPatientPrescriptions(patientId) {
  const { rows } = await pool.query(
    `SELECT p.*, du.full_name AS doctor_name, h.name AS hospital_name,
            (SELECT COUNT(*)::int FROM prescription_items pi WHERE pi.prescription_id = p.id) AS item_count
     FROM prescriptions p
     LEFT JOIN users du ON du.id = p.doctor_id
     LEFT JOIN doctors d ON d.user_id = p.doctor_id
     LEFT JOIN hospitals h ON h.id = d.hospital_id
     WHERE p.patient_id = $1
     ORDER BY p.prescription_date DESC, p.created_at DESC`,
    [patientId]
  );
  const prescriptions = rows.map(toPublicPrescription);
  if (prescriptions.length === 0) return prescriptions;
  const itemRows = await pool.query(
    "SELECT * FROM prescription_items WHERE prescription_id = ANY($1::bigint[]) ORDER BY id",
    [prescriptions.map((p) => p.id)]
  );
  const byId = {};
  for (const item of itemRows.rows) {
    const key = Number(item.prescription_id);
    if (!byId[key]) byId[key] = [];
    byId[key].push(toPublicItem(item));
  }
  return prescriptions.map((p) => ({ ...p, items: byId[p.id] || [] }));
}

async function dispensePrescription(id, staffUserId, hospitalId = null) {
  const { rows } = await pool.query(
    `UPDATE prescriptions p
     SET status = 'dispensed', dispensed_by = $2, dispensed_at = now()
     WHERE p.id = $1 AND p.status = 'pending'
       AND ($3::bigint IS NULL OR EXISTS (
         SELECT 1 FROM doctors d WHERE d.user_id = p.doctor_id AND d.hospital_id = $3
       ))
     RETURNING *`,
    [id, staffUserId, hospitalId]
  );
  if (!rows[0]) return null;
  return getPrescriptionById(id, hospitalId);
}

async function getPharmacyDashboard(hospitalId = null) {
  const { rows } = await pool.query(
    `SELECT
       (SELECT COUNT(*)::int FROM prescriptions p
          LEFT JOIN doctors d ON d.user_id = p.doctor_id
          WHERE p.status = 'pending' AND ($1::bigint IS NULL OR d.hospital_id = $1)) AS pending,
       (SELECT COUNT(*)::int FROM prescriptions p
          LEFT JOIN doctors d ON d.user_id = p.doctor_id
          WHERE p.status = 'dispensed' AND ($1::bigint IS NULL OR d.hospital_id = $1)) AS dispensed_total,
       (SELECT COUNT(*)::int FROM prescriptions p
          LEFT JOIN doctors d ON d.user_id = p.doctor_id
          WHERE p.status = 'dispensed' AND p.dispensed_at::date = CURRENT_DATE
            AND ($1::bigint IS NULL OR d.hospital_id = $1)) AS dispensed_today,
       (SELECT COUNT(*)::int FROM prescriptions p
          LEFT JOIN doctors d ON d.user_id = p.doctor_id
          WHERE ($1::bigint IS NULL OR d.hospital_id = $1)) AS total,
       (SELECT COUNT(*)::int FROM prescription_items pi
          JOIN prescriptions p ON p.id = pi.prescription_id
          LEFT JOIN doctors d ON d.user_id = p.doctor_id
          WHERE p.status = 'pending' AND ($1::bigint IS NULL OR d.hospital_id = $1)) AS pending_items`,
    [hospitalId]
  );
  const recent = await pool.query(
    `${LIST_SELECT}
     WHERE ($1::bigint IS NULL OR d.hospital_id = $1)
     ORDER BY p.created_at DESC LIMIT 5`,
    [hospitalId]
  );
  const r = rows[0];
  return {
    pending: r.pending,
    dispensedTotal: r.dispensed_total,
    dispensedToday: r.dispensed_today,
    total: r.total,
    pendingItems: r.pending_items,
    recentPrescriptions: recent.rows.map(toPublicPrescription),
  };
}

module.exports = {
  PRESCRIPTION_STATUSES,
  listPrescriptions,
  getPrescriptionById,
  listPatientPrescriptions,
  dispensePrescription,
  getPharmacyDashboard,
};
