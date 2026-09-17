const express = require("express");
const {
  createAppointment,
  listMyAppointments,
  listDoctorAppointments,
  listAllAppointments,
  cancelAppointment,
  updateAppointmentStatus,
} = require("../controllers/appointmentController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/my", protect, authorizeRoles("patient"), listMyAppointments);
router.post("/", protect, authorizeRoles("patient"), createAppointment);
router.get("/doctor", protect, authorizeRoles("doctor"), listDoctorAppointments);
router.get("/", protect, authorizeRoles("admin", "hospital"), listAllAppointments);
router.patch("/:appointmentId/status", protect, authorizeRoles("doctor", "hospital", "admin"), updateAppointmentStatus);
router.post("/:appointmentId/cancel", protect, authorizeRoles("patient"), cancelAppointment);

module.exports = router;