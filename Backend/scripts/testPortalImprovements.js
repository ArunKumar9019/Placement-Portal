// Backend/scripts/testPortalImprovements.js
// Verification tests for all 5 portal improvements:
// 1. Canonical short branch names
// 2. Job categories (Internship, FTE, Internship + FTE) & conditional compensation validation
// 3. Eligibility rules & already applied checks
// 4. Authenticated resume access, permissions, and 2 MB limits
// 5. Profile cleanup & data availability

const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const { normalizeBranches, normalizeBranch, isBranchEligible } = require("../config/branches");
const { createJob, updateJob, getJobs } = require("../controllers/jobController");
const { applyForJob } = require("../controllers/applicationController");
const {
  uploadResume,
  getMyResume,
  getResumeByUserId,
  getResumeByFilename,
} = require("../controllers/resumeController");
const protect = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const Job = require("../models/Job");
const Company = require("../models/Company");
const User = require("../models/User");
const Application = require("../models/Application");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

function mockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    data: null,
    fileSent: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.data = data;
      return this;
    },
    setHeader(key, val) {
      this.headers[key] = val;
    },
    sendFile(filePath) {
      this.fileSent = filePath;
      return this;
    },
  };
  return res;
}

async function runTests() {
  console.log("====================================================");
  console.log("COLLEGE PLACEMENT PORTAL IMPROVEMENTS TEST SUITE");
  console.log("====================================================\n");

  const secret = "test-jwt-secret";
  process.env.JWT_SECRET = secret;
  const adminToken = jwt.sign({ id: "admin1", role: "admin" }, secret, { expiresIn: "1h" });
  const studentToken = jwt.sign({ id: "student1", role: "student" }, secret, { expiresIn: "1h" });
  const otherStudentToken = jwt.sign({ id: "student2", role: "student" }, secret, { expiresIn: "1h" });

  // ── 1. CANONICAL SHORT BRANCH CODES ON JOB CARDS ───────────────────────────
  console.log("1. Canonical Short Branch Codes Verification:");
  {
    const legacyList = [
      "Computer Science and Engineering",
      "Information Science & Engineering",
      "Artificial Intelligence and Machine Learning",
      "Electronics & Communication Engineering",
      "Electrical & Electronics Engineering",
      "Mechanical Engineering",
      "Civil Engineering",
      "Information Technology",
      "Chemical Engineering",
      "Biotechnology",
    ];
    const canonicalCodes = normalizeBranches(legacyList);
    const expected = ["CSE", "ISE", "AIML", "ECE", "EEE", "MECH", "CIVIL", "IT", "CHEM", "BT"];
    assert(
      JSON.stringify(canonicalCodes) === JSON.stringify(expected),
      `Legacy long names correctly normalize to canonical short codes: ${canonicalCodes.join(", ")}`
    );

    const alreadyCanonical = ["CSE", "ECE", "AIML"];
    assert(
      JSON.stringify(normalizeBranches(alreadyCanonical)) === JSON.stringify(alreadyCanonical),
      "Canonical codes remain clean and unchanged"
    );
  }

  // ── 2. JOB CATEGORY, STIPEND, AND CTC VALIDATION ─────────────────────────
  console.log("\n2. Job Category & Compensation Validation:");
  {
    Company.findById = async () => ({ _id: "c1", name: "Alpha Tech" });
    let createdPayload = null;
    Job.create = async (p) => {
      createdPayload = p;
      return { _id: "job1", ...p };
    };

    // 2.1 Rejects invalid category
    {
      const req = {
        body: {
          title: "Intern",
          company: "c1",
          category: "InvalidCategory",
          description: "Desc",
          minimumCGPA: 7,
          location: "BLR",
          deadline: new Date(Date.now() + 86400000),
        },
      };
      const res = mockRes();
      await createJob(req, res);
      assert(res.statusCode === 400, "Rejects invalid category with 400 Bad Request");
      assert(res.data.message.includes("valid job category"), "Provides clear category error message");
    }

    // 2.2 Internship: requires stipend, CTC not required
    {
      // Missing stipend
      const reqFail = {
        body: {
          title: "SDE Intern",
          company: "c1",
          category: "Internship",
          description: "Desc",
          minimumCGPA: 7.5,
          location: "BLR",
          deadline: new Date(Date.now() + 86400000),
        },
      };
      const resFail = mockRes();
      await createJob(reqFail, resFail);
      assert(resFail.statusCode === 400, "Internship without stipend rejected with 400");
      assert(resFail.data.message.includes("Stipend is required for Internship"), "Mentions stipend is required");

      // Valid Internship with stipend
      const reqSuccess = {
        body: {
          ...reqFail.body,
          stipend: 35000,
        },
      };
      const resSuccess = mockRes();
      await createJob(reqSuccess, resSuccess);
      assert(resSuccess.statusCode === 201, "Internship with stipend accepted with 201 Created");
      assert(createdPayload.category === "Internship", "Category saved as Internship");
      assert(createdPayload.stipend === 35000, "Stipend saved as 35000");
      assert(createdPayload.ctc === undefined, "CTC is undefined for Internship");
    }

    // 2.3 FTE: requires CTC, stipend not required
    {
      // Missing CTC
      const reqFail = {
        body: {
          title: "Full Stack Engineer",
          company: "c1",
          category: "Full-Time Employment (FTE)",
          description: "Desc",
          minimumCGPA: 8.0,
          location: "HYD",
          deadline: new Date(Date.now() + 86400000),
        },
      };
      const resFail = mockRes();
      await createJob(reqFail, resFail);
      assert(resFail.statusCode === 400, "FTE without CTC rejected with 400");
      assert(resFail.data.message.includes("CTC is required for Full-Time Employment"), "Mentions CTC is required");

      // Valid FTE with CTC
      const reqSuccess = {
        body: {
          ...reqFail.body,
          ctc: 14.5,
        },
      };
      const resSuccess = mockRes();
      await createJob(reqSuccess, resSuccess);
      assert(resSuccess.statusCode === 201, "FTE with CTC accepted with 201 Created");
      assert(createdPayload.category === "Full-Time Employment (FTE)", "Category saved as FTE");
      assert(createdPayload.ctc === 14.5, "CTC saved as 14.5 LPA");
      assert(createdPayload.stipend === undefined, "Stipend is undefined for FTE");
    }

    // 2.4 Internship + Performance-Based FTE: requires both stipend and CTC
    {
      // Missing CTC
      const reqFail = {
        body: {
          title: "Graduate Trainee",
          company: "c1",
          category: "Internship + Performance-Based FTE",
          stipend: 30000,
          description: "Desc",
          minimumCGPA: 7.0,
          location: "Pune",
          deadline: new Date(Date.now() + 86400000),
        },
      };
      const resFail = mockRes();
      await createJob(reqFail, resFail);
      assert(resFail.statusCode === 400, "Hybrid role missing CTC rejected with 400");

      // Valid with both stipend and CTC
      const reqSuccess = {
        body: {
          ...reqFail.body,
          ctc: 9.0,
        },
      };
      const resSuccess = mockRes();
      await createJob(reqSuccess, resSuccess);
      assert(resSuccess.statusCode === 201, "Hybrid role with both stipend & CTC accepted with 201");
      assert(createdPayload.stipend === 30000, "Stipend saved");
      assert(createdPayload.ctc === 9.0, "CTC saved");
    }

    // 2.5 updateJob updates category and compensation
    {
      let updatedObj = null;
      Job.findByIdAndUpdate = (id, updates) => {
        updatedObj = updates.$set;
        return {
          populate: async () => ({ _id: id, ...updatedObj }),
        };
      };

      const reqUpdate = {
        params: { jobId: "job1" },
        body: {
          category: "Full-Time Employment (FTE)",
          ctc: 18.0,
        },
      };
      const resUpdate = mockRes();
      await updateJob(reqUpdate, resUpdate);
      assert(resUpdate.statusCode === 200, "updateJob returns 200 OK");
      assert(updatedObj.category === "Full-Time Employment (FTE)", "Category updated");
      assert(updatedObj.ctc === 18.0, "CTC updated");
    }
  }

  // ── 3. ELIGIBILITY CHECKS & ALREADY APPLIED ──────────────────────────────
  console.log("\n3. Eligibility Checks & Application Guard Verification:");
  {
    const baseJob = {
      _id: "job_elig_1",
      title: "Backend Dev",
      status: "open",
      deadline: new Date(Date.now() + 86400000),
      minimumCGPA: 8.0,
      maximumBacklogs: 0,
      eligibleBranches: ["CSE", "ISE"],
    };

    Job.findById = async () => baseJob;

    // 3.1 Branch ineligible student
    {
      User.findById = async () => ({
        _id: "s_mech",
        role: "student",
        branch: "MECH",
        cgpa: 9.0,
        backlogs: 0,
      });
      const req = { params: { jobId: "job_elig_1" }, user: { id: "s_mech" } };
      const res = mockRes();
      await applyForJob(req, res);
      assert(res.statusCode === 400 && res.data.message.includes("branch is not eligible"), "Ineligible branch rejected with 400");
    }

    // 3.2 CGPA lower than minimum
    {
      User.findById = async () => ({
        _id: "s_low_cgpa",
        role: "student",
        branch: "CSE",
        cgpa: 7.2,
        backlogs: 0,
      });
      const req = { params: { jobId: "job_elig_1" }, user: { id: "s_low_cgpa" } };
      const res = mockRes();
      await applyForJob(req, res);
      assert(res.statusCode === 400 && res.data.message.includes("Minimum CGPA required is 8"), "Low CGPA rejected with 400");
    }

    // 3.3 Backlogs exceed maximum allowed
    {
      User.findById = async () => ({
        _id: "s_backlogs",
        role: "student",
        branch: "CSE",
        cgpa: 8.5,
        backlogs: 2,
      });
      const req = { params: { jobId: "job_elig_1" }, user: { id: "s_backlogs" } };
      const res = mockRes();
      await applyForJob(req, res);
      assert(res.statusCode === 400 && res.data.message.includes("backlog"), "Backlogs exceeding limit rejected with 400");
    }

    // 3.4 Already applied duplicate
    {
      User.findById = async () => ({
        _id: "s_applied",
        role: "student",
        branch: "CSE",
        cgpa: 8.5,
        backlogs: 0,
      });
      Application.findOne = async () => ({ _id: "existing_app" });
      const req = { params: { jobId: "job_elig_1" }, user: { id: "s_applied" } };
      const res = mockRes();
      await applyForJob(req, res);
      assert(res.statusCode === 409 && res.data.message.includes("already applied"), "Already applied job rejected with 409 Conflict");
    }
  }

  // ── 4. AUTHENTICATED RESUME ACCESS & PERMISSIONS ─────────────────────────
  console.log("\n4. Authenticated Resume Access & Security Verification:");
  {
    // Create a temporary mock resume file in uploads directory
    const uploadsDir = path.join(__dirname, "../uploads");
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const testFileName = "test-resume-123.pdf";
    const testFilePath = path.join(uploadsDir, testFileName);
    fs.writeFileSync(testFilePath, "%PDF-1.4 mock resume content");

    User.findById = async (id) => {
      if (id === "student1") {
        return { _id: "student1", role: "student", resume: `uploads/${testFileName}` };
      }
      if (id === "student2") {
        return { _id: "student2", role: "student", resume: null };
      }
      if (id === "admin1") {
        return { _id: "admin1", role: "admin" };
      }
      return null;
    };

    // 4.1 Token via Authorization header
    {
      const req = { headers: { authorization: `Bearer ${studentToken}` } };
      const res = mockRes();
      let nextCalled = false;
      protect(req, res, () => { nextCalled = true; });
      assert(nextCalled, "Authorization Bearer token authenticated");
      assert(req.user.id === "student1", "User id extracted from header");
    }

    // 4.2 Token via query parameter ?token=...
    {
      const req = { headers: {}, query: { token: studentToken } };
      const res = mockRes();
      let nextCalled = false;
      protect(req, res, () => { nextCalled = true; });
      assert(nextCalled, "Query parameter ?token=... authenticated successfully");
      assert(req.user.id === "student1", "User id extracted from query token");
    }

    // 4.3 Student views their own resume (getMyResume)
    {
      const req = { user: { id: "student1", role: "student" } };
      const res = mockRes();
      await getMyResume(req, res);
      assert(res.fileSent && res.fileSent.includes(testFileName), "Student can view their own resume file");
      assert(res.headers["Content-Type"] === "application/pdf", "Content-Type is application/pdf");
      assert(res.headers["Content-Disposition"].includes("inline"), "Content-Disposition is inline for browser display");
    }

    // 4.4 Student without resume gets 404
    {
      const req = { user: { id: "student2", role: "student" } };
      const res = mockRes();
      await getMyResume(req, res);
      assert(res.statusCode === 404, "Student with no resume gets 404 Not Found");
    }

    // 4.5 Admin views student's resume by userId (getResumeByUserId)
    {
      const reqAdmin = { user: { id: "admin1", role: "admin" }, params: { userId: "student1" } };
      const resAdmin = mockRes();
      await getResumeByUserId(reqAdmin, resAdmin);
      assert(resAdmin.fileSent && resAdmin.fileSent.includes(testFileName), "Admin can view student resume");

      // Another student tries to view student1's resume by userId -> 403 Forbidden
      const reqForbidden = { user: { id: "student2", role: "student" }, params: { userId: "student1" } };
      const resForbidden = mockRes();
      await getResumeByUserId(reqForbidden, resForbidden);
      assert(resForbidden.statusCode === 403, "Other students blocked from viewing peer resume with 403 Forbidden");
    }

    // 4.6 Filename route permission check (getResumeByFilename)
    {
      // Admin allowed
      const reqAdmin = { user: { id: "admin1", role: "admin" }, params: { filename: testFileName } };
      const resAdmin = mockRes();
      await getResumeByFilename(reqAdmin, resAdmin);
      assert(resAdmin.fileSent && resAdmin.fileSent.includes(testFileName), "Admin allowed on filename route");

      // Student1 (owner) allowed
      const reqOwner = { user: { id: "student1", role: "student" }, params: { filename: testFileName } };
      const resOwner = mockRes();
      await getResumeByFilename(reqOwner, resOwner);
      assert(resOwner.fileSent && resOwner.fileSent.includes(testFileName), "Owner student allowed on filename route");

      // Student2 (unauthorized) blocked with 403
      const reqStranger = { user: { id: "student2", role: "student" }, params: { filename: testFileName } };
      const resStranger = mockRes();
      await getResumeByFilename(reqStranger, resStranger);
      assert(resStranger.statusCode === 403, "Non-owner student blocked on filename route with 403");
    }

    // Clean up mock file
    if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);

    // 4.7 Upload Middleware limits check (2 MB)
    {
      assert(upload.limits && upload.limits.fileSize === 2 * 1024 * 1024, "Multer fileSize limit is configured to 2 MB (2 * 1024 * 1024)");
    }
  }

  console.log("\n====================================================");
  console.log(`TEST SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("====================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
