
const Application = require("../models/Application");
const Job = require("../models/Job");
const User = require("../models/User");
const { isBranchEligible } = require("../config/branches");

// Apply for a job
const applyForJob = async (req, res) => {
    try {
        const { jobId } = req.params;

        const student = await User.findById(req.user.id);

        if (!student) {
            return res.status(404).json({
                message: "Student not found"
            });
        }

        if (student.role !== "student") {
            return res.status(403).json({
                message: "Only students can apply for jobs"
            });
        }

        const job = await Job.findById(jobId);

        if (!job) {
            return res.status(404).json({
                message: "Job not found"
            });
        }

        if (job.status !== "open") {
            return res.status(400).json({
                message: "This job is closed"
            });
        }

        if (new Date(job.deadline) < new Date()) {
            return res.status(400).json({
                message: "Application deadline has passed"
            });
        }

        if (student.cgpa < job.minimumCGPA) {
            return res.status(400).json({
                message: `Minimum CGPA required is ${job.minimumCGPA}`
            });
        }

        if (student.backlogs > job.maximumBacklogs) {
            return res.status(400).json({
                message: "You do not meet the backlog criteria"
            });
        }

        if (!isBranchEligible(student.branch, job.eligibleBranches)) {
            return res.status(400).json({
                message: "Your branch is not eligible for this job"
            });
        }

        const existingApplication = await Application.findOne({
            student: student._id,
            job: job._id
        });

        if (existingApplication) {
            return res.status(409).json({
                message: "You have already applied for this job"
            });
        }

        const application = await Application.create({
            student: student._id,
            job: job._id
        });

        return res.status(201).json({
            message: "Application submitted successfully",
            application
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "You have already applied for this job"
            });
        }

        console.error("Application error:", error.message);

        return res.status(500).json({
            message: "Server error while applying"
        });
    }
};





// Get applications submitted by the logged-in student
const getMyApplications = async (req, res) => {
    try {
        const applications = await Application.find({
            student: req.user.id
        })
            .populate({
                path: "job",
                populate: {
                    path: "company",
                    select: "name location"
                }
            })
            .sort({ createdAt: -1 });

        res.status(200).json({
            count: applications.length,
            applications
        });
    } catch (error) {
        console.error("Fetch applications error:", error.message);

        res.status(500).json({
            message: "Server error while fetching applications"
        });
    }
};





const updateApplicationStatus = async (req, res) => {
    try {
        const { status } = req.body;

        const allowedStatuses = [
            "Applied",
            "Shortlisted",
            "Interview",
            "Selected",
            "Rejected"
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid application status"
            });
        }

        const application = await Application.findByIdAndUpdate(
            req.params.applicationId,
            { status },
            { new: true, runValidators: true }
        );

        if (!application) {
            return res.status(404).json({
                message: "Application not found"
            });
        }

        return res.status(200).json({
            message: "Application status updated",
            application
        });
    } catch (error) {
        console.error("Update status error:", error.message);

        return res.status(500).json({
            message: "Server error while updating status"
        });
    }
};

// Get all applications (Admin only)
const getAllApplications = async (req, res) => {
    try {
        const applications = await Application.find({})
            .populate("student", "name email branch cgpa resume")
            .populate({
                path: "job",
                select: "title location company category stipend ctc",
                populate: {
                    path: "company",
                    select: "name location"
                }
            })
            .sort({ createdAt: -1 });

        return res.status(200).json({
            count: applications.length,
            applications
        });
    } catch (error) {
        console.error("Fetch all applications error:", error.message);

        return res.status(500).json({
            message: "Server error while fetching applications"
        });
    }
};

module.exports = { applyForJob, getMyApplications, updateApplicationStatus, getAllApplications };
