const express = require("express");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const c = require("../controllers/adminController");

const router = express.Router();

router.use(protect, authorizeRoles("admin", "super_admin", "hospital"));

router.get("/dashboard", c.getDashboard);
router.get("/users", c.listUsers);
router.patch("/users/:userId/status", c.updateUserStatus);
router.get("/hospitals", c.listHospitals);
router.post("/hospitals", c.createHospital);
router.get("/activity", c.listActivity);

module.exports = router;
