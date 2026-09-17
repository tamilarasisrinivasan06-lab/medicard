const express = require("express");
const { getProfile, updateProfile, getDashboard } = require("../controllers/patientController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/dashboard", protect, authorizeRoles("patient"), getDashboard);
router.get("/profile", protect, authorizeRoles("patient"), getProfile);
router.patch("/profile", protect, authorizeRoles("patient"), updateProfile);

module.exports = router;