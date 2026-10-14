// Jobs.jsx
// Browse jobs with search + filters. Students can apply directly from the card.

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import StudentLayout from '../components/StudentLayout';
import Spinner from '../components/Spinner';
import Toast from '../components/Toast';
import { jobApi, applicationApi, userApi } from '../services/api';
import { getBranchOptions, normalizeBranches, isBranchEligible } from '../config/branches';
import { formatStipend, formatCTC } from '../utils/compensation';
import {
  Search,
  MapPin,
  BookOpen,
  Calendar,
  Star,
  Briefcase,
} from 'lucide-react';

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function isDeadlineSoon(dateStr) {
  const diff = new Date(dateStr) - new Date();
  return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000; // within 7 days
}

function getEligibilityStatus(student, job, isApplied) {
  if (isApplied) {
    return { eligible: false, reason: 'Already Applied', isApplied: true };
  }
  if (job.status && job.status !== 'open') {
    return { eligible: false, reason: 'Job is closed' };
  }
  if (job.deadline && new Date(job.deadline) < new Date()) {
    return { eligible: false, reason: 'Deadline has passed' };
  }
  if (!student || !student.branch || student.cgpa === undefined || student.cgpa === null) {
    return {
      eligible: false,
      reason: 'Complete profile to check eligibility',
      incompleteProfile: true,
    };
  }
  if (!isBranchEligible(student.branch, job.eligibleBranches)) {
    return { eligible: false, reason: 'Branch not eligible' };
  }
  if (student.cgpa < job.minimumCGPA) {
    return { eligible: false, reason: `Minimum CGPA required: ${job.minimumCGPA}` };
  }
  if (job.maximumBacklogs !== undefined && job.maximumBacklogs !== null && (student.backlogs || 0) > job.maximumBacklogs) {
    return { eligible: false, reason: 'Backlogs exceed the allowed limit' };
  }
  return { eligible: true, reason: '' };
}

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'info' });

  // Student profile & already applied jobs
  const [studentProfile, setStudentProfile] = useState(null);
  const [applied, setApplied] = useState(new Set());

  // Filter state
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const [branch, setBranch] = useState('');
  const [minCGPA, setMinCGPA] = useState('');

  // Track which jobs are being applied to
  const [applying, setApplying] = useState({});

  // Load student profile & existing applications to determine eligibility & applied status
  useEffect(() => {
    async function loadStudentData() {
      try {
        const [profileRes, appsRes] = await Promise.all([
          userApi.getProfile(),
          applicationApi.getMine(),
        ]);
        if (profileRes.user) {
          setStudentProfile(profileRes.user);
        }
        if (appsRes.applications) {
          const appliedJobIds = new Set(
            appsRes.applications.map((app) => app.job?._id || app.job)
          );
          setApplied(appliedJobIds);
        }
      } catch (err) {
        console.warn('Could not load student profile or applications:', err.message);
      }
    }
    loadStudentData();
  }, []);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await jobApi.getAll({ search, location, branch, minCGPA });
      setJobs(data.jobs || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, location, branch, minCGPA]);

  // Debounce search: fetch only after user stops typing for 400ms
  useEffect(() => {
    const timer = setTimeout(fetchJobs, 400);
    return () => clearTimeout(timer);
  }, [fetchJobs]);

  async function handleApply(jobId) {
    setApplying((prev) => ({ ...prev, [jobId]: true }));
    try {
      await applicationApi.apply(jobId);
      setApplied((prev) => new Set([...prev, jobId]));
      setToast({ message: 'Application submitted successfully!', type: 'success' });
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setApplying((prev) => ({ ...prev, [jobId]: false }));
    }
  }

  function clearFilters() {
    setSearch('');
    setLocation('');
    setBranch('');
    setMinCGPA('');
  }

  return (
    <StudentLayout>
      <div className="page">
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: '', type: 'info' })}
        />

        <div className="page-header">
          <div>
            <h1 className="page-title">Browse Jobs</h1>
            <p className="page-subtitle">
              {jobs.length} open position{jobs.length !== 1 ? 's' : ''} available
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-bar">
          <div className="search-wrap">
            <Search size={16} className="search-icon" />
            <input
              className="search-input"
              type="text"
              placeholder="Search job titles…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <input
            className="filter-input"
            type="text"
            placeholder="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <select
            className="filter-select"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
          >
            <option value="">All Branches</option>
            {getBranchOptions().map((b) => (
              <option key={b.value} value={b.value}>{b.label}</option>
            ))}
          </select>
          <input
            className="filter-input filter-input-sm"
            type="number"
            min="0"
            max="10"
            step="0.1"
            placeholder="Min CGPA"
            value={minCGPA}
            onChange={(e) => setMinCGPA(e.target.value)}
          />
          {(search || location || branch || minCGPA) && (
            <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
              Clear
            </button>
          )}
        </div>

        {loading && <Spinner />}
        {error && <div className="alert alert-error">{error}</div>}

        {!loading && !error && jobs.length === 0 && (
          <div className="empty-state">
            <Briefcase size={48} />
            <p>No jobs match your filters.</p>
            <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
              Clear filters
            </button>
          </div>
        )}

        <div className="job-grid">
          {jobs.map((job) => {
            const isApplied = applied.has(job._id);
            const isBusy = applying[job._id];
            const eligibility = getEligibilityStatus(studentProfile, job, isApplied);

            // Normalized canonical branch codes for clean display on card
            const shortBranches =
              job.eligibleBranches && job.eligibleBranches.length > 0
                ? normalizeBranches(job.eligibleBranches).join(', ')
                : 'All branches';

            const stipendDisplay = formatStipend(job.stipend);
            const ctcDisplay = formatCTC(job.ctc);

            return (
              <div key={job._id} className="job-card">
                <div className="job-card-header">
                  <div>
                    <h3 className="job-title">{job.title}</h3>
                    <p className="job-company">{job.company?.name}</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    {job.category && (
                      <span className="badge badge-category">{job.category}</span>
                    )}
                    {isDeadlineSoon(job.deadline) && (
                      <span className="badge badge-urgent">Closing Soon</span>
                    )}
                  </div>
                </div>

                {/* Compensation info if available */}
                {(job.category || job.stipend || job.ctc) && (
                  <div className="job-compensation">
                    {(job.category === 'Internship' || job.category === 'Internship + Performance-Based FTE' || (!job.category && job.stipend)) && stipendDisplay && (
                      <span className="compensation-pill">
                        Stipend: {stipendDisplay}
                      </span>
                    )}
                    {(job.category === 'Full-Time Employment (FTE)' || job.category === 'Internship + Performance-Based FTE' || (!job.category && job.ctc)) && ctcDisplay && (
                      <span className="compensation-pill">
                        CTC: {ctcDisplay}
                      </span>
                    )}
                  </div>
                )}

                <p className="job-description">{job.description}</p>

                <div className="job-meta">
                  <span><MapPin size={13} /> {job.location}</span>
                  <span><Star size={13} /> Min CGPA: {job.minimumCGPA}</span>
                  <span><BookOpen size={13} /> {shortBranches}</span>
                  <span><Calendar size={13} /> Deadline: {formatDate(job.deadline)}</span>
                </div>

                <div className="job-card-footer">
                  <span className="job-industry">{job.company?.industry}</span>
                  <div className="apply-section">
                    {!eligibility.eligible && !eligibility.isApplied && (
                      <div className="eligibility-notice">
                        {eligibility.incompleteProfile ? (
                          <Link to="/profile" className="eligibility-link">
                            Complete profile to apply →
                          </Link>
                        ) : (
                          <span className="eligibility-reason">{eligibility.reason}</span>
                        )}
                      </div>
                    )}
                    <button
                      className={`btn btn-sm ${
                        isApplied
                          ? 'btn-success'
                          : eligibility.eligible
                          ? 'btn-primary'
                          : 'btn-disabled'
                      }`}
                      disabled={!eligibility.eligible || isBusy}
                      onClick={() => handleApply(job._id)}
                    >
                      {isBusy
                        ? 'Applying…'
                        : isApplied
                        ? '✓ Already Applied'
                        : 'Apply Now'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </StudentLayout>
  );
}

