const fs = require("fs");
const path = require("path");
const User = require("../models/User");

const uploadResume = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                message: "Please upload a PDF resume"
            });
        }

        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        if (user.resume) {
            const oldFile = path.join(
                __dirname,
                "../uploads",
                path.basename(user.resume)
            );

            if (fs.existsSync(oldFile)) {
                try {
                    fs.unlinkSync(oldFile);
                } catch (unlinkErr) {
                    console.warn("Could not delete old resume file:", unlinkErr.message);
                }
            }
        }

        user.resume = `uploads/${req.file.filename}`;
        await user.save();

        return res.status(200).json({
            message: "Resume uploaded successfully",
            resume: user.resume
        });
    } catch (error) {
        console.error("Resume upload error:", error.message);

        return res.status(500).json({
            message: "Server error while uploading resume"
        });
    }
};

// Get the logged-in student's own resume
const getMyResume = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user || !user.resume) {
            return res.status(404).json({
                message: "No resume found. Please upload your resume first."
            });
        }

        const filename = path.basename(user.resume);
        const filePath = path.join(__dirname, "../uploads", filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                message: "Resume file not found on server"
            });
        }

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
        return res.sendFile(path.resolve(filePath));
    } catch (error) {
        console.error("Get resume error:", error.message);
        return res.status(500).json({
            message: "Server error while retrieving resume"
        });
    }
};

// Get a student's resume by userId (Admin or the student themselves)
const getResumeByUserId = async (req, res) => {
    try {
        const { userId } = req.params;

        if (req.user.role !== "admin" && req.user.id !== userId) {
            return res.status(403).json({
                message: "Access denied: insufficient permissions to view this resume"
            });
        }

        const user = await User.findById(userId);

        if (!user || !user.resume) {
            return res.status(404).json({
                message: "Resume not found for this student"
            });
        }

        const filename = path.basename(user.resume);
        const filePath = path.join(__dirname, "../uploads", filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                message: "Resume file not found on server"
            });
        }

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
        return res.sendFile(path.resolve(filePath));
    } catch (error) {
        console.error("Get student resume error:", error.message);
        return res.status(500).json({
            message: "Server error while retrieving resume"
        });
    }
};

// Get resume by filename (Protected - Admin or owner student)
const getResumeByFilename = async (req, res) => {
    try {
        const rawFilename = req.params.filename;
        const filename = path.basename(rawFilename);

        if (req.user.role !== "admin") {
            const user = await User.findById(req.user.id);
            if (!user || !user.resume || path.basename(user.resume) !== filename) {
                return res.status(403).json({
                    message: "Access denied: you do not have permission to view this resume"
                });
            }
        }

        const filePath = path.join(__dirname, "../uploads", filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                message: "Resume file not found on server"
            });
        }

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
        return res.sendFile(path.resolve(filePath));
    } catch (error) {
        console.error("Get resume by filename error:", error.message);
        return res.status(500).json({
            message: "Server error while retrieving resume"
        });
    }
};

module.exports = {
    uploadResume,
    getMyResume,
    getResumeByUserId,
    getResumeByFilename
};
