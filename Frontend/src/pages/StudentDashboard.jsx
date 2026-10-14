// StudentDashboard.jsx
// Shows welcome info, quick stats from the student's applications,
// and a list of recent applications.

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import StudentLayout from '../components/StudentLayout';
import StatusBadge from '../components/StatusBadge';
import Spinner from '../components/Spinner';
import { useAuth } from '../context/AuthContext';
import { applicationApi, jobApi } from '../services/api';
import {
  Briefcase,
  CheckCircle,
  Clock,
  XCircle,
  ArrowRight,
} from 'lucide-react';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [openJobs, setOpenJobs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const [appData, jobData] = await Promise.all([
          applicationApi.getMine(),
          jobApi.getAll(),
        ]);
        setApplications(appData.applications || []);
        setOpenJobs(jobData.count || 0);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Compute quick stats from applications array
  const stats = {
    total: applications.length,
    shortlisted: applications.filter(
      (a) => a.status === 'Shortlisted' || a.status === 'Interview'
    ).length,
    selected: applications.filter((a) => a.status === 'Selected').length,
    rejected: applications.filter((a) => a.status === 'Rejected').length,
  };

  const recent = applications.slice(0, 5);

  return (
    <StudentLayout>
      <div className="page">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Welcome back, {user?.name?.split(' ')[0]}!</h1>
            <p className="page-subtitle">
              Here&rsquo;s your placement activity at a glance.
            </p>
          </div>
          <Link to="/jobs" className="btn btn-primary">
            Browse Jobs <ArrowRight size={16} />
          </Link>
        </div>

        {loading && <Spinner />}
        {error && <div className="alert alert-error">{error}</div>}

        {!loading && !error && (
          <>
            {/* Stat cards */}
            <div className="stats-grid">
              <StatCard
                icon={<Briefcase size={22} />}
                label="Open Jobs"
                value={openJobs}
                color="blue"
              />
              <StatCard
                icon={<Clock size={22} />}
                label="Applied"
                value={stats.total}
                color="purple"
              />
              <StatCard
                icon={<CheckCircle size={22} />}
                label="Shortlisted / Interview"
                value={stats.shortlisted}
                color="green"
              />
              <StatCard
                icon={<XCircle size={22} />}
                label="Selected"
                value={stats.selected}
                color="teal"
              />
            </div>

            {/* Recent applications */}
            <div className="card mt-6">
              <div className="card-header">
                <h2 className="card-title">Recent Applications</h2>
                <Link to="/my-applications" className="link-subtle">
                  View all →
                </Link>
              </div>

              {recent.length === 0 ? (
                <div className="empty-state">
                  <Briefcase size={40} />
                  <p>You haven't applied to any jobs yet.</p>
                  <Link to="/jobs" className="btn btn-primary btn-sm">
                    Find Jobs
                  </Link>
                </div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Job Title</th>
                      <th>Company</th>
                      <th>Location</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((app) => (
                      <tr key={app._id}>
                        <td>{app.job?.title ?? '—'}</td>
                        <td>{app.job?.company?.name ?? '—'}</td>
                        <td>{app.job?.company?.location ?? '—'}</td>
                        <td><StatusBadge status={app.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </StudentLayout>
  );
}

// Small helper component so the JSX above stays clean
function StatCard({ icon, label, value, color }) {
  return (
    <div className={`stat-card stat-card-${color}`}>
      <div className="stat-icon">{icon}</div>
      <div>
        <p className="stat-value">{value}</p>
        <p className="stat-label">{label}</p>
      </div>
    </div>
  );
}
