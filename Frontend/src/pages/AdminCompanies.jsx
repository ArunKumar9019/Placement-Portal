// AdminCompanies.jsx
// Admin page: Create, view, update, delete companies.

import { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import Spinner from '../components/Spinner';
import Toast from '../components/Toast';
import { companyApi } from '../services/api';
import { Plus, Pencil, Trash2, X, Building2 } from 'lucide-react';

const EMPTY_FORM = {
  name: '',
  location: '',
  industry: '',
  website: '',
  description: '',
};

export default function AdminCompanies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'info' });

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // null = create mode
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function loadCompanies() {
    setLoading(true);
    try {
      const data = await companyApi.getAll();
      setCompanies(data.companies || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadCompanies(); }, []);

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditTarget(null);
    setFormError('');
    setShowModal(true);
  }

  function openEdit(company) {
    setForm({
      name: company.name || '',
      location: company.location || '',
      industry: company.industry || '',
      website: company.website || '',
      description: company.description || '',
    });
    setEditTarget(company);
    setFormError('');
    setShowModal(true);
  }

  function handleFormChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setFormError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.location.trim()) {
      setFormError('Company name and location are required.');
      return;
    }
    setSubmitting(true);
    try {
      if (editTarget) {
        await companyApi.update(editTarget._id, form);
        setToast({ message: 'Company updated successfully.', type: 'success' });
      } else {
        await companyApi.create(form);
        setToast({ message: 'Company created successfully.', type: 'success' });
      }
      setShowModal(false);
      loadCompanies();
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
      await companyApi.delete(deleteTarget._id);
      setToast({ message: 'Company deleted.', type: 'success' });
      setDeleteTarget(null);
      loadCompanies();
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
            <h1 className="page-title">Companies</h1>
            <p className="page-subtitle">{companies.length} registered companies</p>
          </div>
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} /> Add Company
          </button>
        </div>

        {loading && <Spinner />}
        {error && <div className="alert alert-error">{error}</div>}

        {!loading && !error && companies.length === 0 && (
          <div className="empty-state">
            <Building2 size={48} />
            <p>No companies yet. Add one to get started.</p>
          </div>
        )}

        {!loading && companies.length > 0 && (
          <div className="card">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Location</th>
                  <th>Industry</th>
                  <th>Website</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c._id}>
                    <td className="font-medium">{c.name}</td>
                    <td>{c.location}</td>
                    <td>{c.industry || '—'}</td>
                    <td>
                      {c.website ? (
                        <a href={c.website} target="_blank" rel="noopener noreferrer" className="auth-link">
                          {c.website}
                        </a>
                      ) : '—'}
                    </td>
                    <td>
                      <div className="action-btns">
                        <button
                          className="btn btn-ghost btn-icon"
                          onClick={() => openEdit(c)}
                          title="Edit"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="btn btn-danger-ghost btn-icon"
                          onClick={() => setDeleteTarget(c)}
                          title="Delete"
                        >
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

        {/* ── Create / Edit Modal ──────────────────────────────── */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editTarget ? 'Edit Company' : 'Add Company'}</h2>
                <button className="modal-close" onClick={() => setShowModal(false)}>
                  <X size={20} />
                </button>
              </div>

              {formError && <div className="alert alert-error">{formError}</div>}

              <form onSubmit={handleSubmit} className="modal-form">
                <div className="form-group">
                  <label>Company Name *</label>
                  <input name="name" value={form.name} onChange={handleFormChange} required />
                </div>
                <div className="form-group">
                  <label>Location *</label>
                  <input name="location" value={form.location} onChange={handleFormChange} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Industry</label>
                    <input name="industry" value={form.industry} onChange={handleFormChange} />
                  </div>
                  <div className="form-group">
                    <label>Website</label>
                    <input name="website" type="url" value={form.website} onChange={handleFormChange} placeholder="https://" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea name="description" value={form.description} onChange={handleFormChange} rows={3} />
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Saving…' : editTarget ? 'Save Changes' : 'Create Company'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Delete Confirmation ──────────────────────────────── */}
        {deleteTarget && (
          <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
            <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Delete Company</h2>
                <button className="modal-close" onClick={() => setDeleteTarget(null)}>
                  <X size={20} />
                </button>
              </div>
              <p className="modal-body-text">
                Are you sure you want to delete <strong>{deleteTarget.name}</strong>?
                This cannot be undone. Companies with existing job postings cannot be deleted.
              </p>
              <div className="modal-actions">
                <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>
                  Cancel
                </button>
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
