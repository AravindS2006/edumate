'use client';

import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export function ServerAlertBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="w-full bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-start gap-3">
      <AlertTriangle className="text-amber-500 mt-0.5 flex-shrink-0" size={18} />
      <p className="text-sm text-amber-800 flex-1">
        <span className="font-semibold">Server Notice:</span> The Sairam backend server is currently
        experiencing downtime. Some features may be unavailable or show errors. Please try again later.
      </p>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss alert"
        className="text-amber-500 hover:text-amber-700 transition-colors flex-shrink-0"
      >
        <X size={18} />
      </button>
    </div>
  );
}
