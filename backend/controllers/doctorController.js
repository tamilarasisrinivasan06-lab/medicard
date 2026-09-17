const doctors = require("../db/queries/doctors");
const records = require("../db/queries/records");
const hospitals = require("../db/queries/hospitals");

function isValidId(value) {
  return Number.isInteger(Number(value)) && Number(value) > 0;
}

async function getDoctorStats(req, res, next) {
  try {
    const data = await records.getDoctorStats(req.user.id);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function getMyDoctorProfile(req, res, next) {
  try {
    const doctor = await doctors.getDoctorByUserId(req.user.id);
    if (!doctor) return res.status(404).json({ success: false, message: "Doctor profile not found" });
    return res.json({ success: true, data: doctor });
  } catch (error) {
    return next(error);
  }
}

async function updateMyDoctorProfile(req, res, next) {
  try {
    const { specialization, qualification, registrationNumber, experience, hospitalId, consultationFee } = req.body;

    if (experience !== undefined && (typeof experience !== "number" || experience < 0)) {
      return res.status(400).json({ success: false, message: "Experience must be a non-negative number" });
    }
    if (consultationFee !== undefined && (typeof consultationFee !== "number" || consultationFee < 0)) {
      return res.status(400).json({ success: false, message: "Consultation fee must be a non-negative number" });
    }
    if (hospitalId !== undefined && hospitalId !== null) {
      if (!isValidId(hospitalId)) return res.status(400).json({ success: false, message: "Invalid hospital" });
      const hospital = await hospitals.getHospitalById(Number(hospitalId));
      if (!hospital) return res.status(404).json({ success: false, message: "Hospital not found" });
    }

    const data = await doctors.updateDoctor(req.user.id, req.body);
    return res.json({ success: true, message: "Doctor profile updated", data });
  } catch (error) {
    return next(error);
  }
}

async function listDoctors(req, res, next) {
  try {
    const { specialization, hospitalId } = req.query;
    const params = {};
    if (specialization) params.specialization = specialization;
    if (hospitalId && isValidId(hospitalId)) params.hospitalId = Number(hospitalId);
    const data = await doctors.listDoctors(params);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function getDoctorById(req, res, next) {
  try {
    const { doctorId } = req.params;
    if (!isValidId(doctorId)) return res.status(400).json({ success: false, message: "Invalid doctor ID" });
    const doctor = await doctors.getDoctorById(Number(doctorId));
    if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found" });
    return res.json({ success: true, data: doctor });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getDoctorStats, getMyDoctorProfile, updateMyDoctorProfile, listDoctors, getDoctorById };