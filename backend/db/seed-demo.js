require("dotenv").config();
const bcrypt = require("bcryptjs");
const pool = require("./pool");
const users = require("./queries/users");
const patients = require("./queries/patients");
const doctors = require("./queries/doctors");

const DEMO_EMAILS = {};
const BCRYPT_ROUNDS = 10;

const DEMO_ACCOUNTS = [
  // ---------------- Doctors ----------------
  { fullName: "Arjun Kumar", email: "arjun.kumar@example.com", password: "Arjun@123", role: "doctor", phone: "+919000000101", specialization: "Cardiology", qualification: "MD, DM Cardiology", registrationNumber: "MC-DEMO-DOC-001", experience: 12 },
  { fullName: "Kavya Priya", email: "kavya.priya@example.com", password: "Kavya@123", role: "doctor", phone: "+919000000102", specialization: "Dermatology", qualification: "MD Dermatology", registrationNumber: "MC-DEMO-DOC-002", experience: 8 },
  { fullName: "Mansi Devi", email: "mansi.devi@example.com", password: "Mansi@123", role: "doctor", phone: "+919000000103", specialization: "Endocrinology", qualification: "MD Endocrinology", registrationNumber: "MC-DEMO-DOC-003", experience: 10 },
  { fullName: "Suresh Kumar", email: "suresh.kumar@example.com", password: "Suresh@123", role: "doctor", phone: "+919000000104", specialization: "General Medicine", qualification: "MBBS, MD", registrationNumber: "MC-DEMO-DOC-004", experience: 15 },
  { fullName: "Nithya Raj", email: "nithya.raj@example.com", password: "Nithya@123", role: "doctor", phone: "+919000000105", specialization: "Pediatrics", qualification: "MBBS, DCH", registrationNumber: "MC-DEMO-DOC-005", experience: 6 },

  // ---------------- Patients ----------------
  { fullName: "Tamil Selvan", email: "tamil.selvan@example.com", password: "Tamil@123", role: "patient", phone: "+919000000201" },
  { fullName: "Dileep Kumar", email: "dileep.kumar@example.com", password: "Dileep@123", role: "patient", phone: "+919000000202" },
  { fullName: "Priya Devi", email: "priya.devi@example.com", password: "Priya@123", role: "patient", phone: "+919000000203" },
  { fullName: "Karthik Raj", email: "karthik.raj@example.com", password: "Karthik@123", role: "patient", phone: "+919000000204" },
  { fullName: "Anitha", email: "anitha@example.com", password: "Anitha@123", role: "patient", phone: "+919000000205" },
  { fullName: "Vignesh Kumar", email: "vignesh.kumar@example.com", password: "Vignesh@123", role: "patient", phone: "+919000000206" },
  { fullName: "Harini", email: "harini@example.com", password: "Harini@123", role: "patient", phone: "+919000000207" },
  { fullName: "Santhosh", email: "santhosh@example.com", password: "Santhosh@123", role: "patient", phone: "+919000000208" },
  { fullName: "Keerthana", email: "keerthana@example.com", password: "Keerthana@123", role: "patient", phone: "+919000000209" },
  { fullName: "Praveen Kumar", email: "praveen.kumar@example.com", password: "Praveen@123", role: "patient", phone: "+919000000210" },

  // ---------------- Pharmacies (role: pharmacist) ----------------
  { fullName: "Sri Lakshmi Pharmacy", email: "sri.lakshmi.pharmacy@example.com", password: "SriLakshmi@123", role: "pharmacist", phone: "+919000000301" },
  { fullName: "Kumar Medicals", email: "kumar.medicals@example.com", password: "Kumar@123", role: "pharmacist", phone: "+919000000302" },
  { fullName: "Aruna Pharmacy", email: "aruna.pharmacy@example.com", password: "Aruna@123", role: "pharmacist", phone: "+919000000303" },
  { fullName: "Vasanth Medicals", email: "vasanth.medicals@example.com", password: "Vasanth@123", role: "pharmacist", phone: "+919000000304" },
  { fullName: "Chennai Care Pharmacy", email: "chennai.care.pharmacy@example.com", password: "ChennaiCare@123", role: "pharmacist", phone: "+919000000305" },

  // ---------------- Lab Technicians (role: diagnostic_staff) ----------------
  { fullName: "Rahul Kumar", email: "rahul.lab@example.com", password: "Rahul@123", role: "diagnostic_staff", phone: "+919000000401" },
  { fullName: "Meena Devi", email: "meena.lab@example.com", password: "Meena@123", role: "diagnostic_staff", phone: "+919000000402" },
  { fullName: "Siva Kumar", email: "siva.lab@example.com", password: "Siva@123", role: "diagnostic_staff", phone: "+919000000403" },
  { fullName: "Deepa Raj", email: "deepa.lab@example.com", password: "Deepa@123", role: "diagnostic_staff", phone: "+919000000404" },
  { fullName: "Naveen Kumar", email: "naveen.lab@example.com", password: "Naveen@123", role: "diagnostic_staff", phone: "+919000000405" },

  // ---------------- Super Admin ----------------
  { fullName: "MediCard Super Admin", email: "superadmin@medicard.example.com", password: "SuperAdmin@123", role: "super_admin", phone: "+919000000500" },
];

async function ensureAccount(acct) {
  const email = acct.email.trim().toLowerCase();

  const existing = await users.findUserByEmail(email);
  if (existing) {
    if (existing.role === acct.role) {
      return { status: "exists", email, role: acct.role, userId: existing.id, fullName: existing.full_name };
    }
    return {
      status: "conflict",
      email,
      role: acct.role,
      existingRole: existing.role,
      userId: existing.id,
      fullName: existing.full_name,
    };
  }

  const passwordHash = await bcrypt.hash(acct.password, BCRYPT_ROUNDS);

  const client = await pool.connect();
  let createdUser;
  let profile = null;
  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [acct.fullName, email, acct.phone || null, passwordHash, acct.role]
    );
    createdUser = rows[0];

    if (acct.role === "patient") {
      profile = await patients.createPatientProfile(createdUser.id, { client });
    } else if (acct.role === "doctor") {
      profile = await doctors.createDoctor(
        createdUser.id,
        {
          specialization: acct.specialization || null,
          qualification: acct.qualification || null,
          registrationNumber: acct.registrationNumber || null,
          experience: acct.experience ?? null,
        },
        client
      );
    }

    await client.query("COMMIT");
    return { status: "created", email, role: acct.role, userId: Number(createdUser.id), fullName: acct.fullName, profile };
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.code === "23505" && ["users_email_key", "users_email_lower_key"].includes(err.constraint)) {
      return { status: "exists_race", email, role: acct.role };
    }
    throw err;
  } finally {
    client.release();
  }
}

async function seedDemo() {
  console.log("================================================");
  console.log("  MediCard DEMO / TEST ACCOUNT SEED");
  console.log(`  (${DEMO_ACCOUNTS.length} accounts, bcrypt rounds=${BCRYPT_ROUNDS})`);
  console.log("================================================");

  const summary = { created: [], exists: [], conflict: [], errors: [] };

  for (const acct of DEMO_ACCOUNTS) {
    const result = await ensureAccount(acct);
    if (result.status === "created" || result.status === "exists_race") {
      summary.created.push({ email: result.email, role: acct.role });
      console.log(`CREATED  ${acct.role.padEnd(15)} ${result.email.padEnd(38)} ${acct.fullName}`);
    } else if (result.status === "exists") {
      summary.exists.push({ email: result.email, role: acct.role });
      console.log(`EXISTS   ${acct.role.padEnd(15)} ${result.email.padEnd(38)} (skipped, no changes)`);
    } else if (result.status === "conflict") {
      summary.conflict.push(result);
      console.log(`CONFLICT ${acct.role.padEnd(15)} ${result.email.padEnd(38)} -> existing role=${result.existingRole} (skipped)`);
    }
  }

  console.log("\n================================================");
  console.log(`SUMMARY  created=${summary.created.length}  already-existed=${summary.exists.length}  conflicts=${summary.conflict.length}`);
  for (const c of summary.conflict) {
    console.log(`  ! ${c.email} is role '${c.existingRole}', demo wants '${c.role}'. Role NOT changed.`);
  }
  console.log("================================================");

  await pool.end();
  return summary;
}

seedDemo().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

module.exports = { DEMO_ACCOUNTS, ensureAccount, seedDemo };