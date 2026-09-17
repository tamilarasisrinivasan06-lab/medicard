const express = require("express");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const { requirePatientAccess } = require("../middleware/accessMiddleware");
const { getMyDoctorProfile, updateMyDoctorProfile } = require("../controllers/doctorController");
const prescriptionController = require("../controllers/prescriptionController");
const appointmentController = require("../controllers/appointmentController");
const c = require("../controllers/doctorPortalController");

const router = express.Router();

router.use(protect, authorizeRoles("doctor"));

// Profile
router.get("/me", getMyDoctorProfile);
router.patch("/me", updateMyDoctorProfile);

// Dashboard & analytics
router.get("/dashboard", c.getDashboard);
router.get("/analytics", c.getAnalytics);

// Patients & access
router.get("/patients", c.listPatients);
router.post("/patient-access/request", c.requestPatientAccess);
router.get("/patient-access/requests", c.listAccessRequests);
router.get("/patients/:patientId/access", c.getPatientAccess);
router.post("/patients/:patientId/revoke", c.revokePatientAccess);
router.get("/patients/:patientId/timeline", requirePatientAccess, c.getPatientTimeline);

// Consultations
router.get("/consultations", c.listConsultations);
router.post("/patients/:patientId/consultations", requirePatientAccess, c.createConsultation);
router.patch("/consultations/:consultationId", c.updateConsultation);
router.delete("/consultations/:consultationId", c.deleteConsultation);

// Prescriptions
router.get("/prescriptions", prescriptionController.listDoctorPrescriptions);
router.post("/patients/:patientId/prescriptions", requirePatientAccess, prescriptionController.createPrescription);

// Lab
router.get("/lab-requests", c.listLabRequests);
router.post("/patients/:patientId/lab-requests", requirePatientAccess, c.createLabRequest);
router.patch("/lab-requests/:labRequestId/status", c.updateLabRequestStatus);
router.get("/lab-reports", c.listLabReports);
router.post("/patients/:patientId/lab-reports", requirePatientAccess, c.createLabReport);

// Documents
router.get("/documents", c.listDocuments);
router.post("/patients/:patientId/documents", requirePatientAccess, c.createDocument);
router.delete("/documents/:documentId", c.deleteDocument);

// Follow-ups
router.get("/follow-ups", c.listFollowUps);
router.post("/patients/:patientId/follow-ups", requirePatientAccess, c.createFollowUp);
router.patch("/follow-ups/:followUpId/status", c.updateFollowUpStatus);

// Appointments
router.get("/appointments", appointmentController.listDoctorAppointments);
router.patch("/appointments/:appointmentId/status", appointmentController.updateAppointmentStatus);

// Hospital / clinic
router.get("/hospital", c.getMyHospital);

// Notifications
router.get("/notifications", c.getNotifications);
router.post("/notifications/read-all", c.markAllNotificationsRead);
router.post("/notifications/:notificationId/read", c.markNotificationRead);

// Audit trail
router.get("/audit", c.getAuditLogs);

module.exports = router;