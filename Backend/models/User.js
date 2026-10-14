
const mongoose = require("mongoose");
const { normalizeBranch } = require("../config/branches");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        password: {
            type: String,
            required: true,
            minlength: 8
        },

        role: {
            type: String,
            enum: ["student", "admin"],
            default: "student"
        },

        branch: {
            type: String,
            default: "",
            set: (v) => normalizeBranch(v)
        },

        cgpa: {
            type: Number,
            min: 0,
            max: 10,
            default: 0
        },

        backlogs: {
            type: Number,
            min: 0,
            default: 0
        },

        resume: {
            type: String,
            default: ""
        }

    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("User", userSchema);
