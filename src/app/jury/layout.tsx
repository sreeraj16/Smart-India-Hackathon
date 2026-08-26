'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { HackathonStateManager } from '@/lib/store/stateManager';
import { UserProfile } from '@/lib/types';
import { Award, LayoutDashboard, LogOut } from 'lucide-react';

export default function JuryLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const user = HackathonStateManager.getCurrentUser();
    if (!user || user.role !== 'jury') {
      HackathonStateManager.setCurrentUser(null);
      router.push('/login');
    } else {
      setCurrentUser(user);
    }
  }, []);

  const handleLogout = () => {
    HackathonStateManager.setCurrentUser(null);
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      
      {/* Jury Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex-shrink-0 flex flex-col justify-between p-6">
        <div>
          <div className="flex items-center gap-3 mb-6 p-3 bg-emerald-950/50 border border-emerald-800/40 rounded-2xl">
            <Award className="w-8 h-8 text-emerald-500 flex-shrink-0" />
            <div>
              <div className="text-xs font-bold text-white leading-tight">Jury Evaluation Portal</div>
              <div className="text-[10px] text-emerald-400 font-semibold">SIH 2026 Panelist</div>
            </div>
          </div>

          <nav className="space-y-1.5">
            <Link
              href="/jury/dashboard"
              className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
                pathname.startsWith('/jury')
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" /> Assigned Teams & Scoring
            </Link>
          </nav>
        </div>

        <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
          <div className="truncate">
            <div className="text-xs font-bold text-white truncate">{currentUser?.name}</div>
            <div className="text-[10px] text-slate-400">Jury Panelist</div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-rose-400 rounded-lg"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
        {children}
      </main>

    </div>
  );
}
