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
};
