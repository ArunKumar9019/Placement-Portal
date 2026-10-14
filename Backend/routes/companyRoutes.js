
const express = require("express");
const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const {
    createCompany,
    getCompanies,
    updateCompany,
    deleteCompany
} = require("../controllers/companyController");

const router = express.Router();

// Admin only
router.post("/", protect, authorizeRoles("admin"), createCompany);
router.put("/:companyId", protect, authorizeRoles("admin"), updateCompany);
router.delete("/:companyId", protect, authorizeRoles("admin"), deleteCompany);

// Logged-in users
router.get("/", protect, getCompanies);

module.exports = router;
