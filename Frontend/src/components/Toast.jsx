// Toast.jsx — simple dismissible notification banner

import { useEffect } from 'react';

export default function Toast({ message, type = 'info', onClose }) {
  // Auto-dismiss after 4 seconds
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className={`toast toast-${type}`} role="alert">
      <span>{message}</span>
      <button className="toast-close" onClick={onClose} aria-label="Dismiss">×</button>
    </div>
  );
}
