const User = require("../models/User");
const bcrypt = require("bcryptjs");
const { normalizeBranch } = require("../config/branches");

const registerUser = async (req, res) => {
    try {
        const { name, email, password, branch, cgpa, backlogs } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Name, email and password are required"
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                message: "Password must be at least 8 characters"
            });
        }

        const existingUser = await User.findOne({
            email: email.trim().toLowerCase()
        });

        if (existingUser) {
            return res.status(409).json({
                message: "Email already registered"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const normalizedBranch = normalizeBranch(branch);

        const user = await User.create({
            name,
            email: email.trim().toLowerCase(),
            password: hashedPassword,
            branch: normalizedBranch,
            cgpa,
            backlogs,
            role: "student"
        });

        return res.status(201).json({
            message: "Student registered successfully",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                branch: user.branch,
                cgpa: user.cgpa,
                backlogs: user.backlogs
            }
        });
    } catch (error) {
        console.error("Registration error:", error.message);
        return res.status(500).json({
            message: "Server error during registration"
        });
    }
};




const jwt = require("jsonwebtoken");

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const user = await User.findOne({
            email: email.trim().toLowerCase()
        });

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const isMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!isMatch) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            {
                id: user._id,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        return res.status(200).json({
            message: "Login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                branch: user.branch,
                cgpa: user.cgpa,
                backlogs: user.backlogs
            }
        });
    } catch (error) {
        console.error("Login error:", error.message);
        return res.status(500).json({
            message: "Server error during login"
        });
    }
};



module.exports = { registerUser, loginUser };