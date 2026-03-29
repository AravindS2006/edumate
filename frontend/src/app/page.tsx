'use client';

import { useEffect } from 'react';

const REDIRECT_URL = 'https://student.sairam.edu.in/sign-in';

export default function Home() {
  useEffect(() => {
    window.location.replace(REDIRECT_URL);
  }, []);

  return (
    <>
      {/* Fallback for browsers with JavaScript disabled */}
      <noscript>
        <meta httpEquiv="refresh" content={`0; url=${REDIRECT_URL}`} />
      </noscript>
      <main className="flex min-h-[100dvh] flex-col items-center justify-center p-4">
        <p className="text-slate-600 text-sm">
          Redirecting to{' '}
          <a href={REDIRECT_URL} className="text-indigo-600 underline">
            {REDIRECT_URL}
          </a>
          &hellip;
        </p>
      </main>
    </>
  );
}
