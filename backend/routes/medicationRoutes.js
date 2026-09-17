const express = require("express");
const {
  listMyMedications,
  createMedication,
  updateMedication,
  deleteMedication,
} = require("../controllers/medicationController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const { requireAccessGrant } = require("../middleware/accessMiddleware");

const router = express.Router();

router.get("/my", protect, authorizeRoles("patient"), listMyMedications);
router.post(
  "/",
  protect,
  authorizeRoles("patient", "doctor", "admin"),
  requireGrantForDoctor,
  createMedication
);
router.patch("/:medicationId", protect, authorizeRoles("patient", "admin"), updateMedication);
router.delete("/:medicationId", protect, authorizeRoles("patient", "admin"), deleteMedication);

function requireGrantForDoctor(req, res, next) {
  if (req.user.role === "doctor") {
    return requireAccessGrant(req, res, next);
  }
  return next();
}

module.exports = router;