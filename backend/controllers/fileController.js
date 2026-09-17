const fs = require("fs");
const path = require("path");
const multer = require("multer");
const crypto = require("crypto");
const files = require("../db/queries/files");
const patients = require("../db/queries/patients");
const records = require("../db/queries/records");

const { getOwnPatientId } = require("./recordController");

const STORAGE_DIR = process.env.STORAGE_DIR || path.join(__dirname, "..", "uploads");
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || "10485760", 10);

const MIME_EXT = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "application/pdf": ".pdf",
  "text/plain": ".txt",
  "text/csv": ".csv",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, STORAGE_DIR),
  filename: (req, file, cb) => {
    const ext = MIME_EXT[file.mimetype] || path.extname(file.originalname).toLowerCase() || ".bin";
    cb(null, `${crypto.randomBytes(16).toString("hex")}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!MIME_EXT[file.mimetype]) {
      return cb(new Error("Unsupported file type. Allowed: JPG, PNG, WEBP, GIF, PDF, TXT, CSV, DOC, DOCX, XLS, XLSX."));
    }
    return cb(null, true);
  },
});

function isValidId(value) {
  return Number.isInteger(Number(value)) && Number(value) > 0;
}

async function uploadFile(req, res, next) {
  try {
    const { patientId, recordId } = req.body;
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file was uploaded" });
    }

    let targetPatientId = patientId && isValidId(patientId) ? Number(patientId) : null;

    if (req.user.role === "patient") {
      const own = await getOwnPatientId(req.user.id);
      if (targetPatientId && targetPatientId !== own) {
        return res.status(403).json({ success: false, message: "You are not authorized to upload for this patient" });
      }
      targetPatientId = own;
    } else if (req.user.role === "doctor") {
      if (!req.access) {
        return res.status(403).json({ success: false, message: "Access authorization required" });
      }
      if (targetPatientId && targetPatientId !== req.access.grant.patientId) {
        return res.status(403).json({ success: false, message: "You are not authorized to upload for this patient" });
      }
      targetPatientId = req.access.grant.patientId;
    } else if (req.user.role === "hospital" || req.user.role === "admin") {
      if (!targetPatientId) {
        return res.status(400).json({ success: false, message: "patientId is required" });
      }
    } else {
      return res.status(403).json({ success: false, message: "Access denied: insufficient permissions" });
    }

    const patient = await patients.getPatientById(targetPatientId);
    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }

    if (recordId && isValidId(recordId)) {
      const record = await records.getRecordById(Number(recordId));
      if (!record || record.patientId !== patient.id) {
        return res.status(400).json({ success: false, message: "Invalid record for this patient" });
      }
    }

    const data = await files.createFile({
      uploaderId: req.user.id,
      patientId: patient.id,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      storageKey: req.file.filename,
      recordId: recordId && isValidId(recordId) ? Number(recordId) : null,
    });

    if (data.recordId && data.url) {
      const fileUrl = `/api/files/${data.id}/download`;
      await records.setRecordFileUrl(data.recordId, fileUrl);
    }

    return res.status(201).json({ success: true, message: "File uploaded", data });
  } catch (error) {
    if (error.message && error.message.startsWith("Unsupported file type")) {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ success: false, message: `File exceeds the ${Math.round(MAX_FILE_SIZE / 1024 / 1024)} MB size limit` });
    }
    return next(error);
  }
}

async function canAccessFile(file, req) {
  if (req.user.role === "admin") return true;
  if (file.uploaderId === req.user.id) return true;
  if (req.user.role === "patient") {
    const own = await getOwnPatientId(req.user.id);
    return file.patientId === own;
  }
  if (req.user.role === "doctor" && req.access) {
    return file.patientId === req.access.grant.patientId;
  }
  if (req.user.role === "hospital") return true;
  return false;
}

async function downloadFile(req, res, next) {
  try {
    const { fileId } = req.params;
    if (!isValidId(fileId)) return res.status(400).json({ success: false, message: "Invalid file ID" });
    const file = await files.getFileById(Number(fileId));
    if (!file) return res.status(404).json({ success: false, message: "File not found" });

    if (!(await canAccessFile(file, req))) {
      return res.status(403).json({ success: false, message: "You are not authorized to access this file" });
    }

    const fullPath = path.join(STORAGE_DIR, file.storageKey);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ success: false, message: "File content is missing on the server" });
    }

    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Disposition", `inline; filename="${file.originalName.replace(/"/g, "")}"`);
    return fs.createReadStream(fullPath).pipe(res);
  } catch (error) {
    return next(error);
  }
}

async function listMyFiles(req, res, next) {
  try {
    const patientId = await getOwnPatientId(req.user.id);
    if (!patientId) return res.status(404).json({ success: false, message: "Profile not found" });
    const data = await files.listFilesByPatient(patientId);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function deleteFile(req, res, next) {
  try {
    const { fileId } = req.params;
    if (!isValidId(fileId)) return res.status(400).json({ success: false, message: "Invalid file ID" });
    const file = await files.getFileById(Number(fileId));
    if (!file) return res.status(404).json({ success: false, message: "File not found" });

    const isAdmin = req.user.role === "admin";
    if (!isAdmin && file.uploaderId !== req.user.id) {
      return res.status(403).json({ success: false, message: "You are not authorized to delete this file" });
    }

    await files.deleteFile(file.id);
    const fullPath = path.join(STORAGE_DIR, file.storageKey);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
    return res.json({ success: true, message: "File deleted" });
  } catch (error) {
    return next(error);
  }
}

module.exports = { upload, uploadFile, downloadFile, listMyFiles, deleteFile };