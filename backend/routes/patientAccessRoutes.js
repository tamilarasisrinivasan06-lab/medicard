const express = require("express");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const { listDoctorAccess, getDoctorAccess, decideDoctorAccess } = require("../controllers/patientAccessController");

const router = express.Router();

// All patient-facing access-management routes require an authenticated patient.
router.use(protect, authorizeRoles("patient"));

router.get("/", listDoctorAccess);
router.get("/:accessId", getDoctorAccess);
router.post("/:accessId/decide", decideDoctorAccess);

module.exports = router;