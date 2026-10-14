// Focused verification tests for canonical branch mapping and integration
// Tests CSE, ISE, AIML, ECE, EEE, MECH, and CIVIL (and additional supported branches)

const {
  BRANCH_DEFINITIONS,
  CANONICAL_BRANCH_VALUES,
  normalizeBranch,
  normalizeBranches,
  getBranchLabel,
  getAllBranchAliases,
  getBranchOptions,
  isBranchEligible,
} = require('../config/branches');

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

console.log('====================================================');
console.log('PLACEHUB CANONICAL BRANCH INTEGRATION TEST SUITE');
console.log('====================================================\n');

// ── Test 1: Canonical Values Presence ─────────────────────────────
console.log('Test 1: Verification of Canonical Codes & Labels');
const targetBranches = ['CSE', 'ISE', 'AIML', 'ECE', 'EEE', 'MECH', 'CIVIL'];

for (const code of targetBranches) {
  assert(CANONICAL_BRANCH_VALUES.includes(code), `Canonical code ${code} exists in CANONICAL_BRANCH_VALUES`);
  const label = getBranchLabel(code);
  assert(label && label !== code, `Canonical code ${code} maps to friendly label: "${label}"`);
}

// ── Test 2: Normalization of Aliases & Variations ──────────────────
console.log('\nTest 2: Normalization of Aliases, Casing, and Punctuation');

const aliasTestCases = [
  // CSE
  { input: 'CSE', expected: 'CSE' },
  { input: 'cse', expected: 'CSE' },
  { input: ' Computer Science ', expected: 'CSE' },
  { input: 'computer science & engineering', expected: 'CSE' },
  { input: 'Computer Science and Engineering', expected: 'CSE' },
  { input: 'Computer Science Engg', expected: 'CSE' },

  // ISE
  { input: 'ISE', expected: 'ISE' },
  { input: 'ise', expected: 'ISE' },
  { input: 'Information Science', expected: 'ISE' },
  { input: 'Information Science & Engineering', expected: 'ISE' },
  { input: 'information science and engineering', expected: 'ISE' },
  { input: 'Information Science Engg', expected: 'ISE' },

  // AIML
  { input: 'AIML', expected: 'AIML' },
  { input: 'aiml', expected: 'AIML' },
  { input: 'AI/ML', expected: 'AIML' },
  { input: 'ai/ml', expected: 'AIML' },
  { input: 'AI & ML', expected: 'AIML' },
  { input: 'ai & ml', expected: 'AIML' },
  { input: 'AI and ML', expected: 'AIML' },
  { input: 'Artificial Intelligence and Machine Learning', expected: 'AIML' },
  { input: 'Artificial Intelligence & Machine Learning', expected: 'AIML' },

  // ECE
  { input: 'ECE', expected: 'ECE' },
  { input: 'ece', expected: 'ECE' },
  { input: 'Electronics and Communication', expected: 'ECE' },
  { input: 'Electronics & Communication', expected: 'ECE' },
  { input: 'Electronics and Communication Engineering', expected: 'ECE' },
  { input: 'Electronics & Communication Engineering', expected: 'ECE' },

  // EEE
  { input: 'EEE', expected: 'EEE' },
  { input: 'eee', expected: 'EEE' },
  { input: 'Electrical Engineering', expected: 'EEE' },
  { input: 'Electrical and Electronics', expected: 'EEE' },
  { input: 'Electrical & Electronics Engineering', expected: 'EEE' },
  { input: 'Electrical and Electronics Engineering', expected: 'EEE' },

  // MECH
  { input: 'MECH', expected: 'MECH' },
  { input: 'mech', expected: 'MECH' },
  { input: 'Mechanical', expected: 'MECH' },
  { input: 'Mechanical Engineering', expected: 'MECH' },
  { input: 'Mechanical Engg', expected: 'MECH' },

  // CIVIL
  { input: 'CIVIL', expected: 'CIVIL' },
  { input: 'civil', expected: 'CIVIL' },
  { input: 'Civil', expected: 'CIVIL' },
  { input: 'Civil Engineering', expected: 'CIVIL' },
  { input: 'Civil Engg', expected: 'CIVIL' },
];

for (const tc of aliasTestCases) {
  const result = normalizeBranch(tc.input);
  assert(result === tc.expected, `"${tc.input}" normalizes to "${tc.expected}" (got "${result}")`);
}

// ── Test 3: Array Normalization (Jobs eligibleBranches) ────────────
console.log('\nTest 3: normalizeBranches Array Handling');
const sampleArray = [
  'Computer Science',
  'CSE',
  'Information Science & Engineering',
  'AI/ML',
  'Civil Engineering',
  'CIVIL',
];
const normalizedArray = normalizeBranches(sampleArray);
assert(
  JSON.stringify(normalizedArray) === JSON.stringify(['CSE', 'ISE', 'AIML', 'CIVIL']),
  `Deduplicated canonical array matches ['CSE', 'ISE', 'AIML', 'CIVIL']: got ${JSON.stringify(normalizedArray)}`
);

// ── Test 4: Dropdown Options Structure ─────────────────────────────
console.log('\nTest 4: UI Dropdown Options Structure');
const options = getBranchOptions();
assert(Array.isArray(options) && options.length === BRANCH_DEFINITIONS.length, `Options length matches definitions (${options.length})`);
for (const opt of options) {
  assert(typeof opt.value === 'string' && typeof opt.label === 'string', `Option has { value: "${opt.value}", label: "${opt.label}" }`);
  assert(opt.value === opt.value.toUpperCase(), `Option value "${opt.value}" is uppercase canonical`);
}

// ── Test 5: Student Job Eligibility Logic ─────────────────────────
console.log('\nTest 5: isBranchEligible Eligibility Verification');

// Student ISE vs Job [ISE, CSE]
assert(isBranchEligible('ISE', ['ISE', 'CSE']), 'ISE student eligible for [ISE, CSE]');
// Student with legacy alias 'Information Science' vs Job [ISE]
assert(isBranchEligible('Information Science', ['ISE']), '"Information Science" student eligible for [ISE]');
// Student with canonical 'ISE' vs legacy job ['Information Science and Engineering']
assert(isBranchEligible('ISE', ['Information Science and Engineering']), 'ISE student eligible for legacy job ["Information Science and Engineering"]');
// Student AIML vs Job [AIML]
assert(isBranchEligible('AI/ML', ['Artificial Intelligence and Machine Learning']), '"AI/ML" student eligible for "Artificial Intelligence and Machine Learning" job');
// Student CIVIL vs Job [MECH, EEE] -> Not eligible
assert(!isBranchEligible('CIVIL', ['MECH', 'EEE']), 'CIVIL student NOT eligible for [MECH, EEE]');
// Job with empty eligible branches -> All branches eligible
assert(isBranchEligible('CIVIL', []), 'CIVIL student eligible for job with [] (all branches)');
assert(isBranchEligible('ISE', null), 'ISE student eligible for job with null (all branches)');

// ── Test 6: Database Query Aliases (MongoDB $in Compatibility) ─────
console.log('\nTest 6: getAllBranchAliases for MongoDB $in query');
for (const code of targetBranches) {
  const aliases = getAllBranchAliases(code);
  assert(aliases.includes(code), `${code} aliases include canonical "${code}"`);
  assert(aliases.includes(code.toLowerCase()), `${code} aliases include lowercase "${code.toLowerCase()}"`);
  assert(aliases.length > 2, `${code} has comprehensive alias list (total ${aliases.length} aliases)`);
}

// Check that searching for a legacy name like "Information Science" expands to all ISE aliases
const iseFromLongName = getAllBranchAliases('Information Science and Engineering');
assert(iseFromLongName.includes('ISE'), 'Searching by "Information Science and Engineering" returns ISE aliases');
assert(iseFromLongName.includes('Information Science'), 'Searching by "Information Science and Engineering" includes "Information Science"');

// ── Summary ───────────────────────────────────────────────────────
console.log('\n====================================================');
console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('====================================================');

if (failed > 0) {
  process.exit(1);
}
