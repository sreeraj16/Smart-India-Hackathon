'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { HackathonStateManager } from '@/lib/store/stateManager';
import { UserProfile } from '@/lib/types';
import { Shield, LayoutDashboard, Users, Clock, Trophy, FileSpreadsheet, LogOut, Sliders } from 'lucide-react';

import { ROLE_PORTALS } from '@/lib/config';
import { RoleSwitcher } from '@/components/RoleSwitcher';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyAdminAccess = async () => {
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
          user_id: data.user.user_id || 'admin-1',
          name: data.user.name || 'Admin',
          email: data.user.email,
          role: data.user.role,
          created_at: new Date().toISOString()
        };

        HackathonStateManager.setCurrentUser(verifiedUser);

        // Strict role check: MUST be admin (except for vasuch9959@rguktn.ac.in)
        const isSuperMultiUser = verifiedUser.email?.toLowerCase() === 'vasuch9959@rguktn.ac.in';
        if (!isSuperMultiUser && verifiedUser.role !== 'admin') {
          const targetPortal = ROLE_PORTALS[verifiedUser.role] || '/login';
          router.replace(targetPortal);
          return;
        }

        setCurrentUser(verifiedUser);
        HackathonStateManager.syncFromSupabase();
      } catch (err) {
        console.error('Error verifying admin session:', err);
      } finally {
        setLoading(false);
      }
    };

    verifyAdminAccess();
  }, [router]);

  const handleLogout = () => {
    HackathonStateManager.setCurrentUser(null);
    router.push('/login');
  };

  const navItems = [
    { href: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/admin/teams', label: 'Teams Roster', icon: Users },
    { href: '/admin/presentation-control', label: 'Presentation Timer', icon: Clock, highlight: true },
    { href: '/admin/coordinators', label: 'Coordinator Tracking', icon: Sliders },
    { href: '/admin/results', label: 'Results & Top 50', icon: Trophy },
    { href: '/admin/audit-logs', label: 'Audit Logs', icon: FileSpreadsheet },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-300">Verifying Admin Access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <RoleSwitcher />
      <div className="flex-1 flex flex-col md:flex-row">
      
      {/* Admin Sidebar */}
      <aside className="w-full md:w-64 bg-slate-950 text-white flex-shrink-0 flex flex-col justify-between p-6">
        <div>
          {/* Admin Header */}
          <div className="flex items-center gap-3 mb-6 p-3 bg-amber-950/40 border border-amber-800/40 rounded-2xl">
            <Shield className="w-8 h-8 text-amber-500 flex-shrink-0" />
            <div>
              <div className="text-xs font-bold text-white leading-tight">Admin Controller</div>
              <div className="text-[10px] text-amber-400 font-semibold">SIH 2026 Operations</div>
            </div>
          </div>

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
                      ? 'bg-amber-600 text-white shadow-md'
                      : item.highlight
                      ? 'bg-amber-900/40 text-amber-200 hover:bg-amber-900'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
          <div className="truncate">
            <div className="text-xs font-bold text-white truncate">{currentUser?.name}</div>
            <div className="text-[10px] text-slate-400">Super Admin</div>
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
