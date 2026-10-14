const express = require("express");
const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");
const upload = require("../middleware/uploadMiddleware");
const {
    uploadResume,
    getMyResume,
    getResumeByUserId,
    getResumeByFilename
} = require("../controllers/resumeController");

const router = express.Router();

router.post(
    "/upload",
    protect,
    authorizeRoles("student"),
    (req, res, next) => {
        upload.single("resume")(req, res, (err) => {
            if (err) {
                if (err.code === "LIMIT_FILE_SIZE") {
                    return res.status(400).json({
                        message: "File size exceeds the 2 MB limit"
                    });
                }
                return res.status(400).json({
                    message: err.message || "File upload error"
                });
            }
            next();
        });
    },
    uploadResume
);

// View current student's own resume
router.get("/my", protect, getMyResume);

// View a student's resume by userId (Admin or the student themselves)
router.get("/view/:userId", protect, getResumeByUserId);

// View resume by filename (Admin or owner student)
router.get("/file/:filename", protect, getResumeByFilename);

module.exports = router;
