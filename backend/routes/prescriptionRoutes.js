const express = require("express");
const {
  createPrescription,
  listMyPrescriptions,
  listDoctorPrescriptions,
  getPrescription,
} = require("../controllers/prescriptionController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const { requireAccessGrant } = require("../middleware/accessMiddleware");

const router = express.Router();

router.get("/my", protect, authorizeRoles("patient"), listMyPrescriptions);
router.get("/doctor", protect, authorizeRoles("doctor"), listDoctorPrescriptions);
router.post(
  "/",
  protect,
  authorizeRoles("doctor", "admin"),
  requireGrantForDoctor,
  createPrescription
);
router.get(
  "/:prescriptionId",
  protect,
  authorizeRoles("patient", "doctor", "admin"),
  requireGrantForDoctor,
  getPrescription
);

function requireGrantForDoctor(req, res, next) {
  if (req.user.role === "doctor") {
    return requireAccessGrant(req, res, next);
  }
  return next();
}

module.exports = router;