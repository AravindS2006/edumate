'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

const STORAGE_KEY = 'serverAlertDismissed';

export function ServerAlertBanner() {
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) setDismissed(false);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div className="w-full bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-start gap-3">
      <AlertTriangle className="text-amber-500 mt-0.5 flex-shrink-0" size={18} />
      <p className="text-sm text-amber-800 flex-1">
        <span className="font-semibold">Server Notice:</span> The Sairam backend server is currently
        experiencing downtime. Some features may be unavailable or show errors. Please try again later.
      </p>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss alert"
        className="text-amber-500 hover:text-amber-700 transition-colors flex-shrink-0"
      >
        <X size={18} />
      </button>
    </div>
  );
}
