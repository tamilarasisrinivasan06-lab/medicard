const records = require("../db/queries/records");
const patients = require("../db/queries/patients");
const users = require("../db/queries/users");

function isValidId(value) {
  return Number.isInteger(Number(value)) && Number(value) > 0;
}

async function getOwnPatientId(userId) {
  const patient = await patients.getPatientByUserId(userId);
  return patient ? patient.id : null;
}

async function createRecord(req, res, next) {
  try {
    const { patientId, recordType, title, description, diagnosis, hospitalName, recordDate, fileUrl, recordId } = req.body;

    if (!isValidId(patientId)) {
      return res.status(400).json({ success: false, message: "Valid patientId is required" });
    }
    if (!records.RECORD_TYPES.includes(recordType)) {
      return res.status(400).json({ success: false, message: "Valid recordType is required" });
    }
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Title is required" });
    }
    if (!recordDate || Number.isNaN(new Date(recordDate).getTime())) {
      return res.status(400).json({ success: false, message: "Valid recordDate is required" });
    }

    const patient = await patients.getPatientById(Number(patientId));
    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }
    if (req.access.grant.patientId !== patient.id) {
      return res.status(403).json({ success: false, message: "You are not authorized to access this patient" });
    }

    const record = await records.createRecord({
      patientId: patient.id,
      userId: req.user.id,
      recordType,
      title: title.trim(),
      description,
      diagnosis,
      doctorName: req.user.fullName,
      hospitalName,
      recordDate: new Date(recordDate),
      fileUrl,
    });

    if (isValidId(recordId) && fileUrl) {
      const files = require("../db/queries/files");
      await files.linkFileToRecord(Number(recordId), record.id);
    }

    return res.status(201).json({ success: true, message: "Medical record created", data: record });
  } catch (error) {
    return next(error);
  }
}

async function listMyRecords(req, res, next) {
  try {
    const patientId = await getOwnPatientId(req.user.id);
    if (!patientId) {
      return res.status(404).json({ success: false, message: "MediCard not found" });
    }
    const data = await records.listRecordsByPatient(patientId);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function listPatientRecords(req, res, next) {
  try {
    const { patientId } = req.params;
    if (!isValidId(patientId)) {
      return res.status(400).json({ success: false, message: "Invalid patient ID" });
    }

    const patient = await patients.getPatientById(Number(patientId));
    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }

    if (req.user.role === "patient" && patient.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: "You are not authorized to access this patient's records" });
    }
    if (req.user.role === "doctor" && req.access.grant.patientId !== patient.id) {
      return res.status(403).json({ success: false, message: "You are not authorized to access this patient's records" });
    }

    const data = await records.listRecordsByPatient(patient.id);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function getRecord(req, res, next) {
  try {
    const { recordId } = req.params;
    if (!isValidId(recordId)) {
      return res.status(400).json({ success: false, message: "Invalid medical record ID" });
    }

    const record = await records.getRecordById(Number(recordId));
    if (!record) {
      return res.status(404).json({ success: false, message: "Medical record not found" });
    }

    if (req.user.role === "patient") {
      const patientId = await getOwnPatientId(req.user.id);
      if (patientId !== record.patientId) {
        return res.status(403).json({ success: false, message: "You are not authorized to access this record" });
      }
    } else if (req.user.role === "doctor" && req.access.grant.patientId !== record.patientId) {
      return res.status(403).json({ success: false, message: "You are not authorized to access this record" });
    }

    return res.json({ success: true, data: record });
  } catch (error) {
    return next(error);
  }
}

async function updateRecord(req, res, next) {
  try {
    const { recordId } = req.params;
    if (!isValidId(recordId)) {
      return res.status(400).json({ success: false, message: "Invalid medical record ID" });
    }

    const record = await records.getRecordById(Number(recordId));
    if (!record) {
      return res.status(404).json({ success: false, message: "Medical record not found" });
    }

    const isAdmin = req.user.role === "admin";
    const isDoctorWithGrant = req.user.role === "doctor" && req.access && req.access.grant.patientId === record.patientId;
    if (!isAdmin && !isDoctorWithGrant) {
      return res.status(403).json({ success: false, message: "You are not authorized to edit this record" });
    }

    const updates = records.buildRecordUpdate(record, req.body);
    if (updates.record_date) {
      const date = new Date(updates.record_date);
      if (Number.isNaN(date.getTime())) {
        return res.status(400).json({ success: false, message: "Invalid recordDate" });
      }
      updates.record_date = date;
    }
    if (updates.record_type && !records.RECORD_TYPES.includes(updates.record_type)) {
      return res.status(400).json({ success: false, message: "Valid recordType is required" });
    }

    const updated = await records.updateRecord(record.id, updates);
    return res.json({ success: true, message: "Medical record updated", data: updated });
  } catch (error) {
    return next(error);
  }
}

async function deleteRecord(req, res, next) {
  try {
    const { recordId } = req.params;
    if (!isValidId(recordId)) {
      return res.status(400).json({ success: false, message: "Invalid medical record ID" });
    }

    const record = await records.getRecordById(Number(recordId));
    if (!record) {
      return res.status(404).json({ success: false, message: "Medical record not found" });
    }

    const isAdmin = req.user.role === "admin";
    const isOwnerDoctor =
      req.user.role === "doctor" && req.access && record.userId === req.user.id && req.access.grant.patientId === record.patientId;
    if (!isAdmin && !isOwnerDoctor) {
      return res.status(403).json({ success: false, message: "You are not authorized to delete this record" });
    }

    await records.deleteRecord(record.id);
    return res.json({ success: true, message: "Medical record deleted" });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getOwnPatientId,
  createRecord,
  listMyRecords,
  listPatientRecords,
  getRecord,
  updateRecord,
  deleteRecord,
};