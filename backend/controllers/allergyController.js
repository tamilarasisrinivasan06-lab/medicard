const allergies = require("../db/queries/allergies");
const { getOwnPatientId } = require("./recordController");

const SEVERITIES = ["mild", "moderate", "severe"];

function isValidId(value) {
  return Number.isInteger(Number(value)) && Number(value) > 0;
}

async function listAllergies(req, res, next) {
  try {
    const patientId = await getOwnPatientId(req.user.id);
    if (!patientId) return res.status(404).json({ success: false, message: "Profile not found" });
    const data = await allergies.listAllergies(patientId);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function createAllergy(req, res, next) {
  try {
    const patientId = await getOwnPatientId(req.user.id);
    if (!patientId) return res.status(404).json({ success: false, message: "Profile not found" });

    const { allergen, severity } = req.body;
    if (!allergen || typeof allergen !== "string" || allergen.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Allergen is required" });
    }
    if (severity && !SEVERITIES.includes(severity)) {
      return res.status(400).json({ success: false, message: "Severity must be mild, moderate or severe" });
    }

    const data = await allergies.createAllergy(patientId, req.body);
    return res.status(201).json({ success: true, message: "Allergy added", data });
  } catch (error) {
    return next(error);
  }
}

async function updateAllergy(req, res, next) {
  try {
    const { allergyId } = req.params;
    if (!isValidId(allergyId)) return res.status(400).json({ success: false, message: "Invalid allergy ID" });
    const item = await allergies.getAllergyById(Number(allergyId));
    if (!item) return res.status(404).json({ success: false, message: "Allergy not found" });

    const own = await getOwnPatientId(req.user.id);
    if (item.patientId !== own) return res.status(403).json({ success: false, message: "You are not authorized to edit this allergy" });

    const { severity } = req.body;
    if (severity && !SEVERITIES.includes(severity)) {
      return res.status(400).json({ success: false, message: "Severity must be mild, moderate or severe" });
    }

    const data = await allergies.updateAllergy(item.id, req.body);
    return res.json({ success: true, message: "Allergy updated", data });
  } catch (error) {
    return next(error);
  }
}

async function deleteAllergy(req, res, next) {
  try {
    const { allergyId } = req.params;
    if (!isValidId(allergyId)) return res.status(400).json({ success: false, message: "Invalid allergy ID" });
    const item = await allergies.getAllergyById(Number(allergyId));
    if (!item) return res.status(404).json({ success: false, message: "Allergy not found" });

    const own = await getOwnPatientId(req.user.id);
    if (item.patientId !== own) return res.status(403).json({ success: false, message: "You are not authorized to delete this allergy" });

    await allergies.deleteAllergy(item.id);
    return res.json({ success: true, message: "Allergy removed" });
  } catch (error) {
    return next(error);
  }
}

module.exports = { listAllergies, createAllergy, updateAllergy, deleteAllergy };