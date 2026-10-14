const User = require("../models/User");
const { normalizeBranch, getBranchLabel } = require("../config/branches");

const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.status(200).json({
            message: "Profile accessed successfully",
            user: {
                id: user._id,
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                branch: normalizeBranch(user.branch),
                branchLabel: getBranchLabel(user.branch),
                cgpa: user.cgpa,
                backlogs: user.backlogs,
                resume: user.resume
            }
        });
    } catch (error) {
        console.error("Get profile error:", error.message);
        res.status(500).json({
            message: "Server error while fetching profile"
        });
    }
};

const updateProfile = async (req, res) => {
    try {
        const { branch, name, cgpa, backlogs } = req.body;
        const updates = {};

        if (name !== undefined) updates.name = name.trim();
        if (branch !== undefined) updates.branch = normalizeBranch(branch);
        if (cgpa !== undefined) {
            const parsedCGPA = Number(cgpa);
            if (Number.isFinite(parsedCGPA) && parsedCGPA >= 0 && parsedCGPA <= 10) {
                updates.cgpa = parsedCGPA;
            }
        }
        if (backlogs !== undefined) {
            const parsedBacklogs = Number(backlogs);
            if (Number.isFinite(parsedBacklogs) && parsedBacklogs >= 0) {
                updates.backlogs = parsedBacklogs;
            }
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: updates },
            { new: true, runValidators: true }
        ).select("-password");

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.status(200).json({
            message: "Profile updated successfully",
            user: {
                id: user._id,
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                branch: normalizeBranch(user.branch),
                branchLabel: getBranchLabel(user.branch),
                cgpa: user.cgpa,
                backlogs: user.backlogs,
                resume: user.resume
            }
        });
    } catch (error) {
        console.error("Update profile error:", error.message);
        res.status(500).json({
            message: "Server error while updating profile"
        });
    }
};

module.exports = { getProfile, updateProfile };