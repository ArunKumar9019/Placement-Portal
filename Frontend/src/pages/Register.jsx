// Register.jsx — student registration page

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import { getBranchOptions } from '../config/branches';
import { GraduationCap, Eye, EyeOff } from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    branch: '',
    cgpa: '',
    backlogs: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
    setSuccess('');
  }

  function validate() {
    if (!form.name.trim()) return 'Full name is required.';
    if (!form.email.trim()) return 'Email is required.';
    if (form.password.length < 8) return 'Password must be at least 8 characters.';
    if (form.cgpa && (isNaN(form.cgpa) || form.cgpa < 0 || form.cgpa > 10))
      return 'CGPA must be between 0 and 10.';
    if (form.backlogs && (isNaN(form.backlogs) || form.backlogs < 0))
      return 'Backlogs must be 0 or more.';
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    setError('');
    try {
      // Build payload — convert numeric strings to numbers
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        branch: form.branch,
        cgpa: form.cgpa !== '' ? Number(form.cgpa) : 0,
        backlogs: form.backlogs !== '' ? Number(form.backlogs) : 0,
      };
      await authApi.register(payload);
      setSuccess('Account created! Redirecting to login…');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-wide">
        <div className="auth-brand">
          <div className="auth-logo">
            <GraduationCap size={36} />
          </div>
          <h1 className="auth-title">PlaceHub</h1>
          <p className="auth-subtitle">College Placement Portal</p>
        </div>

        <h2 className="auth-heading">Create student account</h2>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name">Full Name *</label>
              <input
                id="name"
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                placeholder="Arjun Sharma"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="reg-email">Email *</label>
              <input
                id="reg-email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="arjun@college.edu"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="reg-password">Password * <span className="hint">(min 8 characters)</span></label>
            <div className="input-icon-wrap">
              <input
                id="reg-password"
                name="password"
                type={showPwd ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                className="input-icon-btn"
                onClick={() => setShowPwd(!showPwd)}
                aria-label="Toggle password"
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="branch">Branch</label>
              <select id="branch" name="branch" value={form.branch} onChange={handleChange}>
                <option value="">Select branch</option>
                {getBranchOptions().map((b) => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="cgpa">CGPA <span className="hint">(0–10)</span></label>
              <input
                id="cgpa"
                name="cgpa"
                type="number"
                min="0"
                max="10"
                step="0.01"
                value={form.cgpa}
                onChange={handleChange}
                placeholder="8.5"
              />
            </div>
          </div>

          <div className="form-group form-group-sm">
            <label htmlFor="backlogs">Active Backlogs</label>
            <input
              id="backlogs"
              name="backlogs"
              type="number"
              min="0"
              value={form.backlogs}
              onChange={handleChange}
              placeholder="0"
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="auth-footer-text">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
