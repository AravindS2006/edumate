'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, X } from 'lucide-react';

const DISMISSED_KEY = 'server-up-alert-dismissed';

export function ServerAlertBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISSED_KEY) === 'true');
    setLoaded(true);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, 'true');
    setDismissed(true);
  };

  if (!loaded || dismissed) return null;

  return (
    <div className="w-full bg-green-50 border-b border-green-200 px-4 py-3 flex items-start gap-3">
      <CheckCircle className="text-green-500 mt-0.5 flex-shrink-0" size={18} />
      <p className="text-sm text-green-800 flex-1">
        <span className="font-semibold">Server Notice:</span> The Sairam backend server is back up
        and running. All features are now available.
      </p>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss alert"
        className="text-green-500 hover:text-green-700 transition-colors flex-shrink-0"
      >
        <X size={18} />
      </button>
    </div>
  );
}
