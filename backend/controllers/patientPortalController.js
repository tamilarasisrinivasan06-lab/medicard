const patientPortal = require("../db/queries/patientPortal");
const notifications = require("../db/queries/notifications");
const { getOwnPatientId } = require("./recordController");
const { generateQrDataURL } = require("../services/medicardService");

async function requirePatient(req) {
  const patientId = await getOwnPatientId(req.user.id);
  return patientId ? Number(patientId) : null;
}

function numericId(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

async function getDashboard(req, res, next) {
  try {
    const patientId = await requirePatient(req);
    if (!patientId) {
      return res.status(404).json({ success: false, message: "Patient profile not found" });
    }
    const data = await patientPortal.getDashboard(patientId, req.user.id);
    if (data.medicard && data.medicard.qrCodeData) {
      data.medicard.qrDataUrl = await generateQrDataURL(data.medicard.qrCodeData);
    }
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function getMedicard(req, res, next) {
  try {
    const patientId = await requirePatient(req);
    if (!patientId) {
      return res.status(404).json({ success: false, message: "Patient profile not found" });
    }
    const context = await patientPortal.getPatientContext(patientId);
    if (!context) {
      return res.status(404).json({ success: false, message: "Patient profile not found" });
    }
    const qrDataUrl = context.qrCodeData ? await generateQrDataURL(context.qrCodeData) : null;
    return res.json({ success: true, data: { ...context, qrDataUrl } });
  } catch (error) {
    return next(error);
  }
}

async function listDoctors(req, res, next) {
  try {
    const patientId = await requirePatient(req);
    if (!patientId) {
      return res.status(404).json({ success: false, message: "Patient profile not found" });
    }
    const search = req.query.search ? String(req.query.search).trim() : null;
    const data = await patientPortal.listPatientDoctors(patientId, search || null);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function getDoctor(req, res, next) {
  try {
    const patientId = await requirePatient(req);
    if (!patientId) {
      return res.status(404).json({ success: false, message: "Patient profile not found" });
    }
    const doctorId = numericId(req.params.doctorId);
    if (!doctorId) {
      return res.status(400).json({ success: false, message: "Invalid doctor id" });
    }
    const data = await patientPortal.getPatientDoctorDetail(patientId, doctorId);
    if (!data) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function getTimeline(req, res, next) {
  try {
    const patientId = await requirePatient(req);
    if (!patientId) {
      return res.status(404).json({ success: false, message: "Patient profile not found" });
    }
    const typeParam = req.query.types;
    const validTypes = ["consultation", "prescription", "lab_report", "record", "appointment"];
    let types = null;
    if (typeParam) {
      types = String(typeParam)
        .split(",")
        .map((t) => t.trim())
        .filter((t) => validTypes.includes(t));
      if (types.length === 0) types = null;
    }
    const data = await patientPortal.getTimeline(patientId, types);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function getRecords(req, res, next) {
  try {
    const patientId = await requirePatient(req);
    if (!patientId) {
      return res.status(404).json({ success: false, message: "Patient profile not found" });
    }
    const records = require("../db/queries/records");
    const data = await records.listRecordsByPatient(patientId);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function getDocuments(req, res, next) {
  try {
    const patientId = await requirePatient(req);
    if (!patientId) {
      return res.status(404).json({ success: false, message: "Patient profile not found" });
    }
    const data = await patientPortal.getPatientDocuments(patientId);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function getLabReports(req, res, next) {
  try {
    const patientId = await requirePatient(req);
    if (!patientId) {
      return res.status(404).json({ success: false, message: "Patient profile not found" });
    }
    const data = await patientPortal.getLabReports(patientId);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function getScans(req, res, next) {
  try {
    const patientId = await requirePatient(req);
    if (!patientId) {
      return res.status(404).json({ success: false, message: "Patient profile not found" });
    }
    const data = await patientPortal.getScans(patientId);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function getPharmacy(req, res, next) {
  try {
    const patientId = await requirePatient(req);
    if (!patientId) {
      return res.status(404).json({ success: false, message: "Patient profile not found" });
    }
    const data = await patientPortal.getPharmacy(patientId);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function getFollowUps(req, res, next) {
  try {
    const patientId = await requirePatient(req);
    if (!patientId) {
      return res.status(404).json({ success: false, message: "Patient profile not found" });
    }
    const data = await patientPortal.getFollowUps(patientId);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function listNotifications(req, res, next) {
  try {
    const unreadOnly = req.query.unread === "true";
    const data = await notifications.listNotificationsByUser(req.user.id, unreadOnly);
    const unread = await notifications.countUnread(req.user.id);
    return res.json({ success: true, data, meta: { unread } });
  } catch (error) {
    return next(error);
  }
}

async function markNotificationRead(req, res, next) {
  try {
    const id = numericId(req.params.notificationId);
    if (!id) {
      return res.status(400).json({ success: false, message: "Invalid notification id" });
    }
    const notification = await notifications.markNotificationRead(id, req.user.id);
    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }
    return res.json({ success: true, data: notification });
  } catch (error) {
    return next(error);
  }
}

async function markAllNotificationsRead(req, res, next) {
  try {
    const count = await notifications.markAllNotificationsRead(req.user.id);
    return res.json({ success: true, data: { updated: count } });
  } catch (error) {
    return next(error);
  }
}

async function search(req, res, next) {
  try {
    const patientId = await requirePatient(req);
    if (!patientId) {
      return res.status(404).json({ success: false, message: "Patient profile not found" });
    }
    const query = req.query.q ? String(req.query.q).trim() : "";
    if (query.length < 2) {
      return res.json({ success: true, data: [], meta: { query } });
    }
    const data = await patientPortal.searchPatientData(patientId, query);
    return res.json({ success: true, data, meta: { query } });
  } catch (error) {
    return next(error);
  }
}

async function getAccessHistory(req, res, next) {
  try {
    const patientId = await requirePatient(req);
    if (!patientId) {
      return res.status(404).json({ success: false, message: "Patient profile not found" });
    }
    const status = req.query.status ? String(req.query.status) : null;
    const data = await patientPortal.listAccessRequests(patientId, status);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

const aiService = require("../services/aiService");
const pool = require("../db/pool");

/**
 * Interactive turn-by-turn conversational AI triage with patient
 */
async function chatPatientAIAssistant(req, res, next) {
  try {
    const patientId = await requirePatient(req);
    if (!patientId) {
      return res.status(404).json({ success: false, message: "Patient profile not found" });
    }

    const { message, history } = req.body;
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Message is required" });
    }

    const context = await aiService.assembleClinicalContext(patientId, message);
    if (!context) {
      return res.status(404).json({ success: false, message: "Patient context not found" });
    }

    const result = await aiService.chatPatientAssistant({
      patientContext: context,
      message: message.trim(),
      chatHistory: Array.isArray(history) ? history : [],
    });

    return res.json({
      success: true,
      data: {
        patientName: context.patient.name,
        medicardId: context.patient.medicardId,
        reply: result.reply,
        redFlags: result.redFlags || [],
        suggestedResponses: result.suggestedResponses || [],
        readyToSummarize: result.readyToSummarize || false,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Pre-generate the clinical SBAR/SOAP summary before final sending
 */
async function generatePatientAISummary(req, res, next) {
  try {
    const patientId = await requirePatient(req);
    if (!patientId) {
      return res.status(404).json({ success: false, message: "Patient profile not found" });
    }

    const { conversation, chiefComplaint, vitals } = req.body;
    const context = await aiService.assembleClinicalContext(patientId, "intake_summary");
    if (!context) {
      return res.status(404).json({ success: false, message: "Patient context not found" });
    }

    const result = await aiService.generateIntakeSummaryReport({
      patientContext: context,
      conversation: Array.isArray(conversation) ? conversation : [],
      chiefComplaint: chiefComplaint || "",
      vitals: vitals || {},
    });

    return res.json({
      success: true,
      data: {
        patientName: context.patient.name,
        medicardId: context.patient.medicardId,
        clinicalSummary: result.clinicalSummary,
        severity: result.severity,
        redFlags: result.redFlags,
        chiefComplaint: result.chiefComplaint,
      },
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Submit the intake report and dispatch to doctor with notifications
 */
async function submitPatientAIIntake(req, res, next) {
  try {
    const patientId = await requirePatient(req);
    if (!patientId) {
      return res.status(404).json({ success: false, message: "Patient profile not found" });
    }

    const {
      doctorId,
      chiefComplaint,
      symptoms,
      duration,
      severity,
      vitals,
      transcript,
      clinicalSummary,
    } = req.body;

    if (!clinicalSummary) {
      return res.status(400).json({ success: false, message: "Clinical summary is required" });
    }

    const docId = doctorId ? Number(doctorId) : null;

    const { rows } = await pool.query(
      `INSERT INTO patient_ai_intakes
       (patient_id, doctor_id, chief_complaint, symptoms, duration, severity, vitals, transcript, clinical_summary, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'submitted')
       RETURNING *`,
      [
        patientId,
        docId,
        chiefComplaint || "General Medical Intake",
        symptoms || "",
        duration || "",
        severity || "moderate",
        JSON.stringify(vitals || {}),
        JSON.stringify(transcript || []),
        clinicalSummary,
      ]
    );

    const intakeRecord = rows[0];

    // If doctor is specified, notify doctor
    if (docId) {
      // Find doctor's user_id
      const docUser = await pool.query(
        `SELECT u.id AS user_id, u.full_name FROM users u WHERE u.id = $1`,
        [docId]
      );
      if (docUser.rows.length > 0) {
        await notifications.createNotification({
          userId: docId,
          type: "ai_intake_received",
          title: `New AI Patient Intake: ${chiefComplaint || "Patient Consultation"}`,
          body: `A patient submitted an AI triage clinical summary (Severity: ${severity || "moderate"}). Click to review.`,
          link: `/doctor/patients/${patientId}?tab=ai-intakes`,
        });
      }
    }

    // Also notify patient
    await notifications.createNotification({
      userId: req.user.id,
      type: "ai_intake_submitted",
      title: "Intake Summary Sent to Doctor",
      body: "Your symptoms and clinical summary have been compiled and securely sent to your doctor.",
      link: "/patient/ai-assistant",
    });

    return res.status(201).json({
      success: true,
      message: "AI Intake report submitted successfully",
      data: intakeRecord,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * List patient's past AI intake reports
 */
async function listPatientAIIntakes(req, res, next) {
  try {
    const patientId = await requirePatient(req);
    if (!patientId) {
      return res.status(404).json({ success: false, message: "Patient profile not found" });
    }

    const { rows } = await pool.query(
      `SELECT pai.*, u.full_name AS doctor_name, d.specialization AS doctor_specialization
       FROM patient_ai_intakes pai
       LEFT JOIN users u ON u.id = pai.doctor_id
       LEFT JOIN doctors d ON d.user_id = pai.doctor_id
       WHERE pai.patient_id = $1
       ORDER BY pai.created_at DESC
       LIMIT 30`,
      [patientId]
    );

    return res.json({ success: true, data: rows });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getDashboard,
  getMedicard,
  listDoctors,
  getDoctor,
  getTimeline,
  getRecords,
  getDocuments,
  getLabReports,
  getScans,
  getPharmacy,
  getFollowUps,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  search,
  getAccessHistory,
  chatPatientAIAssistant,
  generatePatientAISummary,
  submitPatientAIIntake,
  listPatientAIIntakes,
};

