// AdminJobs.jsx
// Admin page: Create, view, update, delete job postings.

import { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import Spinner from '../components/Spinner';
import Toast from '../components/Toast';
import { jobApi, companyApi } from '../services/api';
import { getBranchOptions, normalizeBranches } from '../config/branches';
import { JOB_CATEGORIES, formatStipend, formatCTC } from '../utils/compensation';
import { Plus, Pencil, Trash2, X, Briefcase } from 'lucide-react';

const EMPTY_FORM = {
  title: '',
  company: '',
  category: '',
  stipend: '',
  ctc: '',
  description: '',
  eligibleBranches: [],
  minimumCGPA: '',
  maximumBacklogs: '',
  location: '',
  deadline: '',
  status: 'open',
};

function toDateInputValue(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toISOString().split('T')[0];
}

function getEffectiveStatus(job) {
  if (!job) return 'Closed';
  if (job.status === 'closed') return 'Closed';
  if (job.deadline && new Date(job.deadline).getTime() < Date.now()) {
    return 'Expired';
  }
  return 'Open';
}

function getStatusBadgeClass(status) {
  if (status === 'Open') return 'badge-open';
  if (status === 'Expired') return 'badge-expired';
  return 'badge-closed';
}

export default function AdminJobs() {
  const [jobs, setJobs] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'info' });

  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      // Fetch all jobs (including closed jobs) for admin view
      const [jobData, compData] = await Promise.all([
        jobApi.getAll({ includeAll: true }),
        companyApi.getAll(),
      ]);
      setJobs(jobData.jobs || []);
      setCompanies(compData.companies || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditTarget(null);
    setFormError('');
    setShowModal(true);
  }

  function openEdit(job) {
    setForm({
      title: job.title || '',
      company: job.company?._id || job.company || '',
      category: job.category || '',
      stipend: job.stipend !== undefined && job.stipend !== null ? job.stipend : '',
      ctc: job.ctc !== undefined && job.ctc !== null ? job.ctc : '',
      description: job.description || '',
      eligibleBranches: normalizeBranches(job.eligibleBranches || []),
      minimumCGPA: job.minimumCGPA ?? '',
      maximumBacklogs: job.maximumBacklogs ?? '',
      location: job.location || '',
      deadline: toDateInputValue(job.deadline),
      status: job.status || 'open',
    });
    setEditTarget(job);
    setFormError('');
    setShowModal(true);
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setFormError('');
  }

  function handleBranchToggle(branch) {
    const current = form.eligibleBranches;
    if (current.includes(branch)) {
      setForm({ ...form, eligibleBranches: current.filter((b) => b !== branch) });
    } else {
      setForm({ ...form, eligibleBranches: [...current, branch] });
    }
  }

  function validate() {
    if (!form.title.trim()) return 'Job title is required.';
    if (!form.company) return 'Please select a company.';
    if (!form.category) return 'Job category is required.';

    if (form.category === 'Internship') {
      if (form.stipend === '' || isNaN(form.stipend) || Number(form.stipend) < 0) {
        return 'Stipend is required for Internship and must be 0 or greater.';
      }
    } else if (form.category === 'Full-Time Employment (FTE)') {
      if (form.ctc === '' || isNaN(form.ctc) || Number(form.ctc) < 0) {
        return 'CTC (LPA) is required for Full-Time Employment (FTE) and must be 0 or greater.';
      }
    } else if (form.category === 'Internship + Performance-Based FTE') {
      if (form.stipend === '' || isNaN(form.stipend) || Number(form.stipend) < 0) {
        return 'Stipend is required for Internship + Performance-Based FTE and must be 0 or greater.';
      }
      if (form.ctc === '' || isNaN(form.ctc) || Number(form.ctc) < 0) {
        return 'CTC (LPA) is required for Internship + Performance-Based FTE and must be 0 or greater.';
      }
    }

    if (!form.description.trim()) return 'Description is required.';
    if (form.minimumCGPA === '' || isNaN(form.minimumCGPA)) return 'Minimum CGPA is required.';
    if (!form.location.trim()) return 'Location is required.';
    if (!form.deadline) return 'Deadline is required.';
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const err = validate();
    if (err) { setFormError(err); return; }

    setSubmitting(true);
    const payload = {
      ...form,
      minimumCGPA: Number(form.minimumCGPA),
      maximumBacklogs: form.maximumBacklogs !== '' ? Number(form.maximumBacklogs) : 0,
      stipend: (form.category === 'Internship' || form.category === 'Internship + Performance-Based FTE') && form.stipend !== '' ? Number(form.stipend) : undefined,
      ctc: (form.category === 'Full-Time Employment (FTE)' || form.category === 'Internship + Performance-Based FTE') && form.ctc !== '' ? Number(form.ctc) : undefined,
    };

    try {
      if (editTarget) {
        await jobApi.update(editTarget._id, payload);
        setToast({ message: 'Job updated successfully.', type: 'success' });
      } else {
        await jobApi.create(payload);
        setToast({ message: 'Job created successfully.', type: 'success' });
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await jobApi.delete(deleteTarget._id);
      setToast({ message: 'Job deleted.', type: 'success' });
      setDeleteTarget(null);
      loadData();
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

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
            <h1 className="page-title">Job Postings</h1>
            <p className="page-subtitle">
              {jobs.length} total posting{jobs.length !== 1 ? 's' : ''} ({jobs.filter((j) => getEffectiveStatus(j) === 'Open').length} open, {jobs.filter((j) => getEffectiveStatus(j) === 'Closed').length} closed, {jobs.filter((j) => getEffectiveStatus(j) === 'Expired').length} expired)
            </p>
          </div>
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} /> Post a Job
          </button>
        </div>

        {loading && <Spinner />}
        {error && <div className="alert alert-error">{error}</div>}

        {!loading && !error && jobs.length === 0 && (
          <div className="empty-state">
            <Briefcase size={48} />
            <p>No jobs posted yet.</p>
          </div>
        )}

        {!loading && jobs.length > 0 && (
          <div className="card">
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Company</th>
                  <th>Category</th>
                  <th>Compensation</th>
                  <th>Location</th>
                  <th>Min CGPA</th>
                  <th>Deadline</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job._id}>
                    <td className="font-medium">{job.title}</td>
                    <td>{job.company?.name ?? '—'}</td>
                    <td>
                      {job.category ? (
                        <span className="badge badge-category">{job.category}</span>
                      ) : (
                        <span style={{ color: 'var(--grey-400)' }}>—</span>
                      )}
                    </td>
                    <td>
                      {job.category === 'Internship' && (formatStipend(job.stipend) || '—')}
                      {job.category === 'Full-Time Employment (FTE)' && (formatCTC(job.ctc) || '—')}
                      {job.category === 'Internship + Performance-Based FTE' && (
                        <span>
                          {formatStipend(job.stipend) || '—'}
                          <br />
                          <small style={{ color: 'var(--grey-500)' }}>{formatCTC(job.ctc) || '—'}</small>
                        </span>
                      )}
                      {!job.category && (
                        job.stipend || job.ctc ? (
                          <span>
                            {job.stipend ? formatStipend(job.stipend) : null}
                            {job.stipend && job.ctc ? ' · ' : null}
                            {job.ctc ? formatCTC(job.ctc) : null}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--grey-400)' }}>—</span>
                        )
                      )}
                    </td>
                    <td>{job.location}</td>
                    <td>{job.minimumCGPA}</td>
                    <td>{new Date(job.deadline).toLocaleDateString('en-IN')}</td>
                    <td>
                      {(() => {
                        const effectiveStatus = getEffectiveStatus(job);
                        return (
                          <span className={`badge ${getStatusBadgeClass(effectiveStatus)}`}>
                            {effectiveStatus}
                          </span>
                        );
                      })()}
                    </td>
                    <td>
                      <div className="action-btns">
                        <button className="btn btn-ghost btn-icon" onClick={() => openEdit(job)} title="Edit">
                          <Pencil size={15} />
                        </button>
                        <button className="btn btn-danger-ghost btn-icon" onClick={() => setDeleteTarget(job)} title="Delete">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Create / Edit Modal ─────────────────────────────── */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editTarget ? 'Edit Job' : 'Post a Job'}</h2>
                <button className="modal-close" onClick={() => setShowModal(false)}>
                  <X size={20} />
                </button>
              </div>

              {formError && <div className="alert alert-error">{formError}</div>}

              <form onSubmit={handleSubmit} className="modal-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Job Title *</label>
                    <input name="title" value={form.title} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label>Company *</label>
                    <select name="company" value={form.company} onChange={handleChange} required>
                      <option value="">Select company</option>
                      {companies.map((c) => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Job Category *</label>
                    <select name="category" value={form.category} onChange={handleChange} required>
                      <option value="">Select category</option>
                      {JOB_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  {(form.category === 'Internship' || form.category === 'Internship + Performance-Based FTE') && (
                    <div className="form-group">
                      <label>Stipend (₹/month) *</label>
                      <input
                        name="stipend"
                        type="number"
                        min="0"
                        placeholder="e.g. 30000"
                        value={form.stipend}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  )}
                  {(form.category === 'Full-Time Employment (FTE)' || form.category === 'Internship + Performance-Based FTE') && (
                    <div className="form-group">
                      <label>CTC (LPA) *</label>
                      <input
                        name="ctc"
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="e.g. 10.5"
                        value={form.ctc}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Description *</label>
                  <textarea name="description" value={form.description} onChange={handleChange} rows={4} required />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Location *</label>
                    <input name="location" value={form.location} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label>Deadline *</label>
                    <input name="deadline" type="date" value={form.deadline} onChange={handleChange} required />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Minimum CGPA *</label>
                    <input name="minimumCGPA" type="number" min="0" max="10" step="0.1" value={form.minimumCGPA} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label>Max Backlogs Allowed</label>
                    <input name="maximumBacklogs" type="number" min="0" value={form.maximumBacklogs} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select name="status" value={form.status} onChange={handleChange}>
                      <option value="open">Open</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Eligible Branches <span className="hint">(leave unchecked = all branches)</span></label>
                  <div className="checkbox-grid">
                    {getBranchOptions().map((b) => (
                      <label key={b.value} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={form.eligibleBranches.includes(b.value)}
                          onChange={() => handleBranchToggle(b.value)}
                        />
                        {b.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Saving…' : editTarget ? 'Save Changes' : 'Create Job'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Delete Confirmation ───────────────────────────────── */}
        {deleteTarget && (
          <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
            <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Delete Job</h2>
                <button className="modal-close" onClick={() => setDeleteTarget(null)}><X size={20} /></button>
              </div>
              <p className="modal-body-text">
                Delete <strong>{deleteTarget.title}</strong>? This cannot be undone.
              </p>
              <div className="modal-actions">
                <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
