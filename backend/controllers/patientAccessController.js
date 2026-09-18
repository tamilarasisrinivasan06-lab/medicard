const dp = require("../db/queries/doctorPortal");
const patients = require("../db/queries/patients");
const notifications = require("../db/queries/notifications");
const { audit } = require("../services/auditService");

function isValidId(value) {
  return Number.isInteger(Number(value)) && Number(value) > 0;
}

async function getOwnPatient(req, res, next) {
  try {
    const patient = await patients.getPatientByUserId(req.user.id);
    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient profile not found" });
    }
    return patient;
  } catch (error) {
    return next(error);
  }
}

async function listDoctorAccess(req, res, next) {
  try {
    const { status } = req.query;
    const valid = dp.ACCESS_STATUSES.includes(status);
    const data = await dp.listAccessByPatient(req.user.id, valid ? status : null);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function getDoctorAccess(req, res, next) {
  try {
    const { accessId } = req.params;
    if (!isValidId(accessId)) {
      return res.status(400).json({ success: false, message: "Invalid access request ID" });
    }
    const access = await dp.getAccessById(Number(accessId));
    if (!access) {
      return res.status(404).json({ success: false, message: "Access request not found" });
    }
    const patient = await patients.getPatientByUserId(req.user.id);
    if (!patient || patient.id !== access.patientId) {
      return res.status(403).json({ success: false, message: "You are not authorized to view this request" });
    }
    return res.json({ success: true, data: access });
  } catch (error) {
    return next(error);
  }
}

async function decideDoctorAccess(req, res, next) {
  try {
    const { accessId } = req.params;
    const decision = req.body.decision || req.params.decision;
    if (!isValidId(accessId)) {
      return res.status(400).json({ success: false, message: "Invalid access request ID" });
    }
    if (!["accept", "reject"].includes(decision)) {
      return res.status(400).json({ success: false, message: "Decision must be accept or reject" });
    }

    const patient = await patients.getPatientByUserId(req.user.id);
    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient profile not found" });
    }

    const access = await dp.getAccessById(Number(accessId));
    if (!access || access.patientId !== patient.id) {
      return res.status(404).json({ success: false, message: "Access request not found" });
    }
    if (access.status !== "pending") {
      return res.status(409).json({ success: false, message: `This request is already ${access.status}` });
    }

    const status = decision === "accept" ? "accepted" : "rejected";
    const updated = await dp.updateAccessStatus(access.id, status);

    await notifications.createNotification({
      userId: access.doctorId,
      type: "access_response",
      title: status === "accepted"
        ? `${patient.name || "A patient"} approved your access request`
        : `${patient.name || "A patient"} declined your access request`,
      body: status === "accepted"
        ? `You can now view ${patient.name || "this patient"}'s records. Access expires per policy.`
        : "The patient did not grant access to their records.",
      link: "/doctor/dashboard",
    });
    await audit(req, status === "accepted" ? "access_approved" : "access_rejected", "patient_access", access.id, {
      doctorId: access.doctorId,
    });

    return res.json({
      success: true,
      message: status === "accepted" ? "Access approved. The doctor can now view your records." : "Access request declined.",
      data: updated,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { listDoctorAccess, getDoctorAccess, decideDoctorAccess };