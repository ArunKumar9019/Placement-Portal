// Frontend/src/utils/compensation.js
// Helpers for job categories and compensation formatting (stipend / CTC)

export const JOB_CATEGORIES = [
  'Internship',
  'Full-Time Employment (FTE)',
  'Internship + Performance-Based FTE',
];

/**
 * Formats a stipend value into a readable string (e.g., 30000 -> "₹30,000/month")
 */
export function formatStipend(stipend) {
  if (stipend === undefined || stipend === null || stipend === '') return null;
  const num = Number(stipend);
  if (isNaN(num)) return `₹${stipend}/month`;
  return `₹${num.toLocaleString('en-IN')}/month`;
}

/**
 * Formats a CTC value into a readable string (e.g., 10.5 -> "₹10.5 LPA")
 */
export function formatCTC(ctc) {
  if (ctc === undefined || ctc === null || ctc === '') return null;
  const num = Number(ctc);
  if (isNaN(num)) return `₹${ctc} LPA`;
  if (num >= 100000) {
    const lpa = num / 100000;
    return `₹${Number.isInteger(lpa) ? lpa : lpa.toFixed(2)} LPA`;
  }
  return `₹${num} LPA`;
}
