require("dotenv").config();
const pool = require("./pool");

const DIAGNOSES = [
  { title: "Hypertension Stage 2", sym: "Frequent headaches, mild dizziness, elevated BP 150/95", dx: "Essential Primary Hypertension", adv: "Maintain low sodium diet, avoid stress, daily 30m aerobic exercise." },
  { title: "Type 2 Diabetes Mellitus", sym: "Polyuria, polydipsia, fatigue, fasting blood sugar 168 mg/dL", dx: "Uncontrolled Type 2 Diabetes Mellitus", adv: "Cut processed carbohydrates, monitor postprandial glucose twice weekly." },
  { title: "Acute Bronchitis", sym: "Productive cough with yellowish sputum, low-grade fever, chest tightness", dx: "Acute viral bronchitis", adv: "Warm steam inhalation twice daily, plenty of warm fluids, rest." },
  { title: "Gastroesophageal Reflux Disease", sym: "Substernal burning sensation after meals, acid regurgitation", dx: "GERD (Mild to Moderate)", adv: "Elevate head of bed 6 inches, avoid eating within 3 hours before sleep." },
  { title: "Migraine without Aura", sym: "Unilateral throbbing headache, photophobia, nausea", dx: "Episodic Migraine", adv: "Keep headache trigger diary, maintain regular sleep-wake schedule." },
  { title: "Hyperlipidemia", sym: "Routine screening revealed LDL 175 mg/dL, Total Cholesterol 250", dx: "Mixed Dyslipidemia", adv: "Adopt Mediterranean diet, increase omega-3 intake, brisk walk 45 mins." },
  { title: "Allergic Rhinitis & Sinusitis", sym: "Nasal congestion, post-nasal drip, facial pressure", dx: "Seasonal Allergic Rhinosinusitis", adv: "Saline nasal irrigation twice daily, avoid dust or pollen exposure." },
  { title: "Osteoarthritis of Right Knee", sym: "Morning joint stiffness, crepitus on flexion, localized pain", dx: "Primary Osteoarthritis (Grade II)", adv: "Quadriceps strengthening physiotherapy, weight control, avoid high-impact jumping." },
  { title: "Iron Deficiency Anemia", sym: "Generalized fatigue, pallor, mild exertional dyspnea", dx: "Microcytic Hypochromic Anemia", adv: "Increase iron-rich foods, take supplement with Vitamin C." },
  { title: "Generalized Anxiety Disorder", sym: "Restlessness, muscle tension, insomnia, excessive worry", dx: "Mild Generalized Anxiety Disorder", adv: "Cognitive behavioral stress management, mindfulness breathing exercises." },
  { title: "Urinary Tract Infection", sym: "Dysuria, increased frequency, lower abdominal discomfort", dx: "Acute Cystitis", adv: "Drink plenty of fluids, finish full antibiotic course." },
  { title: "Viral Fever", sym: "High grade fever, body ache, chills, headache", dx: "Acute Viral Syndrome", adv: "Paracetamol as needed, hydration, rest for 3 days." },
];

const MEDICATIONS = [
  { name: "Amlodipine Besylate", dosage: "5mg", freq: "Once daily (Morning)", dur: "30 days" },
  { name: "Metformin Hydrochloride", dosage: "500mg", freq: "Twice daily after meals", dur: "60 days" },
  { name: "Atorvastatin", dosage: "20mg", freq: "Once daily (Bedtime)", dur: "30 days" },
  { name: "Omeprazole", dosage: "20mg", freq: "Once daily before breakfast", dur: "14 days" },
  { name: "Montelukast + Levocetirizine", dosage: "10mg/5mg", freq: "Once daily at bedtime", dur: "10 days" },
  { name: "Paracetamol", dosage: "650mg", freq: "SOS (Max 3 times daily)", dur: "5 days" },
  { name: "Amoxicillin-Clavulanate", dosage: "625mg", freq: "Twice daily after food", dur: "7 days" },
  { name: "Azithromycin", dosage: "500mg", freq: "Once daily before lunch", dur: "5 days" },
  { name: "Ferrous Ascorbate + Folic Acid", dosage: "100mg/1.5mg", freq: "Once daily after meals", dur: "60 days" },
  { name: "Glimepiride", dosage: "1mg", freq: "Once daily before breakfast", dur: "30 days" },
  { name: "Vitamin D3", dosage: "60000 IU", freq: "Once weekly", dur: "8 weeks" },
  { name: "Cetirizine", dosage: "10mg", freq: "Once daily at night", dur: "7 days" },
];

const LAB_TESTS = [
  { title: "Complete Blood Count (CBC)", tests: "Hemoglobin, WBC, Platelets, RBC Indices", prio: "routine" },
  { title: "Comprehensive Metabolic Panel", tests: "Fasting Glucose, BUN, Creatinine, Electrolytes", prio: "routine" },
  { title: "Lipid Profile Panel", tests: "Total Cholesterol, HDL, LDL, Triglycerides, VLDL", prio: "routine" },
  { title: "HbA1c Glycated Hemoglobin", tests: "Glycated Hemoglobin percentage, Estimated Average Glucose", prio: "routine" },
  { title: "Thyroid Stimulating Hormone (TSH)", tests: "TSH, Free T3, Free T4 Ultra-sensitive", prio: "routine" },
  { title: "Liver Function Test (LFT)", tests: "SGOT/AST, SGPT/ALT, Bilirubin Total/Direct, ALP", prio: "routine" },
  { title: "Urinalysis Routine & Microscopy", tests: "Urine Protein, Glucose, Leukocytes, Nitrites", prio: "routine" },
  { title: "Cardiac Troponin & ECG", tests: "High-Sensitivity Troponin-I, 12-lead ECG", prio: "urgent" },
];

const ALLERGIES = [
  { allergen: "Penicillin", reaction: "Skin rash with itching", severity: "moderate" },
  { allergen: "Peanuts", reaction: "Hives on face and arms", severity: "severe" },
  { allergen: "Sulfa drugs", reaction: "Fever and rash", severity: "moderate" },
  { allergen: "Dust mites", reaction: "Sneezing and nasal congestion", severity: "mild" },
  { allergen: "Shellfish", reaction: "Swelling of lips, urticaria", severity: "severe" },
  { allergen: "Lactose", reaction: "Bloating and stomach cramps", severity: "mild" },
];

const DOC_CATEGORIES = ["report", "scan", "prescription", "discharge_summary", "insurance", "other"];
const DOC_TITLES = [
  "Chest X-Ray Report",
  "MRI Right Knee Scan",
  "Ultrasound Abdomen Report",
  "Discharge Summary - Ward",
  "ECG Report",
  "Insurance Claim Document",
  "Blood Test Report",
  "Dental Scan",
];

const APPOINTMENT_REASONS = [
  "Blood pressure review",
  "Diabetes follow-up",
  "Routine annual checkup",
  "Knee pain evaluation",
  "Fever consultation",
  "Medication refill",
];
const APPOINTMENT_STATUSES = ["scheduled", "confirmed", "completed", "completed", "completed"];

const FOLLOW_UP_NOTES = [
  "Review blood pressure readings over 2 weeks.",
  "Repeat fasting glucose in 3 months.",
  "Check lipid panel after completing statin course.",
  "Physiotherapy review for knee mobility.",
  "Anemia reassessment with repeat CBC.",
  "Sleep and stress management follow-up.",
];

const RECORD_TYPES = ["diagnosis", "lab_report", "scan", "prescription", "discharge_summary", "vaccination", "other"];

async function seedSamples() {
  console.log("==================================================");
  console.log("  Seeding sample clinical data for all patients");
  console.log("==================================================");

  const docRes = await pool.query(
    `SELECT d.id AS doctor_table_id, d.user_id, u.full_name, d.specialization, h.name AS hospital
     FROM doctors d
     JOIN users u ON u.id = d.user_id
     LEFT JOIN hospitals h ON h.id = d.hospital_id`
  );
  const patRes = await pool.query(
    `SELECT pp.id AS patient_id, pp.user_id, u.full_name, mc.medicard_id
     FROM patient_profiles pp
     JOIN users u ON u.id = pp.user_id
     LEFT JOIN medicards mc ON mc.patient_id = pp.id`
  );

  if (docRes.rows.length === 0 || patRes.rows.length === 0) {
    console.error("Run npm run db:seed and npm run db:seed:demo first.");
    process.exit(1);
  }

  const doctors = docRes.rows;
  const patients = patRes.rows;
  console.log(`Doctors: ${doctors.length} | Patients: ${patients.length}`);

  let accessCount = 0;
  for (const doc of doctors) {
    for (const pat of patients) {
      if (!pat.medicard_id) continue;
      const existing = await pool.query(
        "SELECT id, status FROM doctor_patient_access WHERE doctor_id = $1 AND patient_id = $2",
        [doc.user_id, pat.patient_id]
      );
      if (existing.rows.length === 0) {
        await pool.query(
          `INSERT INTO doctor_patient_access (doctor_id, patient_id, medicard_id, reason, status, expires_at)
           VALUES ($1, $2, $3, 'Sample clinical data access', 'accepted', now() + interval '180 days')`,
          [doc.user_id, pat.patient_id, pat.medicard_id]
        );
        accessCount++;
      } else if (existing.rows[0].status !== "accepted") {
        await pool.query(
          "UPDATE doctor_patient_access SET status = 'accepted', expires_at = now() + interval '180 days' WHERE id = $1",
          [existing.rows[0].id]
        );
        accessCount++;
      }
    }
  }
  console.log(`Access grants ensured: ${accessCount}`);

  const counts = { records: 0, meds: 0, allergies: 0, consultations: 0, prescriptions: 0, items: 0, labRequests: 0, labReports: 0, documents: 0, appointments: 0, followUps: 0 };

  for (let pIdx = 0; pIdx < patients.length; pIdx++) {
    const pat = patients[pIdx];
    const pid = pat.patient_id;
    const doc = doctors[pIdx % doctors.length];
    const hospital = doc.hospital || "City Care Hospital";
    const base = pIdx * 7;

    for (let i = 0; i < 5; i++) {
      const d = DIAGNOSES[(base + i) % DIAGNOSES.length];
      const offset = 15 + ((base + i) % 330);
      const date = new Date(Date.now() - offset * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const title = `${d.title} Progress Evaluation ${i + 1}`;
      const dup = await pool.query("SELECT 1 FROM medical_records WHERE patient_id = $1 AND title = $2", [pid, title]);
      if (dup.rows.length) continue;
      await pool.query(
        `INSERT INTO medical_records (patient_id, user_id, record_type, title, description, diagnosis, doctor_name, hospital_name, record_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [pid, doc.user_id, RECORD_TYPES[i % RECORD_TYPES.length], title, d.sym, d.dx, doc.full_name, hospital, date]
      );
      counts.records++;
    }

    for (let i = 0; i < 4; i++) {
      const m = MEDICATIONS[(base + i) % MEDICATIONS.length];
      const start = new Date(Date.now() - (5 + i) * 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const dup = await pool.query("SELECT 1 FROM medications WHERE patient_id = $1 AND medicine_name = $2", [pid, m.name]);
      if (dup.rows.length) continue;
      await pool.query(
        `INSERT INTO medications (patient_id, medicine_name, dosage, frequency, duration, start_date, end_date, instructions, prescribed_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [pid, m.name, m.dosage, m.freq, m.dur, start, new Date(new Date(start).getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), "Take as directed by physician", doc.full_name]
      );
      counts.meds++;
    }

    for (let i = 0; i < 3; i++) {
      const a = ALLERGIES[(base + i) % ALLERGIES.length];
      const dup = await pool.query("SELECT 1 FROM allergies WHERE patient_id = $1 AND allergen = $2", [pid, a.allergen]);
      if (dup.rows.length) continue;
      await pool.query(
        `INSERT INTO allergies (patient_id, allergen, reaction, severity, notes) VALUES ($1, $2, $3, $4, $5)`,
        [pid, a.allergen, a.reaction, a.severity, "Documented during clinical intake"]
      );
      counts.allergies++;
    }

    const consultIds = [];
    for (let i = 0; i < 4; i++) {
      const d = DIAGNOSES[(base + i + 2) % DIAGNOSES.length];
      const offset = 10 + ((base + i * 3) % 300);
      const date = new Date(Date.now() - offset * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const title = d.title;
      const dup = await pool.query("SELECT 1 FROM consultations WHERE patient_id = $1 AND title = $2 AND consultation_date = $3", [pid, title, date]);
      if (dup.rows.length) continue;
      const c = await pool.query(
        `INSERT INTO consultations (patient_id, doctor_id, title, symptoms, diagnosis, advice_notes, consultation_date, status, hospital_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed', $8) RETURNING id`,
        [pid, doc.user_id, title, d.sym, d.dx, d.adv, date, hospital]
      );
      consultIds.push(c.rows[0].id);
      counts.consultations++;
    }

    for (let i = 0; i < 4; i++) {
      const d = DIAGNOSES[(base + i + 5) % DIAGNOSES.length];
      const date = new Date(Date.now() - (5 + (base + i) % 120) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const dup = await pool.query("SELECT 1 FROM prescriptions WHERE patient_id = $1 AND diagnosis = $2 AND prescription_date = $3", [pid, d.dx, date]);
      if (dup.rows.length) continue;
      const r = await pool.query(
        `INSERT INTO prescriptions (patient_id, doctor_id, diagnosis, notes, prescription_date)
         VALUES ($1, $2, $3, 'Prescribed during sample clinical consultation.', $4) RETURNING id`,
        [pid, doc.user_id, d.dx, date]
      );
      counts.prescriptions++;
      const m1 = MEDICATIONS[(base + i * 2) % MEDICATIONS.length];
      const m2 = MEDICATIONS[(base + i * 2 + 3) % MEDICATIONS.length];
      await pool.query(
        `INSERT INTO prescription_items (prescription_id, medicine_name, dosage, frequency, duration)
         VALUES ($1, $2, $3, $4, $5), ($1, $6, $7, $8, $9)`,
        [r.rows[0].id, m1.name, m1.dosage, m1.freq, m1.dur, m2.name, m2.dosage, m2.freq, m2.dur]
      );
      counts.items += 2;
    }

    for (let i = 0; i < 4; i++) {
      const l = LAB_TESTS[(base + i) % LAB_TESTS.length];
      const offset = 4 + ((base + i) % 180);
      const date = new Date(Date.now() - offset * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const dup = await pool.query("SELECT 1 FROM lab_requests WHERE patient_id = $1 AND title = $2", [pid, l.title]);
      if (dup.rows.length) continue;
      const lr = await pool.query(
        `INSERT INTO lab_requests (patient_id, doctor_id, consultation_id, title, tests, instructions, priority, status)
         VALUES ($1, $2, $3, $4, $5, 'Fasting 8-10 hours prior to blood draw', $6, 'delivered') RETURNING id`,
        [pid, doc.user_id, consultIds.length ? consultIds[i % consultIds.length] : null, l.title, l.tests, l.prio]
      );
      counts.labRequests++;
      const rdup = await pool.query("SELECT 1 FROM lab_reports WHERE patient_id = $1 AND title = $2", [pid, l.title]);
      if (rdup.rows.length) continue;
      await pool.query(
        `INSERT INTO lab_reports (patient_id, doctor_id, lab_request_id, title, summary, report_text, report_date)
         VALUES ($1, $2, $3, $4, 'Results reviewed: within expected parameters with mild variance', 'All specimen parameters analyzed using automated chemiluminescence.', $5)`,
        [pid, doc.user_id, lr.rows[0].id, l.title, date]
      );
      counts.labReports++;
    }

    for (let i = 0; i < 3; i++) {
      const title = DOC_TITLES[(base + i) % DOC_TITLES.length];
      const dup = await pool.query("SELECT 1 FROM medical_documents WHERE patient_id = $1 AND title = $2", [pid, title]);
      if (dup.rows.length) continue;
      await pool.query(
        `INSERT INTO medical_documents (patient_id, doctor_id, category, title, notes)
         VALUES ($1, $2, $3, $4, $5)`,
        [pid, doc.user_id, DOC_CATEGORIES[i % DOC_CATEGORIES.length], title, "Attached during sample visit documentation."]
      );
      counts.documents++;
    }

    for (let i = 0; i < 3; i++) {
      const reason = APPOINTMENT_REASONS[(base + i) % APPOINTMENT_REASONS.length];
      const dup = await pool.query("SELECT 1 FROM appointments WHERE patient_id = $1 AND reason = $2", [pid, reason]);
      if (dup.rows.length) continue;
      const date = new Date(Date.now() + (i - 1) * 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      await pool.query(
        `INSERT INTO appointments (patient_id, doctor_id, hospital_id, appointment_date, appointment_time, reason, status, notes)
         VALUES ($1, $2, $3, $4, '10:00', $5, $6, $7)`,
        [pid, doc.doctor_table_id, null, date, reason, APPOINTMENT_STATUSES[(base + i) % APPOINTMENT_STATUSES.length], "Sample appointment record"]
      );
      counts.appointments++;
    }

    for (let i = 0; i < 2; i++) {
      const notes = FOLLOW_UP_NOTES[(base + i) % FOLLOW_UP_NOTES.length];
      const date = new Date(Date.now() + (12 + i) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const dup = await pool.query("SELECT 1 FROM follow_ups WHERE patient_id = $1 AND follow_up_date = $2", [pid, date]);
      if (dup.rows.length) continue;
      await pool.query(
        `INSERT INTO follow_ups (patient_id, doctor_id, consultation_id, follow_up_date, notes, status)
         VALUES ($1, $2, $3, $4, $5, 'scheduled')`,
        [pid, doc.user_id, consultIds.length ? consultIds[i % consultIds.length] : null, date, notes]
      );
      counts.followUps++;
    }

    console.log(`  ${pat.full_name.padEnd(18)} (${pat.medicard_id}) seeded`);
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log("==================================================");
  console.log(`Inserted ${total} sample records:`);
  for (const [k, v] of Object.entries(counts)) console.log(`  - ${k}: ${v}`);
  console.log("==================================================");

  await pool.end();
}

seedSamples().catch((err) => {
  console.error("Sample seed failed:", err);
  process.exit(1);
});