const fs = require("fs");
const path = require("path");
const lab = require("../db/queries/labPortal");
const patients = require("../db/queries/patients");
const files = require("../db/queries/files");
const records = require("../db/queries/records");
const notifications = require("../db/queries/notifications");
const { getStaffHospitalId } = require("../db/queries/staff");
const { audit } = require("../services/auditService");

const UPLOAD_DIR = process.env.STORAGE_DIR || path.join(__dirname, "..", "uploads");

// Scan reports accept the common imaging formats a lab emits.
const SCAN_MIME_TYPES = new Set(["image/jpeg", "image/png", "application/pdf"]);

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

async function listPatients(req, res, next) {
  try {
    const { q } = req.query;
    const hospitalId = await getStaffHospitalId(req.user.id);
    const data = await lab.listLabPortalPatients({ hospitalId, q });
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function uploadScanReport(req, res, next) {
  try {
    const hospitalId = await getStaffHospitalId(req.user.id);
    const uploaded = req.file;
    if (!uploaded) {
      return res.status(400).json({ success: false, message: "No file was uploaded" });
    }

    const discardUpload = () => {
      try {
        fs.unlinkSync(path.join(UPLOAD_DIR, uploaded.filename));
      } catch {
        // Best effort: remove the orphan only if it still exists.
      }
    };

    if (!SCAN_MIME_TYPES.has(uploaded.mimetype)) {
      discardUpload();
      return res.status(400).json({
        success: false,
        message: "Unsupported file type. Allowed: JPG, PNG, PDF.",
      });
    }

    let patientId = null;
    let linkedRequest = null;
    if (isValidId(req.body.labRequestId)) {
      linkedRequest = await lab.getLabRequestById(Number(req.body.labRequestId), hospitalId);
      if (!linkedRequest) {
        discardUpload();
        return res.status(404).json({ success: false, message: "Lab request not found" });
      }
      patientId = linkedRequest.patientId;
    } else if (isValidId(req.body.patientId)) {
      patientId = Number(req.body.patientId);
      const patient = await patients.getPatientById(patientId);
      if (!patient) {
        discardUpload();
        return res.status(404).json({ success: false, message: "Patient not found" });
      }
      if (!(await lab.patientHasLabRequestInHospital(patientId, hospitalId))) {
        discardUpload();
        return res.status(403).json({
          success: false,
          message: "You are not authorized to upload reports for this patient",
        });
      }
    } else {
      discardUpload();
      return res.status(400).json({ success: false, message: "patientId or labRequestId is required" });
    }

    const title =
      typeof req.body.title === "string" && req.body.title.trim()
        ? req.body.title.trim()
        : (linkedRequest && linkedRequest.title) || "Scan report";
    const notes = typeof req.body.notes === "string" ? req.body.notes : undefined;
    const reportDate = isValidDate(req.body.reportDate) ? new Date(req.body.reportDate) : new Date();

    const fileRecord = await files.createFile({
      uploaderId: req.user.id,
      patientId,
      originalName: uploaded.originalname,
      mimeType: uploaded.mimetype,
      sizeBytes: uploaded.size,
      storageKey: uploaded.filename,
    });
    const fileUrl = `/api/files/${fileRecord.id}/download`;

    const report = await lab.createLabReport({
      patientId,
      staffUserId: req.user.id,
      labRequestId: linkedRequest ? linkedRequest.id : null,
      title,
      summary: notes,
      reportText: undefined,
      fileUrl,
      reportDate,
    });

    // Mirror into the patient's unified medical history as a scan record so it
    // appears in the patient portal, the doctor's timeline, and the lab queue.
    await records.createRecord({
      patientId,
      userId: req.user.id,
      recordType: "scan",
      title,
      description: notes || null,
      diagnosis: null,
      doctorName: req.user.fullName || "Diagnostic Lab",
      hospitalName: null,
      recordDate: reportDate,
      fileUrl,
    });

    if (linkedRequest && ["requested", "in_progress"].includes(linkedRequest.status)) {
      await lab.updateLabRequestStatus(linkedRequest.id, "ready", req.user.id);
    }

    const patient = await patients.getPatientById(patientId);
    if (patient && patient.userId) {
      await notifications.createNotification({
        userId: patient.userId,
        type: "lab_report",
        title: `Lab report available: ${report.title}`,
        body: "Your scanned report has been uploaded by the lab.",
        link: "/patient/medical-history",
      });
    }

    await audit(req, "lab_scan_report_uploaded", "patient", patientId, {
      labReportId: report.id,
      fileId: fileRecord.id,
    });

    return res.status(201).json({
      success: true,
      message: "Scan report uploaded",
      data: { report, file: fileRecord },
    });
  } catch (error) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ success: false, message: "File exceeds the 10 MB size limit" });
    }
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
  listPatients,
  createReport,
  uploadScanReport,
};
