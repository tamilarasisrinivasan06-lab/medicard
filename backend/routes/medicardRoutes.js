const express = require("express");
const {
  getMyMediCard,
  getMediCardById,
  scanMediCard,
  requestMediCardAccess,
  verifyMediCard,
} = require("../controllers/medicardController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

const router = express.Router();
const healthcareRoles = ["doctor", "hospital", "pharmacist", "diagnostic_staff"];

router.get("/me", protect, authorizeRoles("patient"), getMyMediCard);
router.post("/scan", protect, authorizeRoles(...healthcareRoles), scanMediCard);
router.post("/access-request", protect, authorizeRoles("doctor"), requestMediCardAccess);
router.post("/verify", protect, authorizeRoles(...healthcareRoles), verifyMediCard);
router.get("/:medicardId", protect, authorizeRoles(...healthcareRoles), getMediCardById);

module.exports = router;