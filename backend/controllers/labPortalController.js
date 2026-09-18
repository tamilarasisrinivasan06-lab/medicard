const lab = require("../db/queries/labPortal");
const patients = require("../db/queries/patients");
const notifications = require("../db/queries/notifications");
const { getStaffHospitalId } = require("../db/queries/staff");
const { audit } = require("../services/auditService");

function isValidId(value) {
  return Number.isInteger(Number(value)) && Number(value) > 0;
}

function isValidDate(value) {
  return !!value && !Number.isNaN(new Date(value).getTime());
}

function sanitizeFileUrl(value) {
  if (value === undefined || value === null) return { ok: true, value: undefined };
  if (typeof value !== "string") return { ok: false };
  const trimmed = value.trim();
  if (!trimmed) return { ok: true, value: undefined };
  if (trimmed.startsWith("/api/files/") || /^https?:\/\//i.test(trimmed)) {
    return { ok: true, value: trimmed };
  }
  return { ok: false };
}

async function getDashboard(req, res, next) {
  try {
    const hospitalId = await getStaffHospitalId(req.user.id);
    const data = await lab.getLabDashboard(hospitalId);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function listRequests(req, res, next) {
  try {
    const { status } = req.query;
    const hospitalId = await getStaffHospitalId(req.user.id);
    const valid = lab.LAB_REQUEST_STATUSES.includes(status);
    const data = await lab.listLabRequests({ status: valid ? status : null, hospitalId });
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function updateRequestStatus(req, res, next) {
  try {
    const { labRequestId } = req.params;
    const { status } = req.body;
    if (!isValidId(labRequestId)) {
      return res.status(400).json({ success: false, message: "Invalid lab request ID" });
    }
    if (!lab.LAB_REQUEST_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid lab request status" });
    }
    const hospitalId = await getStaffHospitalId(req.user.id);
    const existing = await lab.getLabRequestById(Number(labRequestId), hospitalId);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Lab request not found" });
    }
    const data = await lab.updateLabRequestStatus(existing.id, status, req.user.id);
    await audit(req, "lab_request_status_updated", "lab_request", existing.id, { status });

    const patient = await patients.getPatientById(existing.patientId);
    if (patient && patient.userId) {
      await notifications.createNotification({
        userId: patient.userId,
        type: "lab_request_status",
        title: `Lab test status updated: ${status.replace("_", " ")}`,
        body: existing.title,
        link: "/patient/notifications",
      });
    }
    return res.json({ success: true, message: "Lab request updated", data });
  } catch (error) {
    return next(error);
  }
}

async function listReports(req, res, next) {
  try {
    const hospitalId = await getStaffHospitalId(req.user.id);
    const data = await lab.listLabReports({ hospitalId });
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function createReport(req, res, next) {
  try {
    const { labRequestId } = req.params;
    if (!isValidId(labRequestId)) {
      return res.status(400).json({ success: false, message: "Invalid lab request ID" });
    }
    const hospitalId = await getStaffHospitalId(req.user.id);
    const request = await lab.getLabRequestById(Number(labRequestId), hospitalId);
    if (!request) {
      return res.status(404).json({ success: false, message: "Lab request not found" });
    }

    const { title, summary, reportText, fileUrl, reportDate } = req.body;
    const safeFile = sanitizeFileUrl(fileUrl);
    if (!safeFile.ok) {
      return res.status(400).json({ success: false, message: "Invalid file reference" });
    }

    const data = await lab.createLabReport({
      patientId: request.patientId,
      staffUserId: req.user.id,
      labRequestId: request.id,
      title: typeof title === "string" && title.trim() ? title.trim() : request.title,
      summary: typeof summary === "string" ? summary : undefined,
      reportText: typeof reportText === "string" ? reportText : undefined,
      fileUrl: safeFile.value,
      reportDate: isValidDate(reportDate) ? new Date(reportDate) : undefined,
    });

    await lab.updateLabRequestStatus(request.id, "ready", req.user.id);

    const patient = await patients.getPatientById(request.patientId);
    if (patient && patient.userId) {
      await notifications.createNotification({
        userId: patient.userId,
        type: "lab_report",
        title: `Lab report available: ${data.title}`,
        body: "Your lab result has been uploaded.",
        link: "/patient/medical-history",
      });
    }
    await audit(req, "lab_report_created", "lab_report", data.id, { labRequestId: request.id });
    return res.status(201).json({ success: true, message: "Lab report created", data });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getDashboard,
  listRequests,
  updateRequestStatus,
  listReports,
  createReport,
};
