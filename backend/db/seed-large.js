require("dotenv").config();
const pool = require("./pool");

async function seedLarge() {
  console.log("==================================================");
  console.log("  Generating 1,000+ Medical Records Benchmark");
  console.log("==================================================");

  // 1. Fetch existing doctors and patient profiles
  const docRes = await pool.query("SELECT d.id AS doctor_table_id, d.user_id, u.full_name, d.specialization FROM doctors d JOIN users u ON u.id = d.user_id");
  const patRes = await pool.query("SELECT pp.id AS patient_id, pp.user_id, u.full_name, mc.medicard_id FROM patient_profiles pp JOIN users u ON u.id = pp.user_id LEFT JOIN medicards mc ON mc.patient_id = pp.id");

  if (docRes.rows.length === 0 || patRes.rows.length === 0) {
    console.error("Please run npm run db:seed first to ensure doctors and patients exist.");
    process.exit(1);
  }

  const doctors = docRes.rows;
  const patients = patRes.rows;
  console.log(`Found ${doctors.length} doctors and ${patients.length} patients.`);

  // 2. Ensure each doctor has accepted access to patients
  console.log("Ensuring doctor access grants...");
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
           VALUES ($1, $2, $3, 'Automated clinical testing access', 'accepted', now() + interval '90 days')`,
          [doc.user_id, pat.patient_id, pat.medicard_id]
        );
      } else if (existing.rows[0].status !== 'accepted') {
        await pool.query(
          "UPDATE doctor_patient_access SET status = 'accepted', expires_at = now() + interval '90 days' WHERE id = $1",
          [existing.rows[0].id]
        );
      }
    }
  }

  // Clinical mock data pools
  const diagnoses = [
    { title: "Hypertension Stage 2", sym: "Frequent headaches, mild dizziness, elevated BP 150/95", dx: "Essential Primary Hypertension", adv: "Maintain low sodium diet, avoid stress, daily 30m aerobic exercise." },
    { title: "Type 2 Diabetes Mellitus", sym: "Polyuria, polydipsia, fatigue, fasting blood sugar 168 mg/dL", dx: "Uncontrolled Type 2 Diabetes Mellitus", adv: "Cut processed carbohydrates, monitor postprandial glucose twice weekly." },
    { title: "Acute Bronchitis", sym: "Productive cough with yellowish sputum, low-grade fever 99.8F, chest tightness", dx: "Acute viral/bacterial bronchitis", adv: "Warm steam inhalation twice daily, plenty of warm fluids, rest." },
    { title: "Gastroesophageal Reflux Disease", sym: "Substernal burning sensation after meals, acid regurgitation", dx: "GERD (Mild to Moderate)", adv: "Elevate head of bed 6 inches, avoid eating within 3 hours before sleep." },
    { title: "Migraine without Aura", sym: "Unilateral throbbing headache, photophobia, phonophobia, nausea", dx: "Episodic Migraine", adv: "Keep headache trigger diary, maintain regular sleep-wake schedule." },
    { title: "Hyperlipidemia", sym: "Asymptomatic, routine screening revealed LDL 175 mg/dL, Total Cholesterol 250", dx: "Mixed Dyslipidemia", adv: "Adopt Mediterranean diet, increase omega-3 intake, brisk walk 45 mins." },
    { title: "Allergic Rhinitis & Sinusitis", sym: "Nasal congestion, post-nasal drip, facial pressure across frontal sinuses", dx: "Seasonal Allergic Rhinosinusitis", adv: "Saline nasal irrigation twice daily, avoid dust/pollen exposure." },
    { title: "Osteoarthritis of Right Knee", sym: "Joint stiffness in morning lasting 15 mins, crepitus on flexion, localized pain", dx: "Primary Osteoarthritis (Grade II)", adv: "Quadriceps strengthening physiotherapy, weight control, avoid high-impact jumping." },
    { title: "Iron Deficiency Anemia", sym: "Generalized fatigue, pallor, mild exertional dyspnea, brittle nails", dx: "Microcytic Hypochromic Anemia", adv: "Increase iron-rich foods (spinach, lentils, dates), take supplement with Vitamin C." },
    { title: "Generalized Anxiety Disorder", sym: "Chronic restlessness, muscle tension, insomnia, excessive worry", dx: "Mild Generalized Anxiety Disorder", adv: "Cognitive behavioral stress management, mindfulness breathing exercises." }
  ];

  const medicationList = [
    { name: "Amlodipine Besylate", dosage: "5mg", freq: "Once daily (Morning)", dur: "30 days" },
    { name: "Metformin Hydrochloride", dosage: "500mg", freq: "Twice daily after meals", dur: "60 days" },
    { name: "Atorvastatin", dosage: "20mg", freq: "Once daily (Bedtime)", dur: "30 days" },
    { name: "Omeprazole", dosage: "20mg", freq: "Once daily (30 mins before breakfast)", dur: "14 days" },
    { name: "Montelukast + Levocetirizine", dosage: "10mg/5mg", freq: "Once daily at bedtime", dur: "10 days" },
    { name: "Paracetamol", dosage: "650mg", freq: "SOS (Max 3 times daily)", dur: "5 days" },
    { name: "Amoxicillin-Clavulanate", dosage: "625mg", freq: "Twice daily after food", dur: "7 days" },
    { name: "Azithromycin", dosage: "500mg", freq: "Once daily before lunch", dur: "5 days" },
    { name: "Ferrous Ascorbate + Folic Acid", dosage: "100mg/1.5mg", freq: "Once daily after meals", dur: "60 days" },
    { name: "Glimepiride", dosage: "1mg", freq: "Once daily before breakfast", dur: "30 days" }
  ];

  const labTestNames = [
    { title: "Complete Blood Count (CBC)", tests: "Hemoglobin, WBC, Platelets, RBC Indices", prio: "routine" },
    { title: "Comprehensive Metabolic Panel", tests: "Fasting Glucose, BUN, Creatinine, Electrolytes (Na/K/Cl)", prio: "routine" },
    { title: "Lipid Profile Panel", tests: "Total Cholesterol, HDL, LDL, Triglycerides, VLDL", prio: "routine" },
    { title: "HbA1c Glycated Hemoglobin", tests: "Glycated Hemoglobin percentage, Estimated Average Glucose", prio: "routine" },
    { title: "Thyroid Stimulating Hormone (TSH)", tests: "TSH, Free T3, Free T4 Ultra-sensitive", prio: "routine" },
    { title: "Liver Function Test (LFT)", tests: "SGOT/AST, SGPT/ALT, Bilirubin Total/Direct, Alkaline Phosphatase", prio: "routine" },
    { title: "Urinalysis Routine & Microscopy", tests: "Urine Protein, Glucose, Leukocytes, Nitrites, Microscopic Sediment", prio: "routine" },
    { title: "Cardiac Troponin & ECG", tests: "High-Sensitivity Troponin-I, 12-lead ECG", prio: "urgent" }
  ];

  let consultationCount = 0;
  let prescriptionCount = 0;
  let labCount = 0;
  let recordCount = 0;

  console.log("Seeding consultations, prescriptions, and lab data across patients...");

  // Generate 40 consultations per patient (~500+ consultations across all patients)
  for (let pIdx = 0; pIdx < patients.length; pIdx++) {
    const pat = patients[pIdx];
    for (let cIdx = 0; cIdx < 35; cIdx++) {
      const doc = doctors[(pIdx + cIdx) % doctors.length];
      const dDef = diagnoses[(pIdx + cIdx) % diagnoses.length];
      const dayOffset = Math.floor(Math.random() * 365) + 1; // within last 1 year
      const cDate = new Date(Date.now() - dayOffset * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      // Insert Consultation
      const cRes = await pool.query(
        `INSERT INTO consultations (patient_id, doctor_id, title, symptoms, diagnosis, advice_notes, consultation_date, status, hospital_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed', 'City Care Hospital')
         RETURNING id`,
        [pat.patient_id, doc.user_id, dDef.title, dDef.sym, dDef.dx, dDef.adv, cDate]
      );
      consultationCount++;

      // Insert Prescription (for 70% of consultations)
      if (cIdx % 3 !== 0) {
        const rxRes = await pool.query(
          `INSERT INTO prescriptions (patient_id, doctor_id, diagnosis, notes, prescription_date)
           VALUES ($1, $2, $3, 'Prescribed during regular clinical consultation.', $4)
           RETURNING id`,
          [pat.patient_id, doc.user_id, dDef.dx, cDate]
        );
        prescriptionCount++;

        // Add 2 medicines per prescription
        const med1 = medicationList[(cIdx * 2) % medicationList.length];
        const med2 = medicationList[(cIdx * 2 + 1) % medicationList.length];
        await pool.query(
          `INSERT INTO prescription_items (prescription_id, medicine_name, dosage, frequency, duration)
           VALUES ($1, $2, $3, $4, $5), ($1, $6, $7, $8, $9)`,
          [rxRes.rows[0].id, med1.name, med1.dosage, med1.freq, med1.dur, med2.name, med2.dosage, med2.freq, med2.dur]
        );
      }

      // Insert Lab Request (for 50% of consultations)
      if (cIdx % 2 === 0) {
        const lDef = labTestNames[(cIdx + pIdx) % labTestNames.length];
        const lrRes = await pool.query(
          `INSERT INTO lab_requests (patient_id, doctor_id, consultation_id, title, tests, instructions, priority, status)
           VALUES ($1, $2, $3, $4, $5, 'Fasting 8-10 hours prior to blood draw', $6, 'delivered')
           RETURNING id`,
          [pat.patient_id, doc.user_id, cRes.rows[0].id, lDef.title, lDef.tests, lDef.prio]
        );
        labCount++;

        // Insert Lab Report corresponding to request
        await pool.query(
          `INSERT INTO lab_reports (patient_id, doctor_id, lab_request_id, title, summary, report_text, report_date)
           VALUES ($1, $2, $3, $4, 'Results reviewed: Within expected parameters with mild variance', 'All specimen parameters analyzed using automated chemiluminescence.', $5)`,
          [pat.patient_id, doc.user_id, lrRes.rows[0].id, lDef.title, cDate]
        );
        labCount++;
      }

      // Insert Medical Record
      if (cIdx % 4 === 0) {
        await pool.query(
          `INSERT INTO medical_records (patient_id, title, description, record_type, doctor_name, hospital_name, record_date)
           VALUES ($1, $2, $3, 'diagnosis', $4, 'City Care Hospital', $5)`,
          [pat.patient_id, `${dDef.title} Progress Evaluation`, dDef.dx, doc.full_name, cDate]
        );
        recordCount++;
      }
    }
  }

  const total = consultationCount + prescriptionCount + labCount + recordCount;
  console.log("==================================================");
  console.log(`Successfully generated ${total} records!`);
  console.log(`  - Consultations: ${consultationCount}`);
  console.log(`  - Prescriptions: ${prescriptionCount}`);
  console.log(`  - Lab Requests/Reports: ${labCount}`);
  console.log(`  - Medical Records: ${recordCount}`);
  console.log("==================================================");

  await pool.end();
  process.exit(0);
}

seedLarge().catch((err) => {
  console.error("Large seed failed:", err);
  process.exit(1);
});
