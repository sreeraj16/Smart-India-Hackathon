'use client';

import React, { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global Error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow text-center">
          <h2 className="text-xl font-extrabold text-slate-900 mb-2">
            Critical System Error
          </h2>
          <p className="text-xs text-slate-500 mb-6">
            A critical error occurred. Please refresh the application.
          </p>
          <button
            onClick={() => reset()}
            className="px-6 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl shadow cursor-pointer"
          >
            Reload Page
          </button>
        </div>
      </body>
    </html>
  );
}
