
const Job = require("../models/Job");
const Company = require("../models/Company");
const { normalizeBranches, getAllBranchAliases } = require("../config/branches");

const VALID_CATEGORIES = [
    "Internship",
    "Full-Time Employment (FTE)",
    "Internship + Performance-Based FTE"
];

function validateCategoryAndCompensation(category, stipend, ctc) {
    if (!category || !VALID_CATEGORIES.includes(category)) {
        return "Please select a valid job category: Internship, Full-Time Employment (FTE), or Internship + Performance-Based FTE";
    }

    if (category === "Internship") {
        if (stipend === undefined || stipend === null || stipend === "" || isNaN(Number(stipend)) || Number(stipend) < 0) {
            return "Stipend is required for Internship and must be a non-negative number";
        }
    } else if (category === "Full-Time Employment (FTE)") {
        if (ctc === undefined || ctc === null || ctc === "" || isNaN(Number(ctc)) || Number(ctc) < 0) {
            return "CTC is required for Full-Time Employment (FTE) and must be a non-negative number";
        }
    } else if (category === "Internship + Performance-Based FTE") {
        if (stipend === undefined || stipend === null || stipend === "" || isNaN(Number(stipend)) || Number(stipend) < 0) {
            return "Stipend is required for Internship + Performance-Based FTE and must be a non-negative number";
        }
        if (ctc === undefined || ctc === null || ctc === "" || isNaN(Number(ctc)) || Number(ctc) < 0) {
            return "CTC is required for Internship + Performance-Based FTE and must be a non-negative number";
        }
    }
    return null;
}

// Create a job (Admin only)
const createJob = async (req, res) => {
    try {
        const {
            title,
            company,
            category,
            stipend,
            ctc,
            description,
            eligibleBranches,
            minimumCGPA,
            maximumBacklogs,
            location,
            deadline
        } = req.body;

        if (
            !title ||
            !company ||
            !description ||
            minimumCGPA === undefined ||
            !location ||
            !deadline
        ) {
            return res.status(400).json({
                message: "Please provide all required job details"
            });
        }

        const categoryError = validateCategoryAndCompensation(category, stipend, ctc);
        if (categoryError) {
            return res.status(400).json({
                message: categoryError
            });
        }

        const companyExists = await Company.findById(company);

        if (!companyExists) {
            return res.status(404).json({
                message: "Company not found"
            });
        }

        if (req.body.status !== undefined && !["open", "closed"].includes(req.body.status)) {
            return res.status(400).json({
                message: "Status must be either 'open' or 'closed'"
            });
        }

        const job = await Job.create({
            title,
            company,
            category,
            stipend: (category === "Internship" || category === "Internship + Performance-Based FTE") && stipend !== undefined && stipend !== "" ? Number(stipend) : undefined,
            ctc: (category === "Full-Time Employment (FTE)" || category === "Internship + Performance-Based FTE") && ctc !== undefined && ctc !== "" ? Number(ctc) : undefined,
            description,
            eligibleBranches: normalizeBranches(eligibleBranches),
            minimumCGPA,
            maximumBacklogs: maximumBacklogs !== undefined && maximumBacklogs !== "" ? Number(maximumBacklogs) : 0,
            location,
            deadline,
            status: req.body.status || "open"
        });

        res.status(201).json({
            message: "Job created successfully",
            job
        });
    } catch (error) {
        console.error("Create job error:", error.message);
        res.status(500).json({
            message: "Server error while creating job"
        });
    }
};

// View all jobs

const getJobs = async (req, res) => {
    try {
        const {
            search,
            location,
            branch,
            minCGPA,
            includeAll
        } = req.query;

        const filter = {};

        // Search by job title
        if (search) {
            filter.title = {
                $regex: search,
                $options: "i"
            };
        }

        // Filter by location
        if (location) {
            filter.location = {
                $regex: location,
                $options: "i"
            };
        }

        // Filter by eligible branch
        if (branch) {
            const aliases = getAllBranchAliases(branch);
            if (aliases && aliases.length > 0) {
                filter.eligibleBranches = { $in: aliases };
            }
        }

        // Filter by minimum required CGPA
        if (minCGPA !== undefined) {
            const cgpa = Number(minCGPA);

            if (!Number.isFinite(cgpa) || cgpa < 0 || cgpa > 10) {
                return res.status(400).json({
                    message: "minCGPA must be a number between 0 and 10"
                });
            }

            filter.minimumCGPA = { $lte: cgpa };
        }

        // includeAll query parameter is honored only for authenticated admins
        const isAdmin = req.user && req.user.role === "admin";
        const shouldIncludeAll = (includeAll === "true" || includeAll === true) && isAdmin;

        if (!shouldIncludeAll) {
            // Show only open jobs with future deadlines
            filter.status = "open";
            filter.deadline = { $gte: new Date() };
        }

        const jobs = await Job.find(filter)
            .populate("company", "name location industry")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            count: jobs.length,
            jobs
        });
    } catch (error) {
        console.error("Get jobs error:", error.message);

        return res.status(500).json({
            message: "Server error while fetching jobs"
        });
    }
};






const updateJob = async (req, res) => {
    try {
        const allowedFields = [
            "title",
            "company",
            "category",
            "stipend",
            "ctc",
            "description",
            "eligibleBranches",
            "minimumCGPA",
            "maximumBacklogs",
            "location",
            "deadline",
            "status"
        ];

        const updates = {};

        if (req.body.category !== undefined) {
            const categoryError = validateCategoryAndCompensation(
                req.body.category,
                req.body.stipend,
                req.body.ctc
            );
            if (categoryError) {
                return res.status(400).json({
                    message: categoryError
                });
            }
            updates.category = req.body.category;
            updates.stipend = (req.body.category === "Internship" || req.body.category === "Internship + Performance-Based FTE") && req.body.stipend !== undefined && req.body.stipend !== "" ? Number(req.body.stipend) : null;
            updates.ctc = (req.body.category === "Full-Time Employment (FTE)" || req.body.category === "Internship + Performance-Based FTE") && req.body.ctc !== undefined && req.body.ctc !== "" ? Number(req.body.ctc) : null;
        }

        if (req.body.status !== undefined && !["open", "closed"].includes(req.body.status)) {
            return res.status(400).json({
                message: "Status must be either 'open' or 'closed'"
            });
        }

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                if (field === "eligibleBranches") {
                    updates.eligibleBranches = normalizeBranches(req.body.eligibleBranches);
                } else if (field === "category" || field === "stipend" || field === "ctc") {
                    // Handled above when category is present; if only stipend/ctc provided without category:
                    if (req.body.category === undefined) {
                        if (field === "stipend") {
                            updates.stipend = req.body.stipend !== "" && req.body.stipend !== null ? Number(req.body.stipend) : null;
                        } else if (field === "ctc") {
                            updates.ctc = req.body.ctc !== "" && req.body.ctc !== null ? Number(req.body.ctc) : null;
                        }
                    }
                } else {
                    updates[field] = req.body[field];
                }
            }
        }

        if (updates.company) {
            const companyExists = await Company.findById(updates.company);

            if (!companyExists) {
                return res.status(404).json({
                    message: "Company not found"
                });
            }
        }

        const job = await Job.findByIdAndUpdate(
            req.params.jobId,
            { $set: updates },
            { new: true, runValidators: true }
        ).populate("company", "name location");

        if (!job) {
            return res.status(404).json({
                message: "Job not found"
            });
        }

        res.status(200).json({
            message: "Job updated successfully",
            job
        });
    } catch (error) {
        console.error("Update job error:", error.message);

        res.status(500).json({
            message: "Server error while updating job"
        });
    }
};

const deleteJob = async (req, res) => {
    try {
        const job = await Job.findByIdAndDelete(req.params.jobId);

        if (!job) {
            return res.status(404).json({
                message: "Job not found"
            });
        }

        res.status(200).json({
            message: "Job deleted successfully"
        });
    } catch (error) {
        console.error("Delete job error:", error.message);

        res.status(500).json({
            message: "Server error while deleting job"
        });
    }
};


function getEffectiveStatus(job) {
    if (!job) return "closed";
    if (job.status === "closed") return "closed";
    if (job.deadline && new Date(job.deadline).getTime() < Date.now()) {
        return "expired";
    }
    return "open";
}

module.exports = { createJob, getJobs, updateJob, deleteJob, getEffectiveStatus };
