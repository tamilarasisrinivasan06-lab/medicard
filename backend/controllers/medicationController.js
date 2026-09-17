const medications = require("../db/queries/medications");
const patients = require("../db/queries/patients");
const { getOwnPatientId } = require("./recordController");

function isValidId(value) {
  return Number.isInteger(Number(value)) && Number(value) > 0;
}

async function resolvePatientId(req) {
  if (req.user.role === "patient") {
    return getOwnPatientId(req.user.id);
  }
  if (req.user.role === "doctor" && req.access) {
    return req.access.grant.patientId;
  }
  return null;
}

function assertPatientAccess(req, patientId) {
  if (req.user.role === "doctor" && req.access.grant.patientId !== patientId) {
    const error = new Error("You are not authorized to access this patient");
    error.expose = true;
    error.status = 403;
    throw error;
  }
}

async function listMyMedications(req, res, next) {
  try {
    const patientId = await getOwnPatientId(req.user.id);
    if (!patientId) return res.status(404).json({ success: false, message: "Profile not found" });
    const data = await medications.listMedications(patientId);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function createMedication(req, res, next) {
  try {
    const { patientId } = req.body;
    if (!isValidId(patientId)) return res.status(400).json({ success: false, message: "Valid patientId is required" });
    const patient = await patients.getPatientById(Number(patientId));
    if (!patient) return res.status(404).json({ success: false, message: "Patient not found" });

    if (req.user.role === "doctor") {
      assertPatientAccess(req, patient.id);
    } else if (req.user.role === "patient") {
      const own = await getOwnPatientId(req.user.id);
      if (own !== patient.id) {
        return res.status(403).json({ success: false, message: "You are not authorized to access this patient" });
      }
    } else {
      return res.status(403).json({ success: false, message: "Access denied: insufficient permissions" });
    }

    const { medicineName } = req.body;
    if (!medicineName || typeof medicineName !== "string" || medicineName.trim().length === 0) {
      return res.status(400).json({ success: false, message: "medicineName is required" });
    }

    const data = await medications.createMedication(patient.id, req.body);
    return res.status(201).json({ success: true, message: "Medication added", data });
  } catch (error) {
    return next(error);
  }
}

async function updateMedication(req, res, next) {
  try {
    const { medicationId } = req.params;
    if (!isValidId(medicationId)) return res.status(400).json({ success: false, message: "Invalid medication ID" });
    const item = await medications.getMedicationById(Number(medicationId));
    if (!item) return res.status(404).json({ success: false, message: "Medication not found" });

    const allowed = req.user.role === "patient" || req.user.role === "admin";
    if (req.user.role === "patient") {
      const own = await getOwnPatientId(req.user.id);
      if (own !== item.patientId) return res.status(403).json({ success: false, message: "You are not authorized to edit this medication" });
    } else if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied: insufficient permissions" });
    }

    if (!allowed) return res.status(403).json({ success: false, message: "Access denied: insufficient permissions" });

    const { medicineName } = req.body;
    if (medicineName !== undefined && (typeof medicineName !== "string" || medicineName.trim().length === 0)) {
      return res.status(400).json({ success: false, message: "medicineName cannot be empty" });
    }

    const data = await medications.updateMedication(item.id, req.body);
    return res.json({ success: true, message: "Medication updated", data });
  } catch (error) {
    return next(error);
  }
}

async function deleteMedication(req, res, next) {
  try {
    const { medicationId } = req.params;
    if (!isValidId(medicationId)) return res.status(400).json({ success: false, message: "Invalid medication ID" });
    const item = await medications.getMedicationById(Number(medicationId));
    if (!item) return res.status(404).json({ success: false, message: "Medication not found" });

    if (req.user.role === "patient") {
      const own = await getOwnPatientId(req.user.id);
      if (own !== item.patientId) return res.status(403).json({ success: false, message: "You are not authorized to delete this medication" });
    } else if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied: insufficient permissions" });
    }

    await medications.deleteMedication(item.id);
    return res.json({ success: true, message: "Medication removed" });
  } catch (error) {
    return next(error);
  }
}

module.exports = { listMyMedications, createMedication, updateMedication, deleteMedication, resolvePatientId };