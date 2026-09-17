const users = require("../db/queries/users");
const patients = require("../db/queries/patients");
const records = require("../db/queries/records");
const medications = require("../db/queries/medications");
const appointments = require("../db/queries/appointments");
const allergiesQ = require("../db/queries/allergies");
const contactsQ = require("../db/queries/emergencyContacts");

async function getProfile(req, res, next) {
  try {
    const patient = await patients.getPatientByUserId(req.user.id);
    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient profile not found" });
    }
    return res.json({ success: true, data: patient });
  } catch (error) {
    return next(error);
  }
}

async function updateProfile(req, res, next) {
  try {
    const patient = await patients.getPatientByUserId(req.user.id);
    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient profile not found" });
    }

    const { bloodGroup, dateOfBirth, gender, height, weight, emergencyContactName, emergencyContactPhone, address, city, state, pincode } = req.body;

    if (typeof height === "number" && (height <= 0 || height > 300)) {
      return res.status(400).json({ success: false, message: "Height must be between 0 and 300 cm" });
    }
    if (typeof weight === "number" && (weight <= 0 || weight > 500)) {
      return res.status(400).json({ success: false, message: "Weight must be between 0 and 500 kg" });
    }

    await patients.updatePatientProfile(req.user.id, req.body);
    const updated = await patients.getPatientByUserId(req.user.id);

    if (dateOfBirth !== undefined || gender !== undefined) {
      await users.updateUser(req.user.id, { dateOfBirth, gender });
      updated.dateOfBirth = dateOfBirth ?? patient.dateOfBirth;
      updated.gender = gender ?? patient.gender;
    }

    return res.json({ success: true, message: "Profile updated", data: updated });
  } catch (error) {
    return next(error);
  }
}

async function getDashboard(req, res, next) {
  try {
    const patient = await patients.getPatientByUserId(req.user.id);
    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient profile not found" });
    }

    const [recentRecords, currentMedications, upcomingAppointments, allergies, emergencyContacts] = await Promise.all([
      records.listRecordsByPatient(patient.id),
      medications.listMedications(patient.id),
      appointments.listAppointmentsByPatient(patient.id),
      allergiesQ.listAllergies(patient.id),
      contactsQ.listEmergencyContacts(patient.id),
    ]);

    return res.json({
      success: true,
      data: {
        profile: patient,
        recentRecords: recentRecords.slice(0, 5),
        recordCount: recentRecords.length,
        medications: currentMedications.filter(
          (m) => !m.endDate || new Date(m.endDate) >= new Date(new Date().toISOString().slice(0, 10))
        ),
        medicationCount: currentMedications.length,
        appointments: upcomingAppointments.filter((a) => a.status !== "cancelled"),
        allergies,
        emergencyContacts,
      },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getProfile, updateProfile, getDashboard };