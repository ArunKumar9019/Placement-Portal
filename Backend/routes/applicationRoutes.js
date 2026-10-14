
const express = require("express");
const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const {
    applyForJob,
    getMyApplications,
    updateApplicationStatus,
    getAllApplications
} = require("../controllers/applicationController");

const router = express.Router();

// Admin: view all applications
router.get(
    "/",
    protect,
    authorizeRoles("admin"),
    getAllApplications
);

// Student: view their applications
router.get(
    "/my",
    protect,
    authorizeRoles("student"),
    getMyApplications
);

// Student: apply for a job
router.post(
    "/:jobId",
    protect,
    authorizeRoles("student"),
    applyForJob
);

// Admin: update an application status
router.patch(
    "/:applicationId/status",
    protect,
    authorizeRoles("admin"),
    updateApplicationStatus
);

module.exports = router;
