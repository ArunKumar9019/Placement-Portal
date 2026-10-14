// ProtectedRoute.jsx
// Wraps a route so only authenticated users with the correct role can access it.
// Redirects unauthenticated visitors to /login.
// Redirects wrong-role users to their own dashboard.

import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, role }) {
  const { user, token } = useAuth();

  // No token → send to login
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // Wrong role → redirect to the right place
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  return children;
}
