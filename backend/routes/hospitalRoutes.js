const express = require("express");
const {
  listHospitals,
  createHospital,
  updateHospital,
  deleteHospital,
} = require("../controllers/hospitalController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, listHospitals);
router.post("/", protect, authorizeRoles("admin", "hospital"), createHospital);
router.patch("/:hospitalId", protect, authorizeRoles("admin", "hospital"), updateHospital);
router.delete("/:hospitalId", protect, authorizeRoles("admin"), deleteHospital);

module.exports = router;