'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { HackathonStateManager } from '@/lib/store/stateManager';
import { UserProfile } from '@/lib/types';
import { Award, LayoutDashboard, LogOut } from 'lucide-react';

import { ROLE_PORTALS } from '@/lib/config';
import { RoleSwitcher } from '@/components/RoleSwitcher';

export default function JuryLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyJuryAccess = async () => {
      const user = HackathonStateManager.getCurrentUser();
      
      try {
        const res = await fetch('/api/auth/verify-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user || {})
        });
        const data = await res.json();

        if (!data.authenticated || !data.user) {
          HackathonStateManager.setCurrentUser(null);
          router.replace('/login');
          return;
        }

        const verifiedUser: UserProfile = {
          user_id: data.user.user_id || user?.user_id || `jury-${Date.now()}`,
          name: data.user.name || user?.name || 'Jury Panelist',
          email: data.user.email,
          role: data.user.role,
          jury_id: data.user.jury_id || user?.jury_id,
          panel: data.user.panel || user?.panel,
          created_at: new Date().toISOString()
        };

        HackathonStateManager.setCurrentUser(verifiedUser);

        // Strict role check: MUST be jury (except for vasuch9959@rguktn.ac.in)
        const isSuperMultiUser = verifiedUser.email?.toLowerCase() === 'vasuch9959@rguktn.ac.in';
        if (!isSuperMultiUser && verifiedUser.role !== 'jury') {
          const targetPortal = ROLE_PORTALS[verifiedUser.role] || '/login';
          router.replace(targetPortal);
          return;
        }

        setCurrentUser(verifiedUser);
        HackathonStateManager.syncFromSupabase();
      } catch (err) {
        console.error('Error verifying jury session:', err);
      } finally {
        setLoading(false);
      }
    };

    verifyJuryAccess();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-300">Verifying Jury Access...</p>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    HackathonStateManager.setCurrentUser(null);
    router.push('/login');
  };


  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <RoleSwitcher />
      <div className="flex-1 flex flex-col md:flex-row">
      
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
    </div>
  );
}
