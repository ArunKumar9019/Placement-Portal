
const express = require("express");
const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const {
    createJob,
    getJobs,
    updateJob,
    deleteJob
} = require("../controllers/jobController");

const router = express.Router();

// Admin-only operations
router.post("/", protect, authorizeRoles("admin"), createJob);
router.put("/:jobId", protect, authorizeRoles("admin"), updateJob);
router.delete("/:jobId", protect, authorizeRoles("admin"), deleteJob);

// Logged-in users can view jobs
router.get("/", protect, getJobs);

module.exports = router;
