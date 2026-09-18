const express = require("express");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const c = require("../controllers/superAdminController");

const router = express.Router();

router.use(protect, authorizeRoles("super_admin"));

router.get("/dashboard", c.getDashboard);
router.get("/users", c.listUsers);
router.patch("/users/:userId/status", c.updateUserStatus);
router.get("/profile", c.getProfile);
router.patch("/profile", c.updateProfile);

module.exports = router;