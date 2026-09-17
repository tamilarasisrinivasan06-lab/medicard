const prescriptions = require("../db/queries/prescriptions");
const patients = require("../db/queries/patients");
const { getOwnPatientId } = require("./recordController");

function isValidId(value) {
  return Number.isInteger(Number(value)) && Number(value) > 0;
}

function validateDate(value, label) {
  if (!value || Number.isNaN(new Date(value).getTime())) {
    return `${label} is required`;
  }
  return null;
}

async function createPrescription(req, res, next) {
  try {
    const { patientId, appointmentId, diagnosis, notes, prescriptionDate, items } = req.body;

    if (!isValidId(patientId)) return res.status(400).json({ success: false, message: "Valid patientId is required" });
    const patient = await patients.getPatientById(Number(patientId));
    if (!patient) return res.status(404).json({ success: false, message: "Patient not found" });
    if (req.user.role === "doctor") {
      if (req.access.grant.patientId !== patient.id) {
        return res.status(403).json({ success: false, message: "You are not authorized to access this patient" });
      }
    } else if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied: insufficient permissions" });
    }

    const dateError = validateDate(prescriptionDate, "prescriptionDate");
    if (dateError) return res.status(400).json({ success: false, message: dateError });

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "At least one prescription item is required" });
    }
    for (const item of items) {
      if (!item.medicineName || typeof item.medicineName !== "string" || item.medicineName.trim().length === 0) {
        return res.status(400).json({ success: false, message: "Each item needs a medicineName" });
      }
    }

    const data = await prescriptions.createPrescription({
      patientId: patient.id,
      doctorId: req.user.role === "doctor" ? req.user.id : null,
      appointmentId: appointmentId && isValidId(appointmentId) ? Number(appointmentId) : null,
      diagnosis,
      notes,
      prescriptionDate: new Date(prescriptionDate),
      items,
    });

    return res.status(201).json({ success: true, message: "Prescription created", data });
  } catch (error) {
    return next(error);
  }
}

async function listMyPrescriptions(req, res, next) {
  try {
    const patientId = await getOwnPatientId(req.user.id);
    if (!patientId) return res.status(404).json({ success: false, message: "Profile not found" });
    const data = await prescriptions.listPrescriptionsByPatient(patientId);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function listDoctorPrescriptions(req, res, next) {
  try {
    const data = await prescriptions.listPrescriptionsByDoctor(req.user.id);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function getPrescription(req, res, next) {
  try {
    const { prescriptionId } = req.params;
    if (!isValidId(prescriptionId)) return res.status(400).json({ success: false, message: "Invalid prescription ID" });
    const prescription = await prescriptions.getPrescriptionById(Number(prescriptionId));
    if (!prescription) return res.status(404).json({ success: false, message: "Prescription not found" });

    if (req.user.role === "patient") {
      const own = await getOwnPatientId(req.user.id);
      if (prescription.patientId !== own) {
        return res.status(403).json({ success: false, message: "You are not authorized to access this prescription" });
      }
    } else if (req.user.role === "doctor") {
      if (req.access.grant.patientId !== prescription.patientId) {
        return res.status(403).json({ success: false, message: "You are not authorized to access this prescription" });
      }
    } else if (!["admin"].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Access denied: insufficient permissions" });
    }

    return res.json({ success: true, data: prescription });
  } catch (error) {
    return next(error);
  }
}

module.exports = { createPrescription, listMyPrescriptions, listDoctorPrescriptions, getPrescription };