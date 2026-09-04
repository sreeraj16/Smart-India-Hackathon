'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TeamLeadAliasPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-bold text-slate-600">Redirecting to Team Lead Portal...</p>
      </div>
    </div>
  );
}
