const express = require("express");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const c = require("../controllers/pharmacyController");

const router = express.Router();

router.use(protect, authorizeRoles("pharmacist"));

router.get("/dashboard", c.getDashboard);
router.get("/prescriptions", c.listPrescriptions);
router.get("/prescriptions/:prescriptionId", c.getPrescription);
router.post("/prescriptions/:prescriptionId/dispense", c.dispensePrescription);

module.exports = router;
