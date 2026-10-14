// Backend/scripts/testAdminApplications.js
// Verification tests for Admin Applications end-to-end features:
// 1. Route definitions & middleware stack
// 2. JWT auth & role-based access control (Admin allowed, Student blocked with 403)
// 3. Controller getAllApplications populated fields and sorting
// 4. Controller updateApplicationStatus with all allowed statuses and validation

const jwt = require("jsonwebtoken");
const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");
const applicationRoutes = require("../routes/applicationRoutes");
const { getAllApplications, updateApplicationStatus } = require("../controllers/applicationController");
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
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.data = data;
      return this;
    },
  };
  return res;
}

async function runTests() {
  console.log("====================================================");
  console.log("ADMIN APPLICATIONS ENDPOINT & PERMISSION TESTS");
  console.log("====================================================\n");

  const secret = process.env.JWT_SECRET || "test-jwt-secret-for-verification";
  process.env.JWT_SECRET = secret;

  const adminToken = jwt.sign({ id: "admin123", role: "admin" }, secret, { expiresIn: "1h" });
  const studentToken = jwt.sign({ id: "student456", role: "student" }, secret, { expiresIn: "1h" });

  // ── 1. ROUTE DEFINITIONS & STACK ──────────────────────────────────────────
  console.log("1. Checking route definitions in applicationRoutes.js:");
  const getRootRoute = applicationRoutes.stack.find(
    (layer) => layer.route && layer.route.path === "/" && layer.route.methods.get
  );
  assert(!!getRootRoute, "GET / route is registered in applicationRoutes");
  assert(getRootRoute && getRootRoute.route.stack.length === 3, "GET / has exactly 3 handlers: protect, authorizeRoles, getAllApplications");

  const patchStatusRoute = applicationRoutes.stack.find(
    (layer) => layer.route && layer.route.path === "/:applicationId/status" && layer.route.methods.patch
  );
  assert(!!patchStatusRoute, "PATCH /:applicationId/status route is registered");

  // ── 2. ROLE & AUTH MIDDLEWARE TESTS ───────────────────────────────────────
  console.log("\n2. Testing JWT auth & role protection:");

  // 2.1 Unauthenticated request (no token)
  {
    const req = { headers: {} };
    const res = mockRes();
    let nextCalled = false;
    protect(req, res, () => { nextCalled = true; });
    assert(res.statusCode === 401, "Unauthenticated request returns 401");
    assert(res.data && res.data.message.includes("Token missing"), "Returns 'Token missing' message");
    assert(!nextCalled, "Next handler is not invoked when unauthenticated");
  }

  // 2.2 Student token passed to protect + authorizeRoles("admin")
  {
    const req = { headers: { authorization: `Bearer ${studentToken}` } };
    const res = mockRes();
    let protectNext = false;
    protect(req, res, () => { protectNext = true; });
    assert(protectNext, "Valid student token passes protect middleware");
    assert(req.user && req.user.role === "student", "req.user decoded as student");

    const roleMiddleware = authorizeRoles("admin");
    let roleNext = false;
    roleMiddleware(req, res, () => { roleNext = true; });
    assert(res.statusCode === 403, "Student is blocked with 403 Forbidden");
    assert(res.data && res.data.message.includes("insufficient permissions"), "Returns 'Access denied: insufficient permissions'");
    assert(!roleNext, "Next handler is not invoked for student");
  }

  // 2.3 Admin token passed to protect + authorizeRoles("admin")
  {
    const req = { headers: { authorization: `Bearer ${adminToken}` } };
    const res = mockRes();
    let protectNext = false;
    protect(req, res, () => { protectNext = true; });
    assert(protectNext, "Valid admin token passes protect middleware");
    assert(req.user && req.user.role === "admin", "req.user decoded as admin");

    const roleMiddleware = authorizeRoles("admin");
    let roleNext = false;
    roleMiddleware(req, res, () => { roleNext = true; });
    assert(roleNext, "Admin is authorized to proceed to controller");
  }

  // ── 3. CONTROLLER getAllApplications TESTS ───────────────────────────────
  console.log("\n3. Testing getAllApplications controller logic & population:");
  {
    const mockDbApplications = [
      {
        _id: "app001",
        student: { _id: "s1", name: "Alice Smith", email: "alice@example.com", branch: "CSE", cgpa: 9.1 },
        job: {
          _id: "j1",
          title: "Full Stack Engineer",
          location: "Bengaluru",
          company: { _id: "c1", name: "TechCorp", location: "Bengaluru" }
        },
        status: "Applied",
        createdAt: new Date("2026-10-10T10:00:00Z"),
      },
      {
        _id: "app002",
        student: { _id: "s2", name: "Bob Jones", email: "bob@example.com", branch: "ECE", cgpa: 8.4 },
        job: {
          _id: "j2",
          title: "Embedded Systems Intern",
          location: "Hyderabad",
          company: { _id: "c2", name: "InnovateLabs", location: "Hyderabad" }
        },
        status: "Shortlisted",
        createdAt: new Date("2026-10-12T14:30:00Z"),
      }
    ];

    let populateCalls = [];
    let sortCalled = null;

    // Mock Application.find query chaining
    Application.find = () => {
      const queryObj = {
        populate(arg1, arg2) {
          populateCalls.push({ arg1, arg2 });
          return queryObj;
        },
        sort(sortArg) {
          sortCalled = sortArg;
          return Promise.resolve(mockDbApplications);
        }
      };
      return queryObj;
    };

    const req = { user: { id: "admin123", role: "admin" } };
    const res = mockRes();

    await getAllApplications(req, res);

    assert(res.statusCode === 200, "getAllApplications responds with 200 OK");
    assert(res.data && res.data.count === 2, "Response includes correct count (2)");
    assert(res.data && res.data.applications.length === 2, "Response includes all applications");
    assert(sortCalled && sortCalled.createdAt === -1, "Applications are sorted by createdAt descending (-1)");

    const firstApp = res.data.applications[0];
    assert(firstApp.student.name === "Alice Smith" && firstApp.student.email === "alice@example.com", "Student name and email are populated");
    assert(firstApp.job.title === "Full Stack Engineer" && firstApp.job.location === "Bengaluru", "Job title and location are populated");
    assert(firstApp.job.company.name === "TechCorp", "Company name is populated through nested population");
    assert(firstApp.status === "Applied", "Application status is returned");
    assert(!!firstApp.createdAt, "Application creation date is returned");
  }

  // ── 4. CONTROLLER updateApplicationStatus TESTS ──────────────────────────
  console.log("\n4. Testing updateApplicationStatus controller validation & status transitions:");
  {
    const validStatuses = ["Applied", "Shortlisted", "Interview", "Selected", "Rejected"];

    for (const st of validStatuses) {
      Application.findByIdAndUpdate = async (id, update, opts) => {
        return {
          _id: id,
          status: update.status,
          student: "s1",
          job: "j1",
        };
      };

      const req = {
        params: { applicationId: "app001" },
        body: { status: st }
      };
      const res = mockRes();

      await updateApplicationStatus(req, res);
      assert(res.statusCode === 200 && res.data.application.status === st, `Accepts valid status: "${st}"`);
    }

    // Invalid status test
    {
      const req = {
        params: { applicationId: "app001" },
        body: { status: "InvalidStatusCandidate" }
      };
      const res = mockRes();

      await updateApplicationStatus(req, res);
      assert(res.statusCode === 400, "Rejects invalid status with 400 Bad Request");
      assert(res.data && res.data.message === "Invalid application status", "Returns 'Invalid application status' error message");
    }

    // Non-existent application test
    {
      Application.findByIdAndUpdate = async () => null;

      const req = {
        params: { applicationId: "nonexistent_app" },
        body: { status: "Selected" }
      };
      const res = mockRes();

      await updateApplicationStatus(req, res);
      assert(res.statusCode === 404, "Returns 404 when application does not exist");
      assert(res.data && res.data.message === "Application not found", "Returns 'Application not found' message");
    }
  }

  console.log("\n====================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("====================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
