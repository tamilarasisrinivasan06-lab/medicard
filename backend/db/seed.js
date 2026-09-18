require("dotenv").config();
const bcrypt = require("bcryptjs");
const pool = require("./pool");
const patients = require("./queries/patients");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not defined. Add it to backend/.env");
  process.exit(1);
}

async function upsertHospital(h) {
  const existing = await pool.query("SELECT id FROM hospitals WHERE name = $1 ORDER BY id LIMIT 1", [h.name]);
  if (existing.rows.length > 0) return existing.rows[0].id;

  const { rows } = await pool.query(
    `INSERT INTO hospitals (name, address, city, state, pincode, phone, email)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [h.name, h.address, h.city, h.state, h.pincode, h.phone, h.email]
  );
  return rows[0].id;
}

async function upsertUser({ fullName, email, phone, password, role, dateOfBirth, gender, hospitalId }) {
  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
  if (existing.rows.length > 0) return existing.rows[0].id;

  const passwordHash = await bcrypt.hash(password, 10);
  const { rows } = await pool.query(
    `INSERT INTO users (full_name, email, phone, password_hash, role, date_of_birth, gender, hospital_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (email) DO NOTHING
     RETURNING id`,
    [fullName, email, phone, passwordHash, role, dateOfBirth, gender, hospitalId || null]
  );
  return rows[0].id;
}

async function upsertDoctor({ userId, specialization, qualification, registrationNumber, experience, hospitalId, fee }) {
  const existing = await pool.query("SELECT id FROM doctors WHERE user_id = $1", [userId]);
  if (existing.rows.length > 0) {
    await pool.query("UPDATE doctors SET hospital_id = $1 WHERE user_id = $2", [hospitalId || null, userId]);
    return existing.rows[0].id;
  }
  const { rows } = await pool.query(
    `INSERT INTO doctors (user_id, specialization, qualification, registration_number, experience, hospital_id, consultation_fee)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [userId, specialization, qualification, registrationNumber, experience, hospitalId, fee]
  );
  return rows[0].id;
}

async function seed() {
  console.log("========================================");
  console.log("  MediCard DEVELOPMENT / TEST SEED DATA");
  console.log("  These accounts and records are for");
  console.log("  development and testing only.");
  console.log("========================================");

  const cityCare = await upsertHospital({
    name: "City Care Hospital",
    address: "12 MG Road",
    city: "Hyderabad",
    state: "Telangana",
    pincode: "500003",
    phone: "+91-40-12345678",
    email: "info@citycare.example",
  });
  const sunrise = await upsertHospital({
    name: "Sunrise Multispecialty",
    address: "45 Indiranagar",
    city: "Bangalore",
    state: "Karnataka",
    pincode: "560038",
    phone: "+91-80-98765432",
    email: "care@sunrise.example",
  });
  console.log(`Hospitals ready: City Care (${cityCare}), Sunrise (${sunrise})`);

  const adminId = await upsertUser({
    fullName: "Dev Admin",
    email: "admin@medicard.test",
    phone: "+91-9000000001",
    password: "Admin@123",
    role: "admin",
  });

  const superAdminId = await upsertUser({
    fullName: "Platform Super Admin",
    email: "superadmin@medicard.test",
    phone: "+91-9000000000",
    password: "Super@1234",
    role: "super_admin",
  });
  console.log(`Super admin ready: Platform Super Admin (${superAdminId})`);

  const pharmacistId = await upsertUser({
    fullName: "Dev Pharmacist",
    email: "dev.pharmacy@medicard.test",
    phone: "+91-9000000004",
    password: "Pharmacy@123",
    role: "pharmacist",
    gender: "female",
    hospitalId: cityCare,
  });
  const labStaffId = await upsertUser({
    fullName: "Dev Lab Technician",
    email: "dev.lab@medicard.test",
    phone: "+91-9000000005",
    password: "Lab@123",
    role: "diagnostic_staff",
    gender: "male",
    hospitalId: cityCare,
  });
  console.log(`Pharmacy ready: Dev Pharmacist (${pharmacistId}); Lab ready: Dev Lab Technician (${labStaffId})`);

  const hospitalUserId = await upsertUser({
    fullName: "City Care Hospital Admin",
    email: "dev.hospital@medicard.test",
    phone: "+91-9000000006",
    password: "Hospital@123",
    role: "hospital",
    gender: "female",
    hospitalId: cityCare,
  });
  console.log(`Hospital portal ready: City Care Hospital Admin (${hospitalUserId})`);

  const doc1Id = await upsertUser({
    fullName: "Dr. Anita Rao",
    email: "dev.doctor1@medicard.test",
    phone: "+91-9000000002",
    password: "Doctor@123",
    role: "doctor",
    gender: "female",
  });
  const doc2Id = await upsertUser({
    fullName: "Dr. Kiran Menon",
    email: "dev.doctor2@medicard.test",
    phone: "+91-9000000003",
    password: "Doctor@123",
    role: "doctor",
    gender: "male",
  });
  const doc1RowId = await upsertDoctor({
    userId: doc1Id,
    specialization: "Cardiology",
    qualification: "MD, DM Cardiology",
    registrationNumber: "MC-DOC-0001",
    experience: 12,
    hospitalId: cityCare,
    fee: 800,
  });
  const doc2RowId = await upsertDoctor({
    userId: doc2Id,
    specialization: "General Medicine",
    qualification: "MBBS, MD",
    registrationNumber: "MC-DOC-0002",
    experience: 8,
    hospitalId: sunrise,
    fee: 500,
  });
  console.log(`Doctors ready: Dr. Anita Rao (${doc1Id}), Dr. Kiran Menon (${doc2Id})`);

  const patientDefs = [
    {
      fullName: "Alex Johnson",
      email: "dev.patient1@medicard.test",
      phone: "+91-9000000011",
      dateOfBirth: "1992-04-15",
      gender: "male",
      profile: {
        bloodGroup: "O+",
        address: "22 Lake View",
        city: "Hyderabad",
        state: "Telangana",
        pincode: "500004",
        emergencyContactName: "Jane Johnson",
        emergencyContactPhone: "+91-9000000021",
      },
    },
    {
      fullName: "Priya Sharma",
      email: "dev.patient2@medicard.test",
      phone: "+91-9000000012",
      dateOfBirth: "1988-09-02",
      gender: "female",
      profile: {
        bloodGroup: "B+",
        address: "9 Rose Street",
        city: "Hyderabad",
        state: "Telangana",
        pincode: "500005",
        emergencyContactName: "Rahul Sharma",
        emergencyContactPhone: "+91-9000000022",
      },
    },
    {
      fullName: "Michael Chen",
      email: "dev.patient3@medicard.test",
      phone: "+91-9000000013",
      dateOfBirth: "2000-01-30",
      gender: "male",
      profile: {
        bloodGroup: "A+",
        address: "77 Tech Park",
        city: "Bangalore",
        state: "Karnataka",
        pincode: "560040",
        emergencyContactName: "Lisa Chen",
        emergencyContactPhone: "+91-9000000023",
      },
    },
  ];

  const patientIds = [];
  for (const def of patientDefs) {
    const userId = await upsertUser({
      fullName: def.fullName,
      email: def.email,
      phone: def.phone,
      password: "Patient@123",
      role: "patient",
      dateOfBirth: def.dateOfBirth,
      gender: def.gender,
    });

    const existing = await pool.query("SELECT id FROM patient_profiles WHERE user_id = $1", [userId]);
    let profileId;
    if (existing.rows.length > 0) {
      profileId = existing.rows[0].id;
    } else {
      const profile = await patients.createPatientProfile(userId);
      profileId = profile.id;
    }

    await patients.updatePatientProfile(userId, def.profile);
    patientIds.push(profileId);
    console.log(`Patient ready: ${def.fullName} (profile ${profileId})`);
  }

  const samples = [
    {
      patientId: patientIds[0],
      userId: doc1Id,
      type: "diagnosis",
      title: "Follow-up for hypertension",
      description: "Blood pressure monitored over 8 weeks.",
      diagnosis: "Stage 1 hypertension, controlled",
      doctor: "Dr. Anita Rao",
      hospital: "City Care Hospital",
      offsetDays: 12,
      meds: [
        { medicineName: "Amlodipine 5mg", dosage: "5 mg", frequency: "Once daily", duration: "30 days" },
        { medicineName: "Atorvastatin 10mg", dosage: "10 mg", frequency: "Once at night", duration: "90 days" },
      ],
    },
    {
      patientId: patientIds[0],
      userId: doc1Id,
      type: "lab_report",
      title: "Lipid profile",
      description: "Fasting lipid panel.",
      diagnosis: null,
      doctor: "Dr. Anita Rao",
      hospital: "City Care Hospital",
      offsetDays: 80,
      meds: [],
    },
    {
      patientId: patientIds[1],
      userId: doc2Id,
      type: "prescription",
      title: "Treatment for mild anemia",
      description: "Diet review and iron supplementation.",
      diagnosis: "Iron deficiency anemia",
      doctor: "Dr. Kiran Menon",
      hospital: "Sunrise Multispecialty",
      offsetDays: 5,
      meds: [
        { medicineName: "Ferrous sulfate", dosage: "325 mg", frequency: "Once daily with vitamin C", duration: "60 days" },
      ],
    },
    {
      patientId: patientIds[2],
      userId: doc2Id,
      type: "discharge_summary",
      title: "Post dengue recovery",
      description: "Discharged after 4 days of observation.",
      diagnosis: "Dengue fever, recovered",
      doctor: "Dr. Kiran Menon",
      hospital: "Sunrise Multispecialty",
      offsetDays: 30,
      meds: [],
    },
  ];

  for (const s of samples) {
    const existing = await pool.query(
      "SELECT 1 FROM medical_records WHERE patient_id = $1 AND title = $2",
      [s.patientId, s.title]
    );
    if (existing.rows.length > 0) continue;

    const recordDate = new Date(Date.now() - s.offsetDays * 24 * 60 * 60 * 1000);
    const { rows } = await pool.query(
      `INSERT INTO medical_records
         (patient_id, user_id, record_type, title, description, diagnosis, doctor_name, hospital_name, record_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [s.patientId, s.userId, s.type, s.title, s.description, s.diagnosis, s.doctor, s.hospital, recordDate]
    );

    for (const m of s.meds) {
      await pool.query(
        `INSERT INTO medications (patient_id, medicine_name, dosage, frequency, duration, prescribed_by, start_date, end_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [s.patientId, m.medicineName, m.dosage, m.frequency, m.duration, s.doctor, recordDate, new Date(recordDate.getTime() + 30 * 24 * 60 * 60 * 1000)]
      );
    }
  }
  console.log("Sample medical records and medications ready.");

  const apptDefs = [
    { patientId: patientIds[0], doctorId: doc1RowId, hospitalId: cityCare, offset: 3, reason: "Blood pressure review", status: "scheduled" },
    { patientId: patientIds[1], doctorId: doc2RowId, hospitalId: sunrise, offset: 7, reason: "Anemia follow-up", status: "confirmed" },
    { patientId: patientIds[2], doctorId: doc1RowId, hospitalId: cityCare, offset: -10, reason: "General checkup", status: "completed" },
  ];

  for (const a of apptDefs) {
    const existing = await pool.query(
      "SELECT 1 FROM appointments WHERE patient_id = $1 AND reason = $2",
      [a.patientId, a.reason]
    );
    if (existing.rows.length > 0) continue;
    const date = new Date(Date.now() + a.offset * 24 * 60 * 60 * 1000);
    await pool.query(
      `INSERT INTO appointments (patient_id, doctor_id, hospital_id, appointment_date, appointment_time, reason, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [a.patientId, a.doctorId, a.hospitalId, date.toISOString().slice(0, 10), "10:00", a.reason, a.status]
    );
  }
  console.log("Sample appointments ready.");

  for (const s of samples.filter((x) => x.meds.length > 0)) {
    const existing = await pool.query(
      "SELECT 1 FROM prescriptions WHERE patient_id = $1 AND diagnosis = $2",
      [s.patientId, s.diagnosis || s.title]
    );
    if (existing.rows.length > 0) continue;

    const date = new Date(Date.now() - s.offsetDays * 24 * 60 * 60 * 1000);
    const { rows } = await pool.query(
      `INSERT INTO prescriptions (patient_id, doctor_id, diagnosis, notes, prescription_date)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [s.patientId, s.userId, s.diagnosis || "General", "Development seed prescription.", date]
    );
    for (const m of s.meds) {
      await pool.query(
        `INSERT INTO prescription_items (prescription_id, medicine_name, dosage, frequency, duration)
         VALUES ($1, $2, $3, $4, $5)`,
        [rows[0].id, m.medicineName, m.dosage, m.frequency, m.duration]
      );
    }
  }
  console.log("Sample prescriptions ready.");

  console.log("========================================");
  console.log("  DEVELOPMENT / TEST LOGIN CREDENTIALS");
  console.log("    superadmin@medicard.test / Super@1234");
  console.log("    admin@medicard.test  / Admin@123");
  console.log("    dev.doctor1@medicard.test / Doctor@123");
  console.log("    dev.doctor2@medicard.test / Doctor@123");
  console.log("    dev.patient1@medicard.test / Patient@123");
  console.log("    dev.patient2@medicard.test / Patient@123");
  console.log("    dev.patient3@medicard.test / Patient@123");
  console.log("    dev.pharmacy@medicard.test / Pharmacy@123");
  console.log("    dev.lab@medicard.test / Lab@123");
  console.log("========================================");

  await pool.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});