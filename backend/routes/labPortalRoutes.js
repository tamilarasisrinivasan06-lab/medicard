const express = require("express");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const c = require("../controllers/labPortalController");

const router = express.Router();

router.use(protect, authorizeRoles("diagnostic_staff"));

router.get("/dashboard", c.getDashboard);
router.get("/requests", c.listRequests);
router.patch("/requests/:labRequestId/status", c.updateRequestStatus);
router.post("/requests/:labRequestId/report", c.createReport);
router.get("/reports", c.listReports);

module.exports = router;
