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
  requireGrantForDoctor,
  upload.single("file"),
  uploadFile
);
router.get("/my", protect, authorizeRoles("patient"), listMyFiles);
router.get("/:fileId/download", protect, requireGrantForDoctor, downloadFile);
router.delete("/:fileId", protect, authorizeRoles("patient", "doctor", "hospital", "admin"), deleteFile);

function requireGrantForDoctor(req, res, next) {
  if (req.user.role === "doctor") {
    return requireAccessGrant(req, res, next);
  }
  return next();
}

module.exports = router;