const pharmacy = require("../db/queries/pharmacy");
const patients = require("../db/queries/patients");
const notifications = require("../db/queries/notifications");
const { getStaffHospitalId } = require("../db/queries/staff");
const { audit } = require("../services/auditService");

function isValidId(value) {
  return Number.isInteger(Number(value)) && Number(value) > 0;
}

async function getDashboard(req, res, next) {
  try {
    const hospitalId = await getStaffHospitalId(req.user.id);
    const data = await pharmacy.getPharmacyDashboard(hospitalId);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function listPrescriptions(req, res, next) {
  try {
    const { status } = req.query;
    const hospitalId = await getStaffHospitalId(req.user.id);
    const valid = pharmacy.PRESCRIPTION_STATUSES.includes(status);
    const data = await pharmacy.listPrescriptions({ status: valid ? status : null, hospitalId });
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function getPrescription(req, res, next) {
  try {
    const { prescriptionId } = req.params;
    if (!isValidId(prescriptionId)) {
      return res.status(400).json({ success: false, message: "Invalid prescription ID" });
    }
    const hospitalId = await getStaffHospitalId(req.user.id);
    const data = await pharmacy.getPrescriptionById(Number(prescriptionId), hospitalId);
    if (!data) {
      return res.status(404).json({ success: false, message: "Prescription not found" });
    }
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function dispensePrescription(req, res, next) {
  try {
    const { prescriptionId } = req.params;
    if (!isValidId(prescriptionId)) {
      return res.status(400).json({ success: false, message: "Invalid prescription ID" });
    }
    const hospitalId = await getStaffHospitalId(req.user.id);
    const existing = await pharmacy.getPrescriptionById(Number(prescriptionId), hospitalId);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Prescription not found" });
    }
    if (existing.status !== "pending") {
      return res.status(409).json({ success: false, message: `Prescription is already ${existing.status}` });
    }

    const data = await pharmacy.dispensePrescription(Number(prescriptionId), req.user.id, hospitalId);
    if (!data) {
      return res.status(409).json({ success: false, message: "Prescription could not be dispensed" });
    }

    const patient = await patients.getPatientById(existing.patientId);
    if (patient && patient.userId) {
      await notifications.createNotification({
        userId: patient.userId,
        type: "prescription_dispensed",
        title: `Your prescription was dispensed`,
        body: data.diagnosis || "Medicines are ready for collection.",
        link: "/patient/medications",
      });
    }
    await audit(req, "prescription_dispensed", "prescription", data.id, { patientId: existing.patientId });
    return res.json({ success: true, message: "Prescription dispensed", data });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getDashboard,
  listPrescriptions,
  getPrescription,
  dispensePrescription,
};
