// Centralized Canonical Branch Mapping and Utilities for PlaceHub Frontend
// All UI components, filters, forms, and display cards use these functions.

export const BRANCH_DEFINITIONS = [
  {
    value: 'CSE',
    label: 'Computer Science and Engineering',
    aliases: [
      'CSE',
      'CS',
      'Computer Science',
      'Computer Science and Engineering',
      'Computer Science & Engineering',
      'Computer Science Engineering',
      'Computer Science and Engg',
      'Computer Science & Engg',
    ],
  },
  {
    value: 'ISE',
    label: 'Information Science and Engineering',
    aliases: [
      'ISE',
      'IS',
      'Information Science',
      'Information Science and Engineering',
      'Information Science & Engineering',
      'Information Science Engineering',
      'Information Science and Engg',
      'Information Science & Engg',
    ],
  },
  {
    value: 'AIML',
    label: 'Artificial Intelligence and Machine Learning',
    aliases: [
      'AIML',
      'AI/ML',
      'AI & ML',
      'AI ML',
      'AI and ML',
      'Artificial Intelligence and Machine Learning',
      'Artificial Intelligence & Machine Learning',
      'Artificial Intelligence Machine Learning',
    ],
  },
  {
    value: 'ECE',
    label: 'Electronics and Communication Engineering',
    aliases: [
      'ECE',
      'EC',
      'Electronics and Communication',
      'Electronics & Communication',
      'Electronics and Communication Engineering',
      'Electronics & Communication Engineering',
      'Electronics Communication Engineering',
      'Electronics and Communication Engg',
    ],
  },
  {
    value: 'EEE',
    label: 'Electrical and Electronics Engineering',
    aliases: [
      'EEE',
      'EE',
      'Electrical and Electronics',
      'Electrical & Electronics',
      'Electrical and Electronics Engineering',
      'Electrical & Electronics Engineering',
      'Electrical Electronics Engineering',
      'Electrical Engineering',
    ],
  },
  {
    value: 'MECH',
    label: 'Mechanical Engineering',
    aliases: [
      'MECH',
      'ME',
      'Mechanical',
      'Mechanical Engineering',
      'Mechanical Engg',
    ],
  },
  {
    value: 'CIVIL',
    label: 'Civil Engineering',
    aliases: [
      'CIVIL',
      'CV',
      'Civil',
      'Civil Engineering',
      'Civil Engg',
    ],
  },
  {
    value: 'IT',
    label: 'Information Technology',
    aliases: [
      'IT',
      'Information Technology',
    ],
  },
  {
    value: 'CHEM',
    label: 'Chemical Engineering',
    aliases: [
      'CHEM',
      'CH',
      'Chemical',
      'Chemical Engineering',
      'Chemical Engg',
    ],
  },
  {
    value: 'BT',
    label: 'Biotechnology',
    aliases: [
      'BT',
      'Biotech',
      'Biotechnology',
      'Bio Technology',
      'Bio-Technology',
    ],
  },
  {
    value: 'OTHER',
    label: 'Other',
    aliases: [
      'OTHER',
      'Other',
    ],
  },
];

function cleanBranchString(input) {
  if (typeof input !== 'string') return '';
  return input
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\bengg\b/g, 'engineering')
    .replace(/[/\\._-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const ALIAS_TO_CANONICAL_MAP = new Map();
const CANONICAL_TO_LABEL_MAP = new Map();
const CANONICAL_TO_ALIASES_MAP = new Map();

for (const def of BRANCH_DEFINITIONS) {
  CANONICAL_TO_LABEL_MAP.set(def.value, def.label);
  CANONICAL_TO_ALIASES_MAP.set(def.value, [def.value, ...def.aliases]);
  ALIAS_TO_CANONICAL_MAP.set(cleanBranchString(def.value), def.value);

  for (const alias of def.aliases) {
    const cleaned = cleanBranchString(alias);
    if (cleaned) {
      ALIAS_TO_CANONICAL_MAP.set(cleaned, def.value);
    }
  }
}

export const CANONICAL_BRANCH_VALUES = BRANCH_DEFINITIONS.map((b) => b.value);

/**
 * Normalizes any branch string to its canonical value (e.g., 'Computer Science' -> 'CSE').
 */
export function normalizeBranch(input) {
  if (!input || typeof input !== 'string') return '';
  const cleaned = cleanBranchString(input);
  if (!cleaned) return '';
  if (ALIAS_TO_CANONICAL_MAP.has(cleaned)) {
    return ALIAS_TO_CANONICAL_MAP.get(cleaned);
  }
  return input.trim();
}

/**
 * Normalizes an array of branches into a deduplicated array of canonical codes.
 */
export function normalizeBranches(inputs) {
  if (!inputs) return [];
  let list = [];
  if (Array.isArray(inputs)) {
    list = inputs;
  } else if (typeof inputs === 'string') {
    list = inputs.split(',');
  }
  const result = [];
  for (const item of list) {
    const normalized = normalizeBranch(item);
    if (normalized && !result.includes(normalized)) {
      result.push(normalized);
    }
  }
  return result;
}

/**
 * Returns human-readable display label for a branch (e.g., 'CSE' -> 'Computer Science and Engineering').
 */
export function getBranchLabel(input) {
  if (!input || typeof input !== 'string') return '';
  const canonical = normalizeBranch(input);
  return CANONICAL_TO_LABEL_MAP.get(canonical) || input.trim();
}

/**
 * Returns all accepted alias strings for a canonical branch.
 */
export function getAllBranchAliases(input) {
  const canonical = normalizeBranch(input);
  const aliases = CANONICAL_TO_ALIASES_MAP.get(canonical);
  if (aliases) {
    const set = new Set();
    for (const a of aliases) {
      set.add(a);
      set.add(a.toLowerCase());
      set.add(a.toUpperCase());
    }
    return Array.from(set);
  }
  return input ? Array.from(new Set([input, input.toLowerCase(), input.toUpperCase()])) : [];
}

/**
 * Returns dropdown options: [{ value: 'CSE', label: 'Computer Science and Engineering' }]
 */
export function getBranchOptions() {
  return BRANCH_DEFINITIONS.map((b) => ({
    value: b.value,
    label: b.label,
  }));
}

/**
 * Check if a student's branch is eligible given a job's eligibleBranches list.
 */
export function isBranchEligible(studentBranch, eligibleBranches) {
  if (!eligibleBranches || eligibleBranches.length === 0) return true;
  const normStudent = normalizeBranch(studentBranch);
  if (!normStudent) return false;
  const normEligible = eligibleBranches.map(normalizeBranch);
  return normEligible.includes(normStudent);
}
