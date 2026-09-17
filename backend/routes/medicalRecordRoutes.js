const express = require("express");
const {
  createRecord,
  listMyRecords,
  listPatientRecords,
  getRecord,
  updateRecord,
  deleteRecord,
} = require("../controllers/recordController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const { requireAccessForRole, requireAccessGrant } = require("../middleware/accessMiddleware");

const router = express.Router();

router.post("/", protect, authorizeRoles("doctor"), requireAccessGrant, createRecord);
router.get("/my", protect, authorizeRoles("patient"), listMyRecords);
router.get(
  "/patient/:patientId",
  protect,
  authorizeRoles("patient", "doctor", "admin"),
  requireAccessForRole("doctor"),
  listPatientRecords
);
router.get(
  "/:recordId",
  protect,
  authorizeRoles("patient", "doctor", "admin"),
  requireAccessForRole("doctor"),
  getRecord
);
router.patch(
  "/:recordId",
  protect,
  authorizeRoles("doctor", "admin"),
  requireAccessForRole("doctor"),
  updateRecord
);
router.delete(
  "/:recordId",
  protect,
  authorizeRoles("doctor", "admin"),
  requireAccessForRole("doctor"),
  deleteRecord
);

module.exports = router;