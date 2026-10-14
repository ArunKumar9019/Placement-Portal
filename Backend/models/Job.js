
const mongoose = require("mongoose");
const { normalizeBranch } = require("../config/branches");

const jobSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },

        company: {
            type: mongoose.Schema.Types.ObjectId,  //The company field references a Company document in MongoDB using its ObjectId.
            ref: "Company",
            required: true
        },

        description: {
            type: String,
            required: true
        },

        category: {
            type: String,
            enum: [
                "Internship",
                "Full-Time Employment (FTE)",
                "Internship + Performance-Based FTE"
            ]
        },

        stipend: {
            type: Number,
            min: 0
        },

        ctc: {
            type: Number,
            min: 0
        },

        eligibleBranches: [{
            type: String,
            set: (v) => normalizeBranch(v)
        }],

        minimumCGPA: {
            type: Number,
            min: 0,
            max: 10,
            required: true
        },

        maximumBacklogs: {
            type: Number,
            min: 0,
            default: 0
        },

        location: {
            type: String,
            required: true
        },

        deadline: {
            type: Date,
            required: true
        },

        status: {
            type: String,
            enum: ["open", "closed"],
            default: "open"
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

function getEffectiveStatus(job) {
    if (!job) return "closed";
    if (job.status === "closed") return "closed";
    if (job.deadline && new Date(job.deadline).getTime() < Date.now()) {
        return "expired";
    }
    return "open";
}

jobSchema.virtual("effectiveStatus").get(function () {
    return getEffectiveStatus(this);
});

const Job = mongoose.model("Job", jobSchema);
Job.getEffectiveStatus = getEffectiveStatus;

module.exports = Job;
