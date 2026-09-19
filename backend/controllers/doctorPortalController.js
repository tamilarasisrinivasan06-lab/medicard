const doctors = require("../db/queries/doctors");
const patients = require("../db/queries/patients");
const records = require("../db/queries/records");
const medications = require("../db/queries/medications");
const allergies = require("../db/queries/allergies");
const dp = require("../db/queries/doctorPortal");
const prescriptions = require("../db/queries/prescriptions");
const notifications = require("../db/queries/notifications");
const { audit } = require("../services/auditService");

const MEDICARD_ID_REGEX = /^MC-[A-Z0-9]{8}$/;

function isValidId(value) {
  return Number.isInteger(Number(value)) && Number(value) > 0;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function isValidDate(value) {
  return !!value && !Number.isNaN(new Date(value).getTime());
}

async function getDoctorHospitalId(userId) {
  const doctor = await doctors.getDoctorByUserId(userId);
  return doctor && doctor.hospitalId ? Number(doctor.hospitalId) : null;
}

// A doctor may only modify a patient's records while a patient-approved,
// unexpired access grant exists. This closes the gap where access is revoked
// or expires but previously created records could still be edited/deleted.
async function ensureActiveAccess(doctorId, patientId) {
  await dp.expireStaleAccess();
  const access = await dp.getActiveAccess(doctorId, patientId);
  if (!access) {
    const error = new Error("Active patient authorization is required to access this patient's records");
    error.expose = true;
    error.status = 403;
    throw error;
  }
  return access;
}

// Only accept internal file paths produced by the upload endpoint or absolute
// http(s) URLs. This prevents javascript:/data: URLs reaching the browser.
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

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
async function getDashboard(req, res, next) {
  try {
    const { range } = req.query;
    const data = await dp.getDoctorDashboard(req.user.id, ["today", "week", "month", "year", "all"].includes(range) ? range : "all");
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function getAnalytics(req, res, next) {
  try {
    const { range } = req.query;
    const data = await dp.getAnalytics(req.user.id, ["today", "week", "month", "year"].includes(range) ? range : null);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

// ---------------------------------------------------------------------------
// Patients & access
// ---------------------------------------------------------------------------
async function lookupPatient(req, res, next) {
  try {
    const { medicardId, qrPayload } = req.query;
    let patient = null;

    if (typeof qrPayload === "string" && qrPayload.length > 0) {
      patient = await patients.getMediCardByQr(qrPayload.trim());
    } else if (typeof medicardId === "string" && MEDICARD_ID_REGEX.test(medicardId.trim().toUpperCase())) {
      patient = await patients.getMediCardByMediCardId(medicardId.trim().toUpperCase());
    }

    if (!patient) {
      return res.status(404).json({ success: false, message: "MediCard not found" });
    }

    await audit(req, "patient_lookup", "patient", patient.patient_id, { medicardId: patient.medicard_id });
    return res.json({
      success: true,
      data: {
        patientName: patient.name || null,
        medicardId: patient.medicard_id,
        patientId: patient.patient_id,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function listPatients(req, res, next) {
  try {
    const data = await dp.listAuthorizedPatients(req.user.id);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function requestPatientAccess(req, res, next) {
  try {
    const { medicardId: rawMedicardId, qrPayload, reason } = req.body;
    let medicardId = typeof rawMedicardId === "string" ? rawMedicardId.trim().toUpperCase() : "";
    let patient = null;

    if (MEDICARD_ID_REGEX.test(medicardId)) {
      patient = await patients.getMediCardByMediCardId(medicardId);
    } else if (typeof qrPayload === "string" && qrPayload.length > 0) {
      patient = await patients.getMediCardByQr(qrPayload.trim());
      medicardId = patient ? patient.medicard_id : "";
    }

    if (!patient) {
      return res.status(404).json({ success: false, message: "MediCard not found" });
    }

    const latest = await dp.latestAccess(req.user.id, patient.patient_id);
    if (latest) {
      if (latest.status === "pending") {
        return res.status(409).json({ success: false, message: "Access request is already pending for this patient", data: latest });
      }
      if (latest.status === "accepted" && new Date(latest.expiresAt) > new Date()) {
        return res.json({ success: true, message: "You already have access to this patient", data: latest });
      }
    }

    const access = await dp.createAccessRequest({
      doctorId: req.user.id,
      patientId: patient.patient_id,
      medicardId,
      reason: typeof reason === "string" ? reason.trim().slice(0, 500) || null : null,
    });

    if (patient.userId) {
      await notifications.createNotification({
        userId: patient.userId,
        type: "access_request",
        title: `${req.user.fullName} requested access to your health records`,
        body: `Reason: ${access.reason || "Medical care"}`,
        link: "/patient/access",
      });
    }
    await audit(req, "access_requested", "patient", patient.patient_id, { medicardId, accessId: access.id });

    return res.status(201).json({
      success: true,
      message: "Access request sent. The patient must approve it before you can view their records.",
      data: access,
    });
  } catch (error) {
    return next(error);
  }
}

async function listAccessRequests(req, res, next) {
  try {
    const { status } = req.query;
    const valid = dp.ACCESS_STATUSES.includes(status);
    const data = await dp.listAccessByDoctor(req.user.id, valid ? status : null);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function getPatientAccess(req, res, next) {
  try {
    const { patientId } = req.params;
    if (!isValidId(patientId)) {
      return res.status(400).json({ success: false, message: "Invalid patient ID" });
    }
    const access = await dp.latestAccess(req.user.id, Number(patientId));
    if (!access) {
      return res.status(404).json({ success: false, message: "No access request found for this patient" });
    }
    return res.json({ success: true, data: access });
  } catch (error) {
    return next(error);
  }
}

async function revokePatientAccess(req, res, next) {
  try {
    const { patientId } = req.params;
    if (!isValidId(patientId)) {
      return res.status(400).json({ success: false, message: "Invalid patient ID" });
    }
    const access = await dp.latestAccess(req.user.id, Number(patientId));
    if (!access || access.status !== "accepted") {
      return res.status(409).json({ success: false, message: "No active access to revoke" });
    }
    const updated = await dp.updateAccessStatus(access.id, "revoked");
    const patient = await patients.getPatientById(Number(patientId));
    if (patient && patient.userId) {
      await notifications.createNotification({
        userId: patient.userId,
        type: "access_revoked",
        title: `${req.user.fullName} ended access to your health records`,
        body: updated.reason || null,
        link: "/patient/access",
      });
    }
    await audit(req, "access_revoked", "patient", Number(patientId), { accessId: access.id });
    return res.json({ success: true, message: "Access revoked", data: updated });
  } catch (error) {
    return next(error);
  }
}

// ---------------------------------------------------------------------------
// Patient data (requires active patient-approved access via middleware)
// ---------------------------------------------------------------------------
async function getPatientTimeline(req, res, next) {
  try {
    const patientId = Number(req.params.patientId);
    await dp.expireStaleAccess();

    const patient = await patients.getPatientById(patientId);
    if (!patient) return res.status(404).json({ success: false, message: "Patient not found" });

    const [recs, meds, allerg, access] = await Promise.all([
      records.listRecordsByPatient(patientId),
      medications.listMedications(patientId),
      allergies.listAllergies(patientId),
      dp.getActiveAccess(req.user.id, patientId),
    ]);

    await audit(req, "patient_data_viewed", "patient", patientId, { medicardId: patient.medicardId });

    return res.json({
      success: true,
      data: {
        patient,
        access,
        records: recs,
        medications: meds,
        allergies: allerg,
      },
    });
  } catch (error) {
    return next(error);
  }
}

// ---------------------------------------------------------------------------
// Consultations
// ---------------------------------------------------------------------------
async function createConsultation(req, res, next) {
  try {
    const { patientId } = req.params;
    if (!isValidId(patientId)) {
      return res.status(400).json({ success: false, message: "Invalid patient ID" });
    }

    const { title, symptoms, diagnosis, adviceNotes, consultationDate, status, hospitalName } = req.body;
    if (typeof title !== "string" || title.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Consultation title is required" });
    }

    const consultation = await dp.createConsultation({
      patientId: Number(patientId),
      doctorId: req.user.id,
      title: title.trim(),
      symptoms: typeof symptoms === "string" ? symptoms : undefined,
      diagnosis: typeof diagnosis === "string" ? diagnosis : undefined,
      adviceNotes: typeof adviceNotes === "string" ? adviceNotes : undefined,
      consultationDate: isValidDate(consultationDate) ? new Date(consultationDate) : new Date(),
      status: dp.CONSULTATION_STATUSES.includes(status) ? status : "completed",
      hospitalName: typeof hospitalName === "string" ? hospitalName : undefined,
    });

    // Mirror into the unified medical_records timeline so the patient's History shows it.
    const patient = await patients.getPatientById(Number(patientId));
    if (patient) {
      await records.createRecord({
        patientId: patient.id,
        userId: req.user.id,
        recordType: "diagnosis",
        title: consultation.title,
        description: consultation.symptoms || null,
        diagnosis: consultation.diagnosis || null,
        doctorName: req.user.fullName,
        hospitalName: consultation.hospitalName || undefined,
        recordDate: consultation.consultationDate,
      });
    }

    await audit(req, "consultation_created", "consultation", consultation.id, { patientId: Number(patientId) });
    return res.status(201).json({ success: true, message: "Consultation recorded", data: consultation });
  } catch (error) {
    return next(error);
  }
}

async function listConsultations(req, res, next) {
  try {
    const { range } = req.query;
    const data = await dp.listConsultations(req.user.id, ["today", "week", "month", "year"].includes(range) ? range : null);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function updateConsultation(req, res, next) {
  try {
    const { consultationId } = req.params;
    if (!isValidId(consultationId)) {
      return res.status(400).json({ success: false, message: "Invalid consultation ID" });
    }
    const existing = await dp.getConsultationById(Number(consultationId));
    if (!existing || existing.doctorId !== req.user.id) {
      return res.status(404).json({ success: false, message: "Consultation not found" });
    }
    await ensureActiveAccess(req.user.id, existing.patientId);
    const data = await dp.updateConsultation(existing.id, req.body);
    await audit(req, "consultation_updated", "consultation", existing.id, {});
    return res.json({ success: true, message: "Consultation updated", data });
  } catch (error) {
    return next(error);
  }
}

async function deleteConsultation(req, res, next) {
  try {
    const { consultationId } = req.params;
    if (!isValidId(consultationId)) {
      return res.status(400).json({ success: false, message: "Invalid consultation ID" });
    }
    const existing = await dp.getConsultationById(Number(consultationId));
    if (!existing || existing.doctorId !== req.user.id) {
      return res.status(404).json({ success: false, message: "Consultation not found" });
    }
    await ensureActiveAccess(req.user.id, existing.patientId);
    await dp.deleteConsultation(existing.id);
    await audit(req, "consultation_deleted", "consultation", existing.id, {});
    return res.json({ success: true, message: "Consultation deleted" });
  } catch (error) {
    return next(error);
  }
}

// ---------------------------------------------------------------------------
// Lab requests & reports
// ---------------------------------------------------------------------------
async function createLabRequest(req, res, next) {
  try {
    const { patientId } = req.params;
    if (!isValidId(patientId)) {
      return res.status(400).json({ success: false, message: "Invalid patient ID" });
    }
    const { title, tests, instructions, priority, consultationId } = req.body;
    if (typeof title !== "string" || title.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Lab request title is required" });
    }
    if (typeof tests !== "string" || tests.trim().length === 0) {
      return res.status(400).json({ success: false, message: "List the tests required" });
    }

    const data = await dp.createLabRequest({
      patientId: Number(patientId),
      doctorId: req.user.id,
      title: title.trim(),
      tests: tests.trim(),
      instructions: typeof instructions === "string" ? instructions : undefined,
      priority: dp.LAB_PRIORITIES.includes(priority) ? priority : "routine",
      consultationId: isValidId(consultationId) ? Number(consultationId) : null,
      hospitalId: await getDoctorHospitalId(req.user.id),
    });

    const patient = await patients.getPatientById(Number(patientId));
    if (patient && patient.userId) {
      await notifications.createNotification({
        userId: patient.userId,
        type: "lab_request",
        title: `${req.user.fullName} ordered lab tests for you`,
        body: data.title,
        link: "/patient/notifications",
      });
    }
    await audit(req, "lab_request_created", "lab_request", data.id, { patientId: Number(patientId) });
    return res.status(201).json({ success: true, message: "Lab request created", data });
  } catch (error) {
    return next(error);
  }
}

async function listLabRequests(req, res, next) {
  try {
    const { status } = req.query;
    const valid = dp.LAB_REQUEST_STATUSES.includes(status);
    const data = await dp.listLabRequests(req.user.id, valid ? status : null);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function updateLabRequestStatus(req, res, next) {
  try {
    const { labRequestId } = req.params;
    const { status } = req.body;
    if (!isValidId(labRequestId)) {
      return res.status(400).json({ success: false, message: "Invalid lab request ID" });
    }
    if (!dp.LAB_REQUEST_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid lab request status" });
    }
    const existing = await dp.getLabRequestById(Number(labRequestId));
    if (!existing || existing.doctorId !== req.user.id) {
      return res.status(404).json({ success: false, message: "Lab request not found" });
    }
    await ensureActiveAccess(req.user.id, existing.patientId);
    const data = await dp.updateLabRequestStatus(existing.id, status);
    return res.json({ success: true, message: "Lab request updated", data });
  } catch (error) {
    return next(error);
  }
}

async function createLabReport(req, res, next) {
  try {
    const { patientId } = req.params;
    if (!isValidId(patientId)) {
      return res.status(400).json({ success: false, message: "Invalid patient ID" });
    }
    const { labRequestId, title, summary, reportText, fileUrl, reportDate } = req.body;
    if (typeof title !== "string" || title.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Report title is required" });
    }
    const safeFile = sanitizeFileUrl(fileUrl);
    if (!safeFile.ok) {
      return res.status(400).json({ success: false, message: "Invalid file reference" });
    }

    const data = await dp.createLabReport({
      patientId: Number(patientId),
      doctorId: req.user.id,
      labRequestId: isValidId(labRequestId) ? Number(labRequestId) : null,
      title: title.trim(),
      summary: typeof summary === "string" ? summary : undefined,
      reportText: typeof reportText === "string" ? reportText : undefined,
      fileUrl: safeFile.value,
      reportDate: isValidDate(reportDate) ? new Date(reportDate) : undefined,
    });

    if (data.labRequestId) {
      await dp.updateLabRequestStatus(data.labRequestId, "ready");
    }

    const patient = await patients.getPatientById(Number(patientId));
    if (patient && patient.userId) {
      await notifications.createNotification({
        userId: patient.userId,
        type: "lab_report",
        title: `Lab report available: ${data.title}`,
        body: "Your doctor has added a new lab result.",
        link: "/patient/notifications",
      });
    }
    await audit(req, "lab_report_created", "lab_report", data.id, { patientId: Number(patientId) });
    return res.status(201).json({ success: true, message: "Lab report added", data });
  } catch (error) {
    return next(error);
  }
}

async function listLabReports(req, res, next) {
  try {
    const data = await dp.listLabReports(req.user.id);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------
async function createDocument(req, res, next) {
  try {
    const { patientId } = req.params;
    if (!isValidId(patientId)) {
      return res.status(400).json({ success: false, message: "Invalid patient ID" });
    }
    const { title, category, notes, fileUrl } = req.body;
    if (typeof title !== "string" || title.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Document title is required" });
    }
    const safeFile = sanitizeFileUrl(fileUrl);
    if (!safeFile.ok) {
      return res.status(400).json({ success: false, message: "Invalid file reference" });
    }
    const data = await dp.createDocument({
      patientId: Number(patientId),
      doctorId: req.user.id,
      title: title.trim(),
      category,
      notes: typeof notes === "string" ? notes : undefined,
      fileUrl: safeFile.value,
    });
    await audit(req, "document_created", "document", data.id, { patientId: Number(patientId) });
    return res.status(201).json({ success: true, message: "Document added", data });
  } catch (error) {
    return next(error);
  }
}

async function listDocuments(req, res, next) {
  try {
    const { patientId } = req.query;
    const data = await dp.listDocuments(req.user.id, isValidId(patientId) ? Number(patientId) : null);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function deleteDocument(req, res, next) {
  try {
    const { documentId } = req.params;
    if (!isValidId(documentId)) {
      return res.status(400).json({ success: false, message: "Invalid document ID" });
    }
    const existing = await dp.getDocumentById(Number(documentId));
    if (!existing || existing.doctorId !== req.user.id) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }
    await ensureActiveAccess(req.user.id, existing.patientId);
    await dp.deleteDocument(existing.id);
    await audit(req, "document_deleted", "document", existing.id, {});
    return res.json({ success: true, message: "Document deleted" });
  } catch (error) {
    return next(error);
  }
}

// ---------------------------------------------------------------------------
// Follow-ups
// ---------------------------------------------------------------------------
async function createFollowUp(req, res, next) {
  try {
    const { patientId } = req.params;
    if (!isValidId(patientId)) {
      return res.status(400).json({ success: false, message: "Invalid patient ID" });
    }
    const { followUpDate, notes, consultationId } = req.body;
    if (!isValidDate(followUpDate)) {
      return res.status(400).json({ success: false, message: "A valid followUpDate is required" });
    }
    const data = await dp.createFollowUp({
      patientId: Number(patientId),
      doctorId: req.user.id,
      consultationId: isValidId(consultationId) ? Number(consultationId) : null,
      followUpDate: new Date(followUpDate),
      notes: typeof notes === "string" ? notes : undefined,
    });
    const patient = await patients.getPatientById(Number(patientId));
    if (patient && patient.userId) {
      await notifications.createNotification({
        userId: patient.userId,
        type: "follow_up",
        title: `Follow-up scheduled for ${new Date(data.followUpDate).toLocaleDateString()}`,
        body: `${req.user.fullName} scheduled a follow-up. ${data.notes || ""}`.trim(),
        link: "/patient/notifications",
      });
    }
    await audit(req, "follow_up_created", "follow_up", data.id, { patientId: Number(patientId) });
    return res.status(201).json({ success: true, message: "Follow-up scheduled", data });
  } catch (error) {
    return next(error);
  }
}

async function listFollowUps(req, res, next) {
  try {
    const { status, dueOnly } = req.query;
    const valid = dp.FOLLOW_UP_STATUSES.includes(status);
    const data = await dp.listFollowUps(req.user.id, valid ? status : null, dueOnly === "true");
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function updateFollowUpStatus(req, res, next) {
  try {
    const { followUpId } = req.params;
    const { status } = req.body;
    if (!isValidId(followUpId)) {
      return res.status(400).json({ success: false, message: "Invalid follow-up ID" });
    }
    if (!dp.FOLLOW_UP_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid follow-up status" });
    }
    const existing = await dp.getFollowUpById(Number(followUpId));
    if (!existing || existing.doctorId !== req.user.id) {
      return res.status(404).json({ success: false, message: "Follow-up not found" });
    }
    await ensureActiveAccess(req.user.id, existing.patientId);
    const data = await dp.updateFollowUpStatus(existing.id, status);
    return res.json({ success: true, message: "Follow-up updated", data });
  } catch (error) {
    return next(error);
  }
}

// ---------------------------------------------------------------------------
// Patient-scoped history (cross-doctor). Each route is protected by
// requirePatientAccess so a doctor can only read records for a patient who has
// granted them access, regardless of which doctor created the record.
// ---------------------------------------------------------------------------
async function listPatientConsultations(req, res, next) {
  try {
    const { patientId } = req.params;
    if (!isValidId(patientId)) {
      return res.status(400).json({ success: false, message: "Invalid patient ID" });
    }
    const data = await dp.listConsultationsByPatient(Number(patientId));
    await audit(req, "patient_data_viewed", "patient", Number(patientId), { scope: "consultations" });
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function listPatientPrescriptions(req, res, next) {
  try {
    const { patientId } = req.params;
    if (!isValidId(patientId)) {
      return res.status(400).json({ success: false, message: "Invalid patient ID" });
    }
    const data = await prescriptions.listPrescriptionsByPatient(Number(patientId));
    await audit(req, "patient_data_viewed", "patient", Number(patientId), { scope: "prescriptions" });
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function listPatientLabRequests(req, res, next) {
  try {
    const { patientId } = req.params;
    if (!isValidId(patientId)) {
      return res.status(400).json({ success: false, message: "Invalid patient ID" });
    }
    const data = await dp.listLabRequestsByPatient(Number(patientId));
    await audit(req, "patient_data_viewed", "patient", Number(patientId), { scope: "lab_requests" });
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function listPatientLabReports(req, res, next) {
  try {
    const { patientId } = req.params;
    if (!isValidId(patientId)) {
      return res.status(400).json({ success: false, message: "Invalid patient ID" });
    }
    const data = await dp.listLabReportsByPatient(Number(patientId));
    await audit(req, "patient_data_viewed", "patient", Number(patientId), { scope: "lab_reports" });
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function listPatientDocuments(req, res, next) {
  try {
    const { patientId } = req.params;
    if (!isValidId(patientId)) {
      return res.status(400).json({ success: false, message: "Invalid patient ID" });
    }
    const data = await dp.listDocumentsByPatient(Number(patientId));
    await audit(req, "patient_data_viewed", "patient", Number(patientId), { scope: "documents" });
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function listPatientFollowUps(req, res, next) {
  try {
    const { patientId } = req.params;
    if (!isValidId(patientId)) {
      return res.status(400).json({ success: false, message: "Invalid patient ID" });
    }
    const data = await dp.listFollowUpsByPatient(Number(patientId));
    await audit(req, "patient_data_viewed", "patient", Number(patientId), { scope: "follow_ups" });
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

// ---------------------------------------------------------------------------
// Hospital / clinic
// ---------------------------------------------------------------------------
async function getMyHospital(req, res, next) {
  try {
    const doctor = await doctors.getDoctorByUserId(req.user.id);
    if (!doctor) return res.status(404).json({ success: false, message: "Doctor profile not found" });

    let hospital = null;
    let colleagues = [];
    if (doctor.hospitalId) {
      const hospitals = require("../db/queries/hospitals");
      hospital = await hospitals.getHospitalById(doctor.hospitalId);
      const all = await doctors.listDoctors({ hospitalId: doctor.hospitalId });
      colleagues = all.filter((d) => d.userId !== req.user.id);
    }

    return res.json({ success: true, data: { doctor, hospital, colleagues } });
  } catch (error) {
    return next(error);
  }
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
async function getNotifications(req, res, next) {
  try {
    const { unreadOnly } = req.query;
    const data = await notifications.listNotificationsByUser(req.user.id, unreadOnly === "true");
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function markNotificationRead(req, res, next) {
  try {
    const { notificationId } = req.params;
    if (!isValidId(notificationId)) {
      return res.status(400).json({ success: false, message: "Invalid notification ID" });
    }
    const data = await notifications.markNotificationRead(Number(notificationId), req.user.id);
    if (!data) return res.status(404).json({ success: false, message: "Notification not found" });
    return res.json({ success: true, message: "Notification marked as read", data });
  } catch (error) {
    return next(error);
  }
}

async function markAllNotificationsRead(req, res, next) {
  try {
    const count = await notifications.markAllNotificationsRead(req.user.id);
    return res.json({ success: true, message: "All notifications marked as read", data: { count } });
  } catch (error) {
    return next(error);
  }
}

// ---------------------------------------------------------------------------
// Audit trail
// ---------------------------------------------------------------------------
async function getAuditLogs(req, res, next) {
  try {
    const auditQ = require("../db/queries/audit");
    const data = await auditQ.listLogsByUser(req.user.id);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getDashboard,
  getAnalytics,
  lookupPatient,
  listPatients,
  requestPatientAccess,
  listAccessRequests,
  getPatientAccess,
  revokePatientAccess,
  getPatientTimeline,
  createConsultation,
  listConsultations,
  updateConsultation,
  deleteConsultation,
  createLabRequest,
  listLabRequests,
  updateLabRequestStatus,
  createLabReport,
  listLabReports,
  createDocument,
  listDocuments,
  deleteDocument,
  createFollowUp,
  listFollowUps,
  updateFollowUpStatus,
  listPatientConsultations,
  listPatientPrescriptions,
  listPatientLabRequests,
  listPatientLabReports,
  listPatientDocuments,
  listPatientFollowUps,
  getMyHospital,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getAuditLogs,
};