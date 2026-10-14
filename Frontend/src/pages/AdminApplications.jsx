// AdminApplications.jsx
// Admin page: View all student applications and update their statuses.

import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../components/AdminLayout';
import StatusBadge from '../components/StatusBadge';
import Spinner from '../components/Spinner';
import Toast from '../components/Toast';
import { applicationApi, resumeApi } from '../services/api';
import { getBranchLabel } from '../config/branches';
import { ClipboardList, Search, RefreshCw } from 'lucide-react';

const STATUSES = ['Applied', 'Shortlisted', 'Interview', 'Selected', 'Rejected'];

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function AdminApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'info' });

  // Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Track updating state per application ID
  const [updatingId, setUpdatingId] = useState(null);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await applicationApi.getAll();
      setApplications(data.applications || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch applications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  async function handleStatusChange(appId, newStatus) {
    if (!newStatus) return;
    setUpdatingId(appId);
    try {
      await applicationApi.updateStatus(appId, newStatus);
      setApplications((prev) =>
        prev.map((app) => (app._id === appId ? { ...app, status: newStatus } : app))
      );
      setToast({ message: `Status updated to "${newStatus}".`, type: 'success' });
    } catch (err) {
      setToast({ message: err.message || 'Failed to update status.', type: 'error' });
    } finally {
      setUpdatingId(null);
    }
  }

  // Filter applications by search and status
  const filtered = applications.filter((app) => {
    const studentName = app.student?.name || '';
    const studentEmail = app.student?.email || '';
    const jobTitle = app.job?.title || '';
    const companyName = app.job?.company?.name || '';

    const matchesSearch =
      !search ||
      studentName.toLowerCase().includes(search.toLowerCase()) ||
      studentEmail.toLowerCase().includes(search.toLowerCase()) ||
      jobTitle.toLowerCase().includes(search.toLowerCase()) ||
      companyName.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = !statusFilter || app.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <AdminLayout>
      <div className="page">
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: '', type: 'info' })}
        />

        <div className="page-header">
          <div>
            <h1 className="page-title">Applications</h1>
            <p className="page-subtitle">
              {applications.length} student application{applications.length !== 1 ? 's' : ''} total
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={fetchApplications}
            disabled={loading}
          >
            <RefreshCw size={15} /> Refresh
          </button>
        </div>

        {/* ── Search & Filter Bar ─────────────────────────────── */}
        <div className="filters-bar">
          <div className="search-wrap">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search by student, email, job, or company…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {(search || statusFilter) && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setSearch('');
                setStatusFilter('');
              }}
            >
              Clear filters
            </button>
          )}
        </div>

        {loading && <Spinner />}
        {error && <div className="alert alert-error">{error}</div>}

        {!loading && !error && filtered.length === 0 && (
          <div className="empty-state">
            <ClipboardList size={48} />
            <p>
              {applications.length === 0
                ? 'No applications submitted yet.'
                : 'No applications match your filter criteria.'}
            </p>
            {(search || statusFilter) && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('');
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* ── Applications Table ──────────────────────────────── */}
        {!loading && !error && filtered.length > 0 && (
          <div className="card">
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Job Title</th>
                  <th>Company</th>
                  <th>Applied Date</th>
                  <th>Current Status</th>
                  <th>Update Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((app) => {
                  const student = app.student;
                  const job = app.job;
                  const isUpdating = updatingId === app._id;

                  return (
                    <tr key={app._id}>
                      {/* Student info */}
                      <td>
                        <div className="font-medium">{student?.name || '—'}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--grey-500)' }}>
                          {student?.email || '—'}
                          {student?.branch && (
                            <> · <span title={getBranchLabel(student.branch)}>{student.branch}</span></>
                          )}
                          {student?.cgpa !== undefined && (
                            <> · CGPA: {student.cgpa}</>
                          )}
                          {student?.resume && (
                            <div>
                              <a
                                href={resumeApi.getResumeByUserIdUrl(student._id)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="auth-link"
                                style={{ fontSize: '0.74rem' }}
                              >
                                View Resume ↗
                              </a>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Job Title */}
                      <td className="font-medium">
                        {job?.title || '—'}
                      </td>

                      {/* Company */}
                      <td>
                        {job?.company?.name || '—'}
                      </td>

                      {/* Application Date */}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {formatDate(app.createdAt)}
                      </td>

                      {/* Current Status Badge */}
                      <td>
                        <StatusBadge status={app.status} />
                      </td>

                      {/* Quick Status Update Selector */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <select
                            className="filter-select"
                            style={{
                              padding: '0.35rem 0.6rem',
                              fontSize: '0.82rem',
                              minWidth: '130px',
                            }}
                            value={app.status}
                            disabled={isUpdating}
                            onChange={(e) => handleStatusChange(app._id, e.target.value)}
                          >
                            {STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                          {isUpdating && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--blue)' }}>
                              Saving…
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
