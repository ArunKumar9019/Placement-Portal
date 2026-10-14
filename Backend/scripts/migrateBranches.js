// Migration Script: Normalize legacy branch names in MongoDB to canonical values
// Run manually via: node scripts/migrateBranches.js (from Backend directory)
// NOTE: Does NOT run on server startup. Safe, idempotent, preserves all other fields.

const dotenv = require("dotenv");
dotenv.config();

const mongoose = require("mongoose");
const User = require("../models/User");
const Job = require("../models/Job");
const { normalizeBranch, normalizeBranches } = require("../config/branches");

async function migrate() {
  if (!process.env.MONGO_URI) {
    console.error("Error: MONGO_URI is not set in environment or .env");
    process.exit(1);
  }

  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected successfully.\n");

    // 1. Migrate Students
    console.log("── Migrating Students ──");
    const students = await User.find({ role: "student" });
    let studentsUpdated = 0;

    for (const student of students) {
      if (!student.branch) continue;

      const canonical = normalizeBranch(student.branch);
      if (canonical && canonical !== student.branch) {
        console.log(
          `Updating Student ${student._id} (${student.email}): "${student.branch}" -> "${canonical}"`
        );
        await User.updateOne(
          { _id: student._id },
          { $set: { branch: canonical } }
        );
        studentsUpdated++;
      }
    }
    console.log(
      `Finished students: ${studentsUpdated} updated out of ${students.length} checked.\n`
    );

    // 2. Migrate Jobs
    console.log("── Migrating Job Eligible Branches ──");
    const jobs = await Job.find({});
    let jobsUpdated = 0;

    for (const job of jobs) {
      if (!job.eligibleBranches || job.eligibleBranches.length === 0) continue;

      const normalized = normalizeBranches(job.eligibleBranches);
      const isDifferent =
        normalized.length !== job.eligibleBranches.length ||
        normalized.some((b, i) => b !== job.eligibleBranches[i]);

      if (isDifferent) {
        console.log(
          `Updating Job ${job._id} ("${job.title}"): [${job.eligibleBranches.join(
            ", "
          )}] -> [${normalized.join(", ")}]`
        );
        await Job.updateOne(
          { _id: job._id },
          { $set: { eligibleBranches: normalized } }
        );
        jobsUpdated++;
      }
    }
    console.log(
      `Finished jobs: ${jobsUpdated} updated out of ${jobs.length} checked.\n`
    );

    console.log("Migration complete!");
  } catch (error) {
    console.error("Migration error:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

migrate();
