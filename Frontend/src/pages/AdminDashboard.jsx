// AdminDashboard.jsx
// Admin overview — shows counts of companies, jobs, and applications.

import { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import Spinner from '../components/Spinner';
import { Link } from 'react-router-dom';
import { companyApi, jobApi, applicationApi } from '../services/api';
import { Building2, Briefcase, ClipboardList, ArrowRight } from 'lucide-react';

export default function AdminDashboard() {
  const [counts, setCounts] = useState({ companies: 0, jobs: 0, applications: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // We compute real stats by fetching the resource lists directly.
    async function fetchCounts() {
      try {
        const [compData, jobData, appData] = await Promise.all([
          companyApi.getAll(),
          jobApi.getAll(),
          applicationApi.getAll(),
        ]);
        setCounts({
          companies: compData.count ?? 0,
          jobs: jobData.count ?? 0,
          applications: appData.count ?? 0,
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchCounts();
  }, []);

  return (
    <AdminLayout>
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Admin Dashboard</h1>
            <p className="page-subtitle">Manage companies, jobs, and applications.</p>
          </div>
        </div>

        {loading && <Spinner />}
        {error && <div className="alert alert-error">{error}</div>}

        {!loading && !error && (
          <>
            <div className="stats-grid">
              <StatCard
                icon={<Building2 size={22} />}
                label="Companies"
                value={counts.companies}
                color="blue"
                to="/admin/companies"
              />
              <StatCard
                icon={<Briefcase size={22} />}
                label="Open Jobs"
                value={counts.jobs}
                color="purple"
                to="/admin/jobs"
              />
              <StatCard
                icon={<ClipboardList size={22} />}
                label="Applications"
                value={counts.applications}
                color="green"
                to="/admin/applications"
              />
            </div>

            <div className="admin-quick-links mt-6">
              <h2 className="card-title mb-4">Quick Actions</h2>
              <div className="quick-links-grid">
                <QuickLink to="/admin/companies" label="Add Company" icon={<Building2 size={18} />} />
                <QuickLink to="/admin/jobs" label="Post a Job" icon={<Briefcase size={18} />} />
                <QuickLink to="/admin/applications" label="Review Applications" icon={<ClipboardList size={18} />} />
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

function StatCard({ icon, label, value, color, to }) {
  return (
    <Link to={to} className={`stat-card stat-card-${color} stat-card-link`}>
      <div className="stat-icon">{icon}</div>
      <div>
        <p className="stat-value">{value}</p>
        <p className="stat-label">{label}</p>
      </div>
      <ArrowRight size={16} className="stat-arrow" />
    </Link>
  );
}

function QuickLink({ to, label, icon }) {
  return (
    <Link to={to} className="quick-link-card">
      {icon}
      <span>{label}</span>
      <ArrowRight size={14} />
    </Link>
  );
}
