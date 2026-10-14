// Profile.jsx
// Shows the student's profile from the JWT payload + resume upload.
// NOTE: The backend /api/users/profile returns the decoded JWT payload
// (id, role), NOT the full Mongoose User document. We show the user
// object that was stored at login time (from localStorage) which has
// name, email, role. The profile endpoint is called to verify the token
// is still valid.

import { useState, useEffect } from 'react';
import StudentLayout from '../components/StudentLayout';
import Spinner from '../components/Spinner';
import Toast from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { userApi, resumeApi } from '../services/api';
import { getBranchOptions, getBranchLabel } from '../config/branches';
import { UserCircle, Upload, CheckCircle, FileText, Pencil, X } from 'lucide-react';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [profileValid, setProfileValid] = useState(null); // null = loading
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'info' });

  // Profile Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    branch: '',
    cgpa: '',
    backlogs: '',
  });
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);

  // Resume upload state
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [resumePath, setResumePath] = useState('');

  // Fetch full user profile from backend
  useEffect(() => {
    userApi
      .getProfile()
      .then((data) => {
        setProfileValid(true);
        if (data.user) {
          setProfile(data.user);
          if (data.user.resume) setResumePath(data.user.resume);
          if (updateUser) updateUser(data.user);
        }
      })
      .catch((err) => {
        setProfileValid(false);
        setError(err.message);
      });
  }, [updateUser]);

  function openEditModal() {
    setEditForm({
      name: profile?.name || user?.name || '',
      branch: profile?.branch || user?.branch || '',
      cgpa: profile?.cgpa !== undefined ? profile.cgpa : user?.cgpa !== undefined ? user.cgpa : '',
      backlogs: profile?.backlogs !== undefined ? profile.backlogs : user?.backlogs !== undefined ? user.backlogs : '',
    });
    setEditError('');
    setShowEditModal(true);
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    if (!editForm.name.trim()) {
      setEditError('Name is required.');
      return;
    }
    if (editForm.cgpa !== '' && (isNaN(editForm.cgpa) || editForm.cgpa < 0 || editForm.cgpa > 10)) {
      setEditError('CGPA must be between 0 and 10.');
      return;
    }
    if (editForm.backlogs !== '' && (isNaN(editForm.backlogs) || editForm.backlogs < 0)) {
      setEditError('Backlogs must be 0 or more.');
      return;
    }

    setSaving(true);
    setEditError('');
    try {
      const payload = {
        name: editForm.name.trim(),
        branch: editForm.branch,
        cgpa: editForm.cgpa === '' ? 0 : Number(editForm.cgpa),
        backlogs: editForm.backlogs === '' ? 0 : Number(editForm.backlogs),
      };
      const res = await userApi.updateProfile(payload);
      const updated = res.user || payload;
      setProfile((prev) => ({ ...prev, ...updated }));
      if (updateUser) updateUser(updated);
      setShowEditModal(false);
      setToast({ message: 'Profile updated successfully!', type: 'success' });
    } catch (err) {
      setEditError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleFileChange(e) {
    const chosen = e.target.files[0];
    if (chosen && chosen.type !== 'application/pdf') {
      setToast({ message: 'Only PDF files are allowed.', type: 'error' });
      return;
    }
    if (chosen && chosen.size > 2 * 1024 * 1024) {
      setToast({ message: 'File must be under 2 MB.', type: 'error' });
      return;
    }
    setFile(chosen);
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) {
      setToast({ message: 'Please select a PDF file first.', type: 'error' });
      return;
    }
    setUploading(true);
    try {
      const data = await resumeApi.upload(file);
      setResumePath(data.resume); // e.g. "uploads/1234567890-123.pdf"
      setFile(null);
      setToast({ message: 'Resume uploaded successfully!', type: 'success' });
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setUploading(false);
    }
  }

  const currentBranch = profile?.branch || user?.branch || '';
  const currentBranchLabel = getBranchLabel(currentBranch);

  return (
    <StudentLayout>
      <div className="page">
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: '', type: 'info' })}
        />

        <div className="page-header">
          <h1 className="page-title">My Profile</h1>
        </div>

        {profileValid === null && <Spinner />}
        {error && <div className="alert alert-error">{error}</div>}

        {profileValid && (
          <div className="profile-grid">
            {/* ── Profile info card ─────────────────────── */}
            <div className="card">
              <div className="card-header flex justify-between items-center">
                <h2 className="card-title">Student Information</h2>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={openEditModal}
                >
                  <Pencil size={15} /> Edit Profile
                </button>
              </div>
              <div className="profile-avatar-row">
                <div className="profile-avatar">
                  <UserCircle size={64} />
                </div>
                <div>
                  <h3 className="profile-name">{profile?.name || user?.name}</h3>
                  <p className="profile-role-tag">Student</p>
                </div>
              </div>

              <div className="profile-fields">
                <ProfileField label="Full Name" value={profile?.name || user?.name} />
                <ProfileField label="Email" value={profile?.email || user?.email} />
                <ProfileField
                  label="Branch"
                  value={
                    currentBranch ? (
                      <span>
                        {currentBranchLabel}{' '}
                        <span className="badge badge-applied font-mono text-xs">{currentBranch}</span>
                      </span>
                    ) : (
                      'Not specified'
                    )
                  }
                />
                <ProfileField
                  label="CGPA"
                  value={profile?.cgpa !== undefined ? profile.cgpa : user?.cgpa !== undefined ? user.cgpa : '—'}
                />
                <ProfileField
                  label="Active Backlogs"
                  value={profile?.backlogs !== undefined ? profile.backlogs : user?.backlogs !== undefined ? user.backlogs : '—'}
                />
              </div>
            </div>

            {/* ── Resume upload card ──────────────────── */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Resume</h2>
              </div>

              {resumePath && (
                <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle size={16} />
                    <span>Resume uploaded and on file.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                      onClick={async () => {
                        try {
                          await resumeApi.openResumeInNewTab();
                        } catch (err) {
                          setToast({ message: err.message || 'Failed to open resume', type: 'error' });
                        }
                      }}
                    >
                      <FileText size={14} /> View Resume
                    </button>
                    <a
                      href={resumeApi.getMyResumeUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="auth-link"
                      style={{ fontSize: '0.82rem' }}
                    >
                      Direct link
                    </a>
                  </div>
                </div>
              )}

              <form onSubmit={handleUpload} className="resume-form">
                <label className="file-drop-zone" htmlFor="resume-file">
                  <FileText size={32} />
                  <span>
                    {file ? file.name : 'Click to select PDF resume'}
                  </span>
                  <span className="hint">Max 2 MB · PDF only</span>
                  <input
                    id="resume-file"
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                    className="hidden-file-input"
                  />
                </label>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={uploading || !file}
                >
                  <Upload size={16} />
                  {uploading ? 'Uploading…' : 'Upload Resume'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── Edit Profile Modal ───────────────────────── */}
        {showEditModal && (
          <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Edit Profile</h2>
                <button
                  type="button"
                  className="modal-close"
                  onClick={() => setShowEditModal(false)}
                >
                  <X size={20} />
                </button>
              </div>

              {editError && <div className="alert alert-error">{editError}</div>}

              <form onSubmit={handleSaveProfile} className="modal-form">
                <div className="form-group">
                  <label htmlFor="edit-name">Full Name *</label>
                  <input
                    id="edit-name"
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-branch">Branch</label>
                  <select
                    id="edit-branch"
                    value={editForm.branch}
                    onChange={(e) => setEditForm({ ...editForm, branch: e.target.value })}
                  >
                    <option value="">Select branch</option>
                    {getBranchOptions().map((b) => (
                      <option key={b.value} value={b.value}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="edit-cgpa">CGPA (0–10)</label>
                    <input
                      id="edit-cgpa"
                      type="number"
                      min="0"
                      max="10"
                      step="0.01"
                      value={editForm.cgpa}
                      onChange={(e) => setEditForm({ ...editForm, cgpa: e.target.value })}
                      placeholder="8.5"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit-backlogs">Active Backlogs</label>
                    <input
                      id="edit-backlogs"
                      type="number"
                      min="0"
                      value={editForm.backlogs}
                      onChange={(e) => setEditForm({ ...editForm, backlogs: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setShowEditModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving}
                  >
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </StudentLayout>
  );
}

function ProfileField({ label, value, mono }) {
  return (
    <div className="profile-field">
      <span className="profile-field-label">{label}</span>
      <span className={`profile-field-value ${mono ? 'mono' : ''}`}>
        {value || '—'}
      </span>
    </div>
  );
}
