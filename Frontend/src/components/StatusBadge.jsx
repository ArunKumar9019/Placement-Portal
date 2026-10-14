// StatusBadge.jsx
// Renders a coloured pill for application status values.

const STATUS_STYLES = {
  Applied: 'badge-applied',
  Shortlisted: 'badge-shortlisted',
  Interview: 'badge-interview',
  Selected: 'badge-selected',
  Rejected: 'badge-rejected',
};

export default function StatusBadge({ status }) {
  const cls = STATUS_STYLES[status] || 'badge-applied';
  return <span className={`badge ${cls}`}>{status}</span>;
}
