'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { HackathonStateManager } from '@/lib/store/stateManager';
import { UserProfile, Team } from '@/lib/types';
import { ROLE_PORTALS } from '@/lib/config';
import { Users, LogOut, ShieldAlert, FileText, CheckCircle2 } from 'lucide-react';

export default function TeamMemberLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const localUser = HackathonStateManager.getCurrentUser();
        
        // Always verify against backend database authority
        const res = await fetch('/api/auth/verify-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(localUser || {})
        });

        const data = await res.json();

        if (!data.authenticated || !data.user) {
          HackathonStateManager.setCurrentUser(null);
          router.replace('/login');
          return;
        }

        const verifiedUser: UserProfile = {
          user_id: data.user.user_id || `user-${Date.now()}`,
          name: data.user.name || 'Team Member',
          email: data.user.email,
          role: data.user.role,
          team_id: data.user.team_id,
          created_at: new Date().toISOString()
        };

        // Sync local storage with DB authority
        HackathonStateManager.setCurrentUser(verifiedUser);

        // Strict role validation: Team Members ONLY -> /team-member
        if (verifiedUser.role !== 'team_member') {
          const targetPortal = ROLE_PORTALS[verifiedUser.role] || '/login';
          router.replace(targetPortal);
          return;
        }

        setCurrentUser(verifiedUser);
        let resolvedTeam = HackathonStateManager.getTeamForUser(verifiedUser);
        if (!resolvedTeam) {
          resolvedTeam = await HackathonStateManager.getTeamForUserAsync(verifiedUser);
        }
        setTeam(resolvedTeam || null);
      } catch (err) {
        console.error('Team Member layout authorization error:', err);
      } finally {
        setLoading(false);
      }
    };

    verifyAuth();
  }, [router]);

  const handleLogout = () => {
    HackathonStateManager.setCurrentUser(null);
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-600">Verifying Team Member Portal Access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex-shrink-0 flex flex-col justify-between p-6">
        <div>
          
          {/* Team ID Card */}
          <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-4 mb-6">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-teal-400">Team Member View</div>
            <div className="text-[11px] font-bold text-white mt-0.5 tracking-tight break-all">
              {team ? team.team_id : 'SIH-2026'}
            </div>
            <div className="text-xs text-slate-400 mt-1 font-medium truncate">
              {team ? team.team_name : 'Registered Team'}
            </div>
          </div>

          {/* Navigation Link */}
          <nav className="space-y-1.5">
            <Link
              href="/team-member"
              className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold bg-teal-600 text-white shadow-md"
            >
              <Users className="w-4 h-4" />
              Team Roster & Details
            </Link>
          </nav>

          <div className="mt-8 p-3.5 bg-amber-950/40 border border-amber-800/40 rounded-xl text-[11px] text-amber-200 space-y-1">
            <div className="font-bold flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> Read-Only Mode
            </div>
            <p className="text-[10px] text-amber-300/80 leading-relaxed">
              As a Team Member, you have read-only access to team details. Presentation uploads and editing are restricted to the designated Team Lead.
            </p>
          </div>
        </div>

        {/* User profile & logout */}
        <div className="pt-6 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <div className="truncate">
              <div className="text-xs font-bold text-white truncate">{currentUser?.name}</div>
              <div className="text-[10px] text-slate-400 truncate">{currentUser?.email}</div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
        {children}
      </main>

    </div>
  );
}
