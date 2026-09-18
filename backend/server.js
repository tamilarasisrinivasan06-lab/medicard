require("dotenv").config();

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is not defined in environment variables. Add it to backend/.env");
  process.exit(1);
}

const express = require("express");
const cors = require("cors");
const pool = require("./db/pool");
const { getDBStatus, setDBStatus } = require("./db/status");

const authRoutes = require("./routes/authRoutes");
const medicardRoutes = require("./routes/medicardRoutes");
const patientRoutes = require("./routes/patientRoutes");
const medicalRecordRoutes = require("./routes/medicalRecordRoutes");
const medicationRoutes = require("./routes/medicationRoutes");
const allergyRoutes = require("./routes/allergyRoutes");
const emergencyContactRoutes = require("./routes/emergencyContactRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
const hospitalRoutes = require("./routes/hospitalRoutes");
const prescriptionRoutes = require("./routes/prescriptionRoutes");
const fileRoutes = require("./routes/fileRoutes");
const doctorPortalRoutes = require("./routes/doctorPortalRoutes");
const patientAccessRoutes = require("./routes/patientAccessRoutes");
const patientPortalRoutes = require("./routes/patientPortalRoutes");
const pharmacyRoutes = require("./routes/pharmacyRoutes");
const labPortalRoutes = require("./routes/labPortalRoutes");
const adminRoutes = require("./routes/adminRoutes");
const superAdminRoutes = require("./routes/superAdminRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

async function probeDatabase() {
  try {
    await pool.query("SELECT 1");
    setDBStatus(true);
  } catch {
    setDBStatus(false);
  }
}

setInterval(probeDatabase, 30000);

app.get("/api/health", async (req, res) => {
  await probeDatabase();
  const database = getDBStatus();

  if (database === "connected") {
    res.json({
      success: true,
      message: "MediCard backend is running",
      database,
    });
  } else {
    res.status(503).json({
      success: false,
      message: "Database connection unavailable",
      database,
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/medicard", medicardRoutes);
app.use("/api/patient", patientRoutes);
app.use("/api/medical-records", medicalRecordRoutes);
app.use("/api/medications", medicationRoutes);
app.use("/api/allergies", allergyRoutes);
app.use("/api/emergency-contacts", emergencyContactRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/hospitals", hospitalRoutes);
app.use("/api/prescriptions", prescriptionRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/doctor-portal", doctorPortalRoutes);
app.use("/api/patient/access", patientAccessRoutes);
app.use("/api/patient-portal", patientPortalRoutes);
app.use("/api/pharmacy", pharmacyRoutes);
app.use("/api/lab-portal", labPortalRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/super-admin", superAdminRoutes);

app.use("/api", (req, res) => {
  res.status(404).json({ success: false, message: "API endpoint not found" });
});

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err.expose && err.status) {
    return res.status(err.status).json({ success: false, message: err.message });
  }

  if (err.code === "22P02" || err.code === "23514") {
    return res.status(400).json({ success: false, message: "Invalid request data" });
  }
  if (err.code === "23505") {
    return res.status(409).json({ success: false, message: "A record with this value already exists" });
  }
  if (err.code === "23503") {
    return res.status(400).json({ success: false, message: "Related record does not exist" });
  }
  if (err.code === "ECONNREFUSED" || err.code === "ECONNRESET" || err.code === "ETIMEDOUT" || err.code === "EPIPE" || err.code === "57P03" || /connection|database|reset|timeout|pool/i.test(err.message || "")) {
    return res.status(503).json({ success: false, message: "Database connection unavailable" });
  }
  if (err.message && /jwt/i.test(err.message)) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ success: false, message: "Uploaded file is too large" });
  }

  console.error("Unhandled error:", err.message);
  return res.status(500).json({ success: false, message: "Internal server error" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not defined. Backend started without a database connection.");
    console.error("Set it in backend/.env and run: npm run db:setup");
  } else {
    await probeDatabase();
    console.log(`Database status: ${getDBStatus()}`);
  }
  console.log(`MediCard backend running on http://localhost:${PORT}`);
});