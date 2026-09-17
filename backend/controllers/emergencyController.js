const contacts = require("../db/queries/emergencyContacts");
const { getOwnPatientId } = require("./recordController");

function isValidId(value) {
  return Number.isInteger(Number(value)) && Number(value) > 0;
}

async function listContacts(req, res, next) {
  try {
    const patientId = await getOwnPatientId(req.user.id);
    if (!patientId) return res.status(404).json({ success: false, message: "Profile not found" });
    const data = await contacts.listEmergencyContacts(patientId);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function createContact(req, res, next) {
  try {
    const patientId = await getOwnPatientId(req.user.id);
    if (!patientId) return res.status(404).json({ success: false, message: "Profile not found" });

    const { name } = req.body;
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Contact name is required" });
    }

    const data = await contacts.createEmergencyContact(patientId, req.body);
    return res.status(201).json({ success: true, message: "Emergency contact added", data });
  } catch (error) {
    return next(error);
  }
}

async function updateContact(req, res, next) {
  try {
    const { contactId } = req.params;
    if (!isValidId(contactId)) return res.status(400).json({ success: false, message: "Invalid contact ID" });
    const item = await contacts.getEmergencyContactById(Number(contactId));
    if (!item) return res.status(404).json({ success: false, message: "Emergency contact not found" });

    const own = await getOwnPatientId(req.user.id);
    if (item.patientId !== own) return res.status(403).json({ success: false, message: "You are not authorized to edit this contact" });

    const data = await contacts.updateEmergencyContact(item.id, req.body);
    return res.json({ success: true, message: "Emergency contact updated", data });
  } catch (error) {
    return next(error);
  }
}

async function deleteContact(req, res, next) {
  try {
    const { contactId } = req.params;
    if (!isValidId(contactId)) return res.status(400).json({ success: false, message: "Invalid contact ID" });
    const item = await contacts.getEmergencyContactById(Number(contactId));
    if (!item) return res.status(404).json({ success: false, message: "Emergency contact not found" });

    const own = await getOwnPatientId(req.user.id);
    if (item.patientId !== own) return res.status(403).json({ success: false, message: "You are not authorized to delete this contact" });

    await contacts.deleteEmergencyContact(item.id);
    return res.json({ success: true, message: "Emergency contact removed" });
  } catch (error) {
    return next(error);
  }
}

module.exports = { listContacts, createContact, updateContact, deleteContact };