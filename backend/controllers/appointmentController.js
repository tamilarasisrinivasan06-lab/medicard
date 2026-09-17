const appointments = require("../db/queries/appointments");
const patients = require("../db/queries/patients");
const doctors = require("../db/queries/doctors");
const { getOwnPatientId } = require("./recordController");

function isValidId(value) {
  return Number.isInteger(Number(value)) && Number(value) > 0;
}

function isFutureOrToday(dateStr) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date.setHours(0, 0, 0, 0) >= today.getTime();
}

async function createAppointment(req, res, next) {
  try {
    const patientId = await getOwnPatientId(req.user.id);
    if (!patientId) return res.status(404).json({ success: false, message: "Profile not found" });

    const { doctorId, hospitalId, appointmentDate, appointmentTime, reason, notes } = req.body;

    if (!appointmentDate || !isFutureOrToday(appointmentDate)) {
      return res.status(400).json({ success: false, message: "Appointment date must be today or in the future" });
    }

    let doctor;
    if (doctorId !== undefined && doctorId !== null) {
      if (!isValidId(doctorId)) return res.status(400).json({ success: false, message: "Invalid doctor" });
      doctor = await doctors.getDoctorById(Number(doctorId));
      if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    let hospital;
    if (hospitalId !== undefined && hospitalId !== null) {
      if (!isValidId(hospitalId)) return res.status(400).json({ success: false, message: "Invalid hospital" });
      hospital = await requireQuery("hospitals").getHospitalById(Number(hospitalId));
      if (!hospital) return res.status(404).json({ success: false, message: "Hospital not found" });
    }

    const data = await appointments.createAppointment({
      patientId,
      doctorId: doctor ? doctor.id : null,
      hospitalId: hospital ? hospital.id : null,
      appointmentDate,
      appointmentTime: appointmentTime || null,
      reason: reason || null,
      notes: notes || null,
    });

    return res.status(201).json({ success: true, message: "Appointment scheduled", data });
  } catch (error) {
    return next(error);
  }
}

function requireQuery(name) {
  return require(`../db/queries/${name}`);
}

async function listMyAppointments(req, res, next) {
  try {
    const patientId = await getOwnPatientId(req.user.id);
    if (!patientId) return res.status(404).json({ success: false, message: "Profile not found" });
    const data = await appointments.listAppointmentsByPatient(patientId);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function listDoctorAppointments(req, res, next) {
  try {
    const data = await appointments.listAppointmentsByDoctorUserId(req.user.id);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function listAllAppointments(req, res, next) {
  try {
    const data = await appointments.listAppointments();
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function cancelAppointment(req, res, next) {
  try {
    const { appointmentId } = req.params;
    if (!isValidId(appointmentId)) return res.status(400).json({ success: false, message: "Invalid appointment ID" });
    const item = await appointments.getAppointmentById(Number(appointmentId));
    if (!item) return res.status(404).json({ success: false, message: "Appointment not found" });

    const patientId = await getOwnPatientId(req.user.id);
    if (item.patientId !== patientId) {
      return res.status(403).json({ success: false, message: "You are not authorized to cancel this appointment" });
    }

    const data = await appointments.updateAppointmentStatus(item.id, "cancelled");
    return res.json({ success: true, message: "Appointment cancelled", data });
  } catch (error) {
    return next(error);
  }
}

async function updateAppointmentStatus(req, res, next) {
  try {
    const { appointmentId } = req.params;
    const { status } = req.body;

    if (!isValidId(appointmentId)) return res.status(400).json({ success: false, message: "Invalid appointment ID" });
    if (!appointments.APPOINTMENT_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid appointment status" });
    }

    const item = await appointments.getAppointmentById(Number(appointmentId));
    if (!item) return res.status(404).json({ success: false, message: "Appointment not found" });

    if (req.user.role === "doctor") {
      const doctor = await doctors.getDoctorByUserId(req.user.id);
      if (!doctor || doctor.id !== item.doctorId) {
        return res.status(403).json({ success: false, message: "You are not authorized to update this appointment" });
      }
    } else if (!["admin", "hospital"].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Access denied: insufficient permissions" });
    }

    const data = await appointments.updateAppointmentStatus(item.id, status);
    return res.json({ success: true, message: "Appointment updated", data });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createAppointment,
  listMyAppointments,
  listDoctorAppointments,
  listAllAppointments,
  cancelAppointment,
  updateAppointmentStatus,
};