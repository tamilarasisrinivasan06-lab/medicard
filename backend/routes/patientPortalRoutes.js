const express = require("express");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const c = require("../controllers/patientPortalController");

const router = express.Router();

// Every patient-portal route requires an authenticated patient. Data is scoped
// to the patient resolved from the token, never from request parameters.
router.use(protect, authorizeRoles("patient"));

router.get("/dashboard", c.getDashboard);
router.get("/medicard", c.getMedicard);
router.get("/doctors", c.listDoctors);
router.get("/doctors/:doctorId", c.getDoctor);
router.get("/timeline", c.getTimeline);
router.get("/records", c.getRecords);
router.get("/documents", c.getDocuments);
router.get("/lab-reports", c.getLabReports);
router.get("/scans", c.getScans);
router.get("/pharmacy", c.getPharmacy);
router.get("/follow-ups", c.getFollowUps);
router.get("/notifications", c.listNotifications);
router.post("/notifications/:notificationId/read", c.markNotificationRead);
router.post("/notifications/read-all", c.markAllNotificationsRead);
router.get("/search", c.search);
router.get("/access-history", c.getAccessHistory);

// Patient AI Virtual Assistant & Clinical Intake Routes
router.post("/ai-intake/chat", c.chatPatientAIAssistant);
router.post("/ai-intake/summarize", c.generatePatientAISummary);
router.post("/ai-intake/submit", c.submitPatientAIIntake);
router.get("/ai-intake/history", c.listPatientAIIntakes);

module.exports = router;

