'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { HackathonStateManager } from '@/lib/store/stateManager';
import { UserProfile, Team } from '@/lib/types';
import { LayoutDashboard, Users, Layers, Bot, FileCheck, User, LogOut, ShieldAlert } from 'lucide-react';

export default function TeamDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [team, setTeam] = useState<Team | null>(null);

  useEffect(() => {
    const handleAuthOrTeamUpdate = () => {
      const user = HackathonStateManager.getCurrentUser();
      if (!user || user.role !== 'team_lead') {
        HackathonStateManager.setCurrentUser(null);
        router.push('/login');
      } else {
        setCurrentUser(user);
        if (user.team_id) {
          setTeam(HackathonStateManager.getTeamById(user.team_id) || null);
        }
      }
    };

    handleAuthOrTeamUpdate();

    // Initial mount sync from Supabase
    HackathonStateManager.syncFromSupabase().then(() => {
      handleAuthOrTeamUpdate();
    });

    window.addEventListener('sih_teams_updated', handleAuthOrTeamUpdate);
    window.addEventListener('sih_auth_changed', handleAuthOrTeamUpdate);

    return () => {
      window.removeEventListener('sih_teams_updated', handleAuthOrTeamUpdate);
      window.removeEventListener('sih_auth_changed', handleAuthOrTeamUpdate);
    };
  }, []);

  const handleLogout = () => {
    HackathonStateManager.setCurrentUser(null);
    router.push('/login');
  };

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/ai-assistant', label: 'AI Assistant', icon: Bot, highlight: true },
    { href: '/dashboard/presentation', label: 'PPT / Presentation', icon: FileCheck },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex-shrink-0 flex flex-col justify-between p-6">
        <div>
          
          {/* Team ID Card */}
          <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-4 mb-6">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">Team ID</div>
            <div className="text-[11px] font-bold text-white mt-0.5 tracking-tight break-all" title={team ? team.team_id : 'SIH-2026-1001'}>
              {team ? team.team_id : 'SIH-2026-1001'}
            </div>
            <div className="text-xs text-slate-400 mt-1 font-medium truncate">
              {team ? team.team_name : 'NeuralCrafters'}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-md'
                      : item.highlight
                      ? 'bg-rose-950/80 text-rose-200 hover:bg-rose-900 border border-rose-800/40'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                  {item.highlight && <span className="ml-auto text-[9px] bg-brand-500 text-white px-1.5 py-0.5 rounded font-bold">AI</span>}
                </Link>
              );
            })}
          </nav>
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
