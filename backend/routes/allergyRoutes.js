const express = require("express");
const {
  listAllergies,
  createAllergy,
  updateAllergy,
  deleteAllergy,
} = require("../controllers/allergyController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/my", protect, authorizeRoles("patient"), listAllergies);
router.post("/", protect, authorizeRoles("patient"), createAllergy);
router.patch("/:allergyId", protect, authorizeRoles("patient"), updateAllergy);
router.delete("/:allergyId", protect, authorizeRoles("patient"), deleteAllergy);

module.exports = router;