'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { HackathonStateManager } from '@/lib/store/stateManager';
import { UserProfile } from '@/lib/types';
import { 
  LayoutDashboard, 
  Award, 
  LogOut, 
  Menu, 
  X,
  FileCheck
} from 'lucide-react';
import Link from 'next/link';

interface CoordinatorLayoutProps {
  children: React.ReactNode;
}

import { ROLE_PORTALS } from '@/lib/config';
import { RoleSwitcher } from '@/components/RoleSwitcher';

export default function CoordinatorLayout({ children }: CoordinatorLayoutProps) {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const verifyCoordinatorAccess = async () => {
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
          user_id: data.user.user_id || user?.user_id || 'coordinator-1',
          name: data.user.name || user?.name || 'Coordinator',
          email: data.user.email,
          role: data.user.role,
          panel: data.user.panel || user?.panel,
          created_at: new Date().toISOString()
        };

        HackathonStateManager.setCurrentUser(verifiedUser);

        // Strict role check: MUST be coordinator (except for vasuch9959@rguktn.ac.in)
        const isSuperMultiUser = verifiedUser.email?.toLowerCase() === 'vasuch9959@rguktn.ac.in';
        if (!isSuperMultiUser && verifiedUser.role !== 'coordinator') {
          const targetPortal = ROLE_PORTALS[verifiedUser.role] || '/login';
          router.replace(targetPortal);
          return;
        }

        setCurrentUser(verifiedUser);
        HackathonStateManager.syncFromSupabase();
      } catch (err) {
        console.error('Error verifying coordinator session:', err);
      }
    };

    verifyCoordinatorAccess();
  }, [router]);

  const handleLogout = () => {
    HackathonStateManager.setCurrentUser(null);
    router.push('/login');
  };


  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Verifying Coordinator Access...</p>
        </div>
      </div>
    );
  }

  const sidebarLinks = [
    {
      label: 'Dashboard',
      icon: LayoutDashboard,
      href: '/coordinator/dashboard'
    },
    {
      label: 'Work as Jury',
      icon: Award,
      href: '/coordinator/jury'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <RoleSwitcher />
      <div className="flex-1 flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-indigo-950 text-indigo-100 border-r border-indigo-900 shrink-0">
        <div className="p-6 border-b border-indigo-900 flex items-center gap-3">
          <FileCheck className="w-6 h-6 text-indigo-400" />
          <div>
            <h1 className="font-extrabold text-sm tracking-tight text-white">SIH Hackathon</h1>
            <p className="text-[10px] text-indigo-300 font-bold">{currentUser.panel || 'Coordinator'}</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1.5">
          {sidebarLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all hover:bg-indigo-900/60 hover:text-white"
              >
                <Icon className="w-4 h-4 shrink-0" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-indigo-900">
          <div className="px-4 py-3 mb-3 bg-indigo-900/40 rounded-xl">
            <div className="text-xs font-bold text-white truncate">{currentUser.name}</div>
            <div className="text-[10px] text-indigo-300 truncate">{currentUser.email}</div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-indigo-300 hover:bg-rose-950/40 hover:text-rose-200 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header - Mobile */}
        <header className="md:hidden bg-indigo-950 text-indigo-100 p-4 flex items-center justify-between border-b border-indigo-900">
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-indigo-400" />
            <span className="font-extrabold text-xs text-white">{currentUser.panel || 'Coordinator'}</span>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1 rounded-lg hover:bg-indigo-900 text-white cursor-pointer"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </header>

        {/* Mobile Navigation Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-indigo-950 border-b border-indigo-900 text-indigo-100 p-4 space-y-3">
            <nav className="space-y-1">
              {sidebarLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold hover:bg-indigo-900/60 text-white transition-all"
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
            <div className="pt-3 border-t border-indigo-900 flex justify-between items-center">
              <div className="text-[10px] font-bold text-indigo-300">
                {currentUser.name}
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-[10px] font-bold text-rose-300 hover:text-rose-200 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
      </div>
    </div>
  );
}
