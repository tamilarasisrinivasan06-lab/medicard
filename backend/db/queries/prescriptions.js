const pool = require("../pool");

function toPublicPrescription(row) {
  return {
    id: Number(row.id),
    patientId: Number(row.patient_id),
    doctorId: row.doctor_id ? Number(row.doctor_id) : null,
    appointmentId: row.appointment_id ? Number(row.appointment_id) : null,
    diagnosis: row.diagnosis ?? null,
    notes: row.notes ?? null,
    prescriptionDate: row.prescription_date,
    doctorName: row.doctor_full_name ?? null,
    items: (row.items || []).map((item) => ({
      id: Number(item.id),
      medicineName: item.medicine_name,
      dosage: item.dosage ?? null,
      frequency: item.frequency ?? null,
      duration: item.duration ?? null,
      instructions: item.instructions ?? null,
    })),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function createPrescription({ patientId, doctorId, appointmentId, diagnosis, notes, prescriptionDate, items }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `INSERT INTO prescriptions (patient_id, doctor_id, appointment_id, diagnosis, notes, prescription_date)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [patientId, doctorId || null, appointmentId || null, diagnosis || null, notes || null, prescriptionDate]
    );
    const prescription = rows[0];

    for (const item of items || []) {
      await client.query(
        `INSERT INTO prescription_items (prescription_id, medicine_name, dosage, frequency, duration, instructions)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          prescription.id,
          item.medicineName,
          item.dosage ?? null,
          item.frequency ?? null,
          item.duration ?? null,
          item.instructions ?? null,
        ]
      );
    }

    await client.query("COMMIT");
    return getPrescriptionById(prescription.id);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function getPrescriptionById(id) {
  const { rows } = await pool.query(
    `SELECT p.*, u.full_name AS doctor_full_name,
            COALESCE(json_agg(pi.* ORDER BY pi.id) FILTER (WHERE pi.id IS NOT NULL), '[]') AS items
     FROM prescriptions p
     LEFT JOIN users u ON u.id = p.doctor_id
     LEFT JOIN prescription_items pi ON pi.prescription_id = p.id
     WHERE p.id = $1
     GROUP BY p.id, u.full_name`,
    [id]
  );
  return rows[0] ? toPublicPrescription(rows[0]) : null;
}

async function listPrescriptionsByPatient(patientId) {
  const { rows } = await pool.query(
    `SELECT p.*, u.full_name AS doctor_full_name,
            COALESCE(json_agg(pi.* ORDER BY pi.id) FILTER (WHERE pi.id IS NOT NULL), '[]') AS items
     FROM prescriptions p
     LEFT JOIN users u ON u.id = p.doctor_id
     LEFT JOIN prescription_items pi ON pi.prescription_id = p.id
     WHERE p.patient_id = $1
     GROUP BY p.id, u.full_name
     ORDER BY p.prescription_date DESC, p.created_at DESC`,
    [patientId]
  );
  return rows.map(toPublicPrescription);
}

async function listPrescriptionsByDoctor(userId) {
  const { rows } = await pool.query(
    `SELECT p.*, u.full_name AS doctor_full_name,
            COALESCE(json_agg(pi.* ORDER BY pi.id) FILTER (WHERE pi.id IS NOT NULL), '[]') AS items,
            m.medicard_id
     FROM prescriptions p
     LEFT JOIN users u ON u.id = p.doctor_id
     LEFT JOIN prescription_items pi ON pi.prescription_id = p.id
     LEFT JOIN medicards m ON m.patient_id = p.patient_id
     WHERE p.doctor_id = $1
     GROUP BY p.id, u.full_name, m.medicard_id
     ORDER BY p.prescription_date DESC, p.created_at DESC`,
    [userId]
  );
  return rows.map((r) => ({ ...toPublicPrescription(r), medicardId: r.medicard_id ?? null }));
}

module.exports = {
  createPrescription,
  getPrescriptionById,
  listPrescriptionsByPatient,
  listPrescriptionsByDoctor,
};