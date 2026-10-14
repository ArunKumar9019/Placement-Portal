// MyApplications.jsx
// Shows the logged-in student's full application history with statuses.

import { useState, useEffect } from 'react';
import StudentLayout from '../components/StudentLayout';
import StatusBadge from '../components/StatusBadge';
import Spinner from '../components/Spinner';
import { applicationApi } from '../services/api';
import { ClipboardList, MapPin, Calendar } from 'lucide-react';

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function MyApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetch() {
      try {
        const data = await applicationApi.getMine();
        setApplications(data.applications || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

  return (
    <StudentLayout>
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title">My Applications</h1>
            <p className="page-subtitle">
              {applications.length} application{applications.length !== 1 ? 's' : ''} total
            </p>
          </div>
        </div>

        {loading && <Spinner />}
        {error && <div className="alert alert-error">{error}</div>}

        {!loading && !error && applications.length === 0 && (
          <div className="empty-state">
            <ClipboardList size={48} />
            <p>You haven't applied to any jobs yet.</p>
          </div>
        )}

        {!loading && !error && applications.length > 0 && (
          <div className="application-list">
            {applications.map((app) => (
              <div key={app._id} className="application-card">
                <div className="app-card-header">
                  <div>
                    <h3 className="app-job-title">{app.job?.title ?? 'Job Deleted'}</h3>
                    <p className="app-company">{app.job?.company?.name ?? '—'}</p>
                  </div>
                  <StatusBadge status={app.status} />
                </div>

                <div className="app-meta">
                  {app.job?.company?.location && (
                    <span><MapPin size={13} /> {app.job.company.location}</span>
                  )}
                  {app.job?.deadline && (
                    <span><Calendar size={13} /> Deadline: {formatDate(app.job.deadline)}</span>
                  )}
                  <span><Calendar size={13} /> Applied: {formatDate(app.createdAt)}</span>
                </div>

                {app.job?.description && (
                  <p className="app-description">{app.job.description.slice(0, 120)}…</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
