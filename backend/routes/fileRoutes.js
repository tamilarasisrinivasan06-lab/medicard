const express = require("express");
const {
  upload,
  uploadFile,
  downloadFile,
  listMyFiles,
  deleteFile,
} = require("../controllers/fileController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const { requireAccessGrant } = require("../middleware/accessMiddleware");

const router = express.Router();

router.post(
  "/upload",
  protect,
  authorizeRoles("patient", "doctor", "hospital", "admin"),
  attachDoctorAccess,
  upload.single("file"),
  uploadFile
);
router.get("/my", protect, authorizeRoles("patient"), listMyFiles);
router.get("/:fileId/download", protect, attachDoctorAccess, downloadFile);
router.delete("/:fileId", protect, authorizeRoles("patient", "doctor", "hospital", "admin"), deleteFile);

// Doctors may authenticate either with a legacy short-lived access grant
// (x-access-token) or through the consent-based doctor portal flow. When a
// grant token is supplied it is validated here; otherwise the controller
// verifies an active patient-approved grant before allowing the operation.
function attachDoctorAccess(req, res, next) {
  if (req.user.role !== "doctor") {
    return next();
  }
  const token = req.headers["x-access-token"];
  if (!token) {
    return next();
  }
  return requireAccessGrant(req, res, next);
}

module.exports = router;