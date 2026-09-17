const hospitals = require("../db/queries/hospitals");

function isValidId(value) {
  return Number.isInteger(Number(value)) && Number(value) > 0;
}

async function listHospitals(req, res, next) {
  try {
    const data = await hospitals.listHospitals();
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function createHospital(req, res, next) {
  try {
    const { name } = req.body;
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Hospital name is required" });
    }
    const data = await hospitals.createHospital(req.body);
    return res.status(201).json({ success: true, message: "Hospital created", data });
  } catch (error) {
    return next(error);
  }
}

async function updateHospital(req, res, next) {
  try {
    const { hospitalId } = req.params;
    if (!isValidId(hospitalId)) return res.status(400).json({ success: false, message: "Invalid hospital ID" });
    const existing = await hospitals.getHospitalById(Number(hospitalId));
    if (!existing) return res.status(404).json({ success: false, message: "Hospital not found" });

    const { name } = req.body;
    if (name !== undefined && (typeof name !== "string" || name.trim().length === 0)) {
      return res.status(400).json({ success: false, message: "Hospital name cannot be empty" });
    }

    const data = await hospitals.updateHospital(existing.id, req.body);
    return res.json({ success: true, message: "Hospital updated", data });
  } catch (error) {
    return next(error);
  }
}

async function deleteHospital(req, res, next) {
  try {
    const { hospitalId } = req.params;
    if (!isValidId(hospitalId)) return res.status(400).json({ success: false, message: "Invalid hospital ID" });
    const existing = await hospitals.getHospitalById(Number(hospitalId));
    if (!existing) return res.status(404).json({ success: false, message: "Hospital not found" });

    await hospitals.deleteHospital(existing.id);
    return res.json({ success: true, message: "Hospital deleted" });
  } catch (error) {
    return next(error);
  }
}

module.exports = { listHospitals, createHospital, updateHospital, deleteHospital };