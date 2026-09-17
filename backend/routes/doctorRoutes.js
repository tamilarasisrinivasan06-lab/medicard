const express = require("express");
const {
  getDoctorStats,
  getMyDoctorProfile,
  updateMyDoctorProfile,
  listDoctors,
  getDoctorById,
} = require("../controllers/doctorController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/stats", protect, authorizeRoles("doctor"), getDoctorStats);
router.get("/profile", protect, authorizeRoles("doctor"), getMyDoctorProfile);
router.patch("/profile", protect, authorizeRoles("doctor"), updateMyDoctorProfile);
router.get("/", protect, listDoctors);
router.get("/:doctorId", protect, getDoctorById);

module.exports = router;