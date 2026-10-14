// AdminLayout.jsx
// Wraps all admin pages with a fixed sidebar + top bar.

import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Building2,
  Briefcase,
  ClipboardList,
  LogOut,
  Shield,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/companies', icon: Building2, label: 'Companies' },
  { to: '/admin/jobs', icon: Briefcase, label: 'Job Postings' },
  { to: '/admin/applications', icon: ClipboardList, label: 'Applications' },
];

export default function AdminLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="layout">
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className="sidebar sidebar-admin">
        <div className="sidebar-brand">
          <Shield size={28} />
          <span>Admin Panel</span>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'nav-link-active' : ''}`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="avatar avatar-admin">{user?.name?.[0]?.toUpperCase() || 'A'}</div>
            <div>
              <p className="sidebar-user-name">{user?.name}</p>
              <p className="sidebar-user-role">Administrator</p>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout} title="Logout">
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────── */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
