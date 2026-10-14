// Controller integration verification (mocking Mongoose models to verify controller code paths)

const { registerUser } = require('../controllers/authController');
const { getProfile, updateProfile } = require('../controllers/userController');
const { createJob, getJobs, updateJob, getEffectiveStatus } = require('../controllers/jobController');
const { applyForJob } = require('../controllers/applicationController');
const User = require('../models/User');
const Job = require('../models/Job');
const Company = require('../models/Company');
const Application = require('../models/Application');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${msg}`);
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
    json(d) {
      this.data = d;
      return this;
    },
  };
  return res;
}

async function runControllerTests() {
  console.log('====================================================');
  console.log('CONTROLLER CODE PATH VERIFICATION TESTS');
  console.log('====================================================\n');

  // 1. Student Registration Controller
  console.log('1. Testing registerUser with alias "Information Science & Engineering"');
  let createdUserPayload = null;
  User.findOne = async () => null; // No existing user
  User.create = async (payload) => {
    createdUserPayload = payload;
    return {
      _id: 'user123',
      name: payload.name,
      email: payload.email,
      role: 'student',
      branch: payload.branch,
      cgpa: payload.cgpa,
      backlogs: payload.backlogs,
    };
  };

  const regReq = {
    body: {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      branch: 'Information Science & Engineering',
      cgpa: 8.5,
      backlogs: 0,
    },
  };
  const regRes = mockRes();
  await registerUser(regReq, regRes);

  assert(regRes.statusCode === 201, `registerUser returns 201 Created (got ${regRes.statusCode})`);
  assert(createdUserPayload.branch === 'ISE', `User.create called with canonical branch "ISE" (got "${createdUserPayload.branch}")`);
  assert(regRes.data.user.branch === 'ISE', `Response user object contains canonical branch "ISE" (got "${regRes.data.user.branch}")`);

  // 2. Profile Controller (getProfile & updateProfile)
  console.log('\n2. Testing getProfile and updateProfile');
  User.findById = (id) => ({
    select: async () => ({
      _id: id,
      name: 'Jane Doe',
      email: 'jane@example.com',
      role: 'student',
      branch: 'Computer Science and Engineering', // Legacy alias in DB
      cgpa: 9.0,
      backlogs: 0,
      resume: 'uploads/res.pdf',
    }),
  });

  const getProfReq = { user: { id: 'user456' } };
  const getProfRes = mockRes();
  await getProfile(getProfReq, getProfRes);

  assert(getProfRes.statusCode === 200, `getProfile returns 200 OK`);
  assert(getProfRes.data.user.branch === 'CSE', `Legacy branch in DB normalized to canonical "CSE" (got "${getProfRes.data.user.branch}")`);
  assert(getProfRes.data.user.branchLabel === 'Computer Science and Engineering', `branchLabel provides readable label "Computer Science and Engineering"`);

  // Test updateProfile
  let updateSetPayload = null;
  User.findByIdAndUpdate = (id, updateObj) => {
    updateSetPayload = updateObj.$set;
    return {
      select: async () => ({
        _id: id,
        name: updateSetPayload.name || 'Jane Doe',
        email: 'jane@example.com',
        role: 'student',
        branch: updateSetPayload.branch,
        cgpa: updateSetPayload.cgpa,
        backlogs: updateSetPayload.backlogs,
      }),
    };
  };

  const updateProfReq = {
    user: { id: 'user456' },
    body: {
      branch: 'Artificial Intelligence and Machine Learning', // Alias input
      cgpa: 8.8,
      backlogs: 0,
    },
  };
  const updateProfRes = mockRes();
  await updateProfile(updateProfReq, updateProfRes);

  assert(updateProfRes.statusCode === 200, `updateProfile returns 200 OK`);
  assert(updateSetPayload.branch === 'AIML', `updateProfile normalizes branch to "AIML" before DB update (got "${updateSetPayload.branch}")`);
  assert(updateProfRes.data.user.branch === 'AIML', `updateProfile response contains "AIML"`);
  assert(updateProfRes.data.user.branchLabel === 'Artificial Intelligence and Machine Learning', `updateProfile response contains full readable branchLabel`);

  // 3. Admin Job Creation and Update Controller
  console.log('\n3. Testing createJob and updateJob');
  Company.findById = async () => ({ _id: 'comp1', name: 'Acme Corp' });
  let createdJobPayload = null;
  Job.create = async (payload) => {
    createdJobPayload = payload;
    return { _id: 'job1', ...payload };
  };

  const createJobReq = {
    body: {
      title: 'DevOps Engineer',
      company: 'comp1',
      category: 'Full-Time Employment (FTE)',
      ctc: 12.0,
      description: 'Role desc',
      eligibleBranches: ['Computer Science', 'Information Technology', 'ECE'], // Mixed aliases and canonical
      minimumCGPA: 7.0,
      maximumBacklogs: 1,
      location: 'Bangalore',
      deadline: new Date(Date.now() + 86400000),
    },
  };
  const createJobRes = mockRes();
  await createJob(createJobReq, createJobRes);

  assert(createJobRes.statusCode === 201, `createJob returns 201 Created`);
  assert(createdJobPayload.category === 'Full-Time Employment (FTE)', `createJob stores category`);
  assert(createdJobPayload.ctc === 12.0, `createJob stores ctc`);
  assert(
    JSON.stringify(createdJobPayload.eligibleBranches) === JSON.stringify(['CSE', 'IT', 'ECE']),
    `Job created with deduplicated canonical branches ['CSE', 'IT', 'ECE'] (got ${JSON.stringify(createdJobPayload.eligibleBranches)})`
  );

  // Test updateJob
  let updatedJobSet = null;
  Job.findByIdAndUpdate = (id, updateObj) => {
    updatedJobSet = updateObj.$set;
    return {
      populate: async () => ({ _id: id, ...updatedJobSet }),
    };
  };

  const updateJobReq = {
    params: { jobId: 'job1' },
    body: {
      eligibleBranches: ['Mechanical Engineering', 'MECH', 'Civil'],
    },
  };
  const updateJobRes = mockRes();
  await updateJob(updateJobReq, updateJobRes);

  assert(updateJobRes.statusCode === 200, `updateJob returns 200 OK`);
  assert(
    JSON.stringify(updatedJobSet.eligibleBranches) === JSON.stringify(['MECH', 'CIVIL']),
    `Job updated with normalized canonical branches ['MECH', 'CIVIL'] (got ${JSON.stringify(updatedJobSet.eligibleBranches)})`
  );

  // 4. Job Search & Filter Controller (getJobs)
  console.log('\n4. Testing getJobs branch filter logic');
  let capturedFilter = null;
  Job.find = (filter) => {
    capturedFilter = filter;
    return {
      populate: () => ({
        sort: async () => [{ _id: 'job1', title: 'SWE', eligibleBranches: ['CSE', 'ISE'] }],
      }),
    };
  };

  const getJobsReq = {
    query: {
      branch: 'Information Science', // User searches by legacy alias
    },
  };
  const getJobsRes = mockRes();
  await getJobs(getJobsReq, getJobsRes);

  assert(getJobsRes.statusCode === 200, `getJobs returns 200 OK`);
  assert(capturedFilter.eligibleBranches && capturedFilter.eligibleBranches.$in, `getJobs constructs $in query for eligibleBranches`);
  assert(capturedFilter.eligibleBranches.$in.includes('ISE'), `$in query includes canonical "ISE"`);
  assert(capturedFilter.eligibleBranches.$in.includes('Information Science'), `$in query includes legacy alias "Information Science"`);
  assert(capturedFilter.eligibleBranches.$in.includes('ise'), `$in query includes lowercase "ise"`);

  // 5. Student Application Eligibility Controller (applyForJob)
  console.log('\n5. Testing applyForJob branch eligibility check');
  Application.findOne = async () => null; // Not already applied
  let createdApp = null;
  Application.create = async (p) => {
    createdApp = p;
    return { _id: 'app1', ...p };
  };

  // Case A: Student has legacy 'Information Science', Job has canonical ['ISE', 'CSE'] -> Eligible
  User.findById = async () => ({
    _id: 'stud1',
    role: 'student',
    branch: 'Information Science', // Legacy alias
    cgpa: 8.5,
    backlogs: 0,
  });
  Job.findById = async () => ({
    _id: 'job1',
    status: 'open',
    deadline: new Date(Date.now() + 86400000),
    minimumCGPA: 7.0,
    maximumBacklogs: 1,
    eligibleBranches: ['ISE', 'CSE'],
  });

  const applyReq1 = {
    user: { id: 'stud1' },
    params: { jobId: 'job1' },
  };
  const applyRes1 = mockRes();
  await applyForJob(applyReq1, applyRes1);
  assert(applyRes1.statusCode === 201, `Legacy alias "Information Science" student successfully applies to ['ISE', 'CSE'] job`);

  // Case B: Student has canonical 'CIVIL', Job has ['CSE', 'ISE'] -> Ineligible (400)
  User.findById = async () => ({
    _id: 'stud2',
    role: 'student',
    branch: 'CIVIL',
    cgpa: 8.5,
    backlogs: 0,
  });
  const applyRes2 = mockRes();
  await applyForJob(applyReq1, applyRes2);
  assert(applyRes2.statusCode === 400, `CIVIL student rejected with 400 (got ${applyRes2.statusCode})`);
  assert(applyRes2.data.message === 'Your branch is not eligible for this job', `Rejection message correct`);

  // Case C: Student has canonical 'MECH', Job has legacy ['Mechanical Engineering'] -> Eligible
  User.findById = async () => ({
    _id: 'stud3',
    role: 'student',
    branch: 'MECH',
    cgpa: 8.5,
    backlogs: 0,
  });
  Job.findById = async () => ({
    _id: 'job2',
    status: 'open',
    deadline: new Date(Date.now() + 86400000),
    minimumCGPA: 7.0,
    maximumBacklogs: 1,
    eligibleBranches: ['Mechanical Engineering'], // Legacy string
  });
  const applyRes3 = mockRes();
  await applyForJob({ user: { id: 'stud3' }, params: { jobId: 'job2' } }, applyRes3);
  assert(applyRes3.statusCode === 201, `Canonical "MECH" student successfully applies to legacy ["Mechanical Engineering"] job`);

  // 6. Closed-Job Visibility & Reopening (includeAll and status updates)
  console.log('\n6. Testing closed-job visibility and reopening logic');

  // 6.1 Student request without includeAll -> only open and future deadlines
  {
    capturedFilter = null;
    const req = {
      user: { id: 'stud1', role: 'student' },
      query: {},
    };
    const res = mockRes();
    await getJobs(req, res);
    assert(res.statusCode === 200, 'Student getJobs returns 200 OK');
    assert(capturedFilter.status === 'open', 'Student filter restricts status to "open"');
    assert(capturedFilter.deadline && capturedFilter.deadline.$gte, 'Student filter restricts deadline to future dates');
  }

  // 6.2 Student request with includeAll=true -> cannot bypass open filter
  {
    capturedFilter = null;
    const req = {
      user: { id: 'stud1', role: 'student' },
      query: { includeAll: 'true' },
    };
    const res = mockRes();
    await getJobs(req, res);
    assert(res.statusCode === 200, 'Student getJobs with includeAll returns 200 OK');
    assert(capturedFilter.status === 'open', 'Student cannot bypass open filter (status still "open")');
    assert(capturedFilter.deadline && capturedFilter.deadline.$gte, 'Student cannot bypass deadline filter (deadline still $gte now)');
  }

  // 6.3 Admin request without includeAll -> defaults to open and future deadlines
  {
    capturedFilter = null;
    const req = {
      user: { id: 'admin1', role: 'admin' },
      query: {},
    };
    const res = mockRes();
    await getJobs(req, res);
    assert(res.statusCode === 200, 'Admin getJobs without includeAll returns 200 OK');
    assert(capturedFilter.status === 'open', 'Admin without includeAll gets only open jobs');
    assert(capturedFilter.deadline && capturedFilter.deadline.$gte, 'Admin without includeAll gets future deadline jobs');
  }

  // 6.4 Admin request with includeAll=true -> sees all jobs including closed and past deadlines
  {
    capturedFilter = null;
    const req = {
      user: { id: 'admin1', role: 'admin' },
      query: { includeAll: 'true' },
    };
    const res = mockRes();
    await getJobs(req, res);
    assert(res.statusCode === 200, 'Admin getJobs with includeAll returns 200 OK');
    assert(capturedFilter.status === undefined, 'Admin filter does NOT restrict status to "open"');
    assert(capturedFilter.deadline === undefined, 'Admin filter does NOT restrict deadline to future dates');
  }

  // 6.5 Admin edits closed job and reopens it (status -> 'open')
  {
    let updatedSet = null;
    Job.findByIdAndUpdate = (id, updateObj) => {
      updatedSet = updateObj.$set;
      return {
        populate: async () => ({ _id: id, status: updatedSet.status, ...updatedSet }),
      };
    };

    const reopenReq = {
      params: { jobId: 'closedJob1' },
      body: {
        status: 'open',
        category: 'Full-Time Employment (FTE)',
        ctc: 15.0,
      },
    };
    const reopenRes = mockRes();
    await updateJob(reopenReq, reopenRes);
    assert(reopenRes.statusCode === 200, 'Reopening closed job returns 200 OK');
    assert(updatedSet.status === 'open', 'Job status updated to "open"');
    assert(updatedSet.ctc === 15.0, 'Validation and fields preserved when reopening');

    // 6.6 Invalid status rejected with 400
    const invalidStatusReq = {
      params: { jobId: 'job1' },
      body: { status: 'archived' },
    };
    const invalidStatusRes = mockRes();
    await updateJob(invalidStatusReq, invalidStatusRes);
    assert(invalidStatusRes.statusCode === 400, 'Invalid status rejected with 400');
    assert(invalidStatusRes.data.message.includes('Status must be either'), 'Clear error message for invalid status');
  }

  // 7. Effective Status & Application Deadline Enforcement Tests
  console.log('\n7. Testing effective status calculation and application deadline enforcement');

  // 7.1 getEffectiveStatus behavior
  {
    const futureDate = new Date(Date.now() + 86400000);
    const pastDate = new Date(Date.now() - 86400000);

    assert(getEffectiveStatus({ status: 'closed', deadline: futureDate }) === 'closed', 'Closed job with future deadline has effectiveStatus "closed"');
    assert(getEffectiveStatus({ status: 'closed', deadline: pastDate }) === 'closed', 'Closed job with past deadline has effectiveStatus "closed"');
    assert(getEffectiveStatus({ status: 'open', deadline: pastDate }) === 'expired', 'Open job with past deadline has effectiveStatus "expired"');
    assert(getEffectiveStatus({ status: 'open', deadline: futureDate }) === 'open', 'Open job with future deadline has effectiveStatus "open"');
    assert(getEffectiveStatus({ deadline: pastDate }) === 'expired', 'Job without explicit status with past deadline has effectiveStatus "expired"');
    assert(getEffectiveStatus({ deadline: futureDate }) === 'open', 'Job without explicit status with future deadline has effectiveStatus "open"');
    assert(getEffectiveStatus(null) === 'closed', 'Null job returns "closed"');
  }

  // 7.2 Application attempts after deadline & on closed jobs
  {
    User.findById = async () => ({
      _id: 'stud_deadline',
      role: 'student',
      branch: 'CSE',
      cgpa: 8.5,
      backlogs: 0,
    });
    Application.findOne = async () => null; // Not already applied
    let appCreated = false;
    Application.create = async () => {
      appCreated = true;
      return { _id: 'app_new' };
    };

    // Case A: Job status is 'open', but deadline is in the past
    Job.findById = async () => ({
      _id: 'job_past',
      status: 'open',
      deadline: new Date(Date.now() - 100000), // In the past
      minimumCGPA: 7.0,
      maximumBacklogs: 0,
      eligibleBranches: ['CSE'],
    });

    const applyPastReq = { user: { id: 'stud_deadline' }, params: { jobId: 'job_past' } };
    const applyPastRes = mockRes();
    await applyForJob(applyPastReq, applyPastRes);
    assert(applyPastRes.statusCode === 400, 'Expired open job application attempt rejected with 400 (got ' + applyPastRes.statusCode + ')');
    assert(applyPastRes.data.message === 'Application deadline has passed', 'Rejection message is "Application deadline has passed"');
    assert(!appCreated, 'Application record not created for expired job');

    // Case B: Job status is 'closed', even with future deadline
    Job.findById = async () => ({
      _id: 'job_closed',
      status: 'closed',
      deadline: new Date(Date.now() + 86400000), // In future
      minimumCGPA: 7.0,
      maximumBacklogs: 0,
      eligibleBranches: ['CSE'],
    });

    const applyClosedReq = { user: { id: 'stud_deadline' }, params: { jobId: 'job_closed' } };
    const applyClosedRes = mockRes();
    await applyForJob(applyClosedReq, applyClosedRes);
    assert(applyClosedRes.statusCode === 400, 'Closed job application attempt rejected with 400');
    assert(applyClosedRes.data.message === 'This job is closed', 'Rejection message is "This job is closed"');

    // Case C: Open job with future deadline succeeds
    Job.findById = async () => ({
      _id: 'job_valid_open',
      status: 'open',
      deadline: new Date(Date.now() + 86400000),
      minimumCGPA: 7.0,
      maximumBacklogs: 0,
      eligibleBranches: ['CSE'],
    });

    const applyValidReq = { user: { id: 'stud_deadline' }, params: { jobId: 'job_valid_open' } };
    const applyValidRes = mockRes();
    await applyForJob(applyValidReq, applyValidRes);
    assert(applyValidRes.statusCode === 201, 'Open job with future deadline succeeds with 201 Created');
    assert(appCreated, 'Application record successfully created');
  }

  // 7.3 Admin edits expired job to reopen or close it
  {
    let savedUpdates = null;
    Job.findByIdAndUpdate = (id, updateObj) => {
      savedUpdates = updateObj.$set;
      return {
        populate: async () => ({ _id: id, ...savedUpdates }),
      };
    };

    // Admin extends deadline to reopen expired job
    const newFutureDeadline = new Date(Date.now() + 7 * 86400000);
    const extendReq = {
      params: { jobId: 'job_expired_to_open' },
      body: {
        deadline: newFutureDeadline,
        status: 'open',
      },
    };
    const extendRes = mockRes();
    await updateJob(extendReq, extendRes);
    assert(extendRes.statusCode === 200, 'Admin extending deadline returns 200 OK');
    assert(savedUpdates.status === 'open', 'Status kept as "open"');
    assert(getEffectiveStatus(savedUpdates) === 'open', 'Effective status becomes "open" after extending deadline');

    // Admin explicitly closes expired job
    const closeReq = {
      params: { jobId: 'job_expired_to_closed' },
      body: {
        status: 'closed',
      },
    };
    const closeRes = mockRes();
    await updateJob(closeReq, closeRes);
    assert(closeRes.statusCode === 200, 'Admin explicitly closing job returns 200 OK');
    assert(savedUpdates.status === 'closed', 'Status updated to "closed"');
    assert(getEffectiveStatus(savedUpdates) === 'closed', 'Effective status is "closed"');
  }

  console.log('\n====================================================');
  console.log(`CONTROLLER TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');
  if (failed > 0) process.exit(1);
}

runControllerTests().catch((e) => {
  console.error('Test execution error:', e);
  process.exit(1);
});
