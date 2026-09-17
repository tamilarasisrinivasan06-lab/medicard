const express = require("express");
const {
  listContacts,
  createContact,
  updateContact,
  deleteContact,
} = require("../controllers/emergencyController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/my", protect, authorizeRoles("patient"), listContacts);
router.post("/", protect, authorizeRoles("patient"), createContact);
router.patch("/:contactId", protect, authorizeRoles("patient"), updateContact);
router.delete("/:contactId", protect, authorizeRoles("patient"), deleteContact);

module.exports = router;