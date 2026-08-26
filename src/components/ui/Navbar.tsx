'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { HackathonStateManager } from '@/lib/store/stateManager';
import { UserProfile } from '@/lib/types';
import { Shield, UserCheck, Award, LogOut, FileText, CheckCircle2, ChevronRight } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const user = HackathonStateManager.getCurrentUser();
    setCurrentUser(user);

    const handleAuthChange = () => {
      setCurrentUser(HackathonStateManager.getCurrentUser());
    };

    window.addEventListener('sih_auth_changed', handleAuthChange);
    return () => window.removeEventListener('sih_auth_changed', handleAuthChange);
  }, []);

  const handleLogout = () => {
    HackathonStateManager.setCurrentUser(null);
    router.push('/login');
  };

  return (
    <nav className="sticky top-0 z-50 glass-nav shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          
          {/* Brand Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="flex items-center space-x-2 bg-white/90 p-1.5 px-2.5 rounded-2xl border border-slate-200 shadow-sm group-hover:border-brand-300 transition-all">
              <img
                src="/rgukt-logo.png"
                alt="RGUKT Emblem Logo"
                className="h-8 sm:h-9 w-auto object-contain transition-transform group-hover:scale-105"
              />
              <div className="h-6 w-px bg-slate-200/90" />
              <img
                src="/sih-logo.png"
                alt="Smart India Hackathon Logo"
                className="h-8 sm:h-9 w-auto object-contain transition-transform group-hover:scale-105"
              />
            </div>
            <div>
              <div className="font-bold text-slate-900 leading-tight group-hover:text-brand-600 transition-colors flex items-center gap-1.5">
                RGUKT Nuzvid
                <span className="text-[10px] bg-brand-100 text-brand-700 font-semibold px-2 py-0.5 rounded-full border border-brand-200">2026</span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Smart India Hackathon</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-6">
            <Link 
              href="/" 
              className={`text-sm font-medium transition-colors ${pathname === '/' ? 'text-brand-600 font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Home
            </Link>
            <Link 
              href="/guidelines" 
              className={`text-sm font-medium transition-colors ${pathname === '/guidelines' ? 'text-brand-600 font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Guidelines & Rules
            </Link>

            {/* Role specific quick links */}
            {currentUser?.role === 'team_lead' && (
              <Link 
                href="/dashboard" 
                className="text-sm font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
              >
                Team Dashboard <ChevronRight className="w-4 h-4" />
              </Link>
            )}

            {currentUser?.role === 'jury' && (
              <Link 
                href="/jury/dashboard" 
                className="text-sm font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
              >
                Jury Portal <ChevronRight className="w-4 h-4" />
              </Link>
            )}

            {currentUser?.role === 'admin' && (
              <Link 
                href="/admin/dashboard" 
                className="text-sm font-semibold text-amber-600 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
              >
                Admin Control <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </div>

          {/* User Auth CTA */}
          <div className="flex items-center space-x-3">
            {currentUser ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold text-slate-800">{currentUser.name}</div>
                  <div className="text-[11px] text-slate-500 capitalize flex items-center justify-end gap-1">
                    {currentUser.role === 'admin' && <Shield className="w-3 h-3 text-amber-600" />}
                    {currentUser.role === 'jury' && <Award className="w-3 h-3 text-emerald-600" />}
                    {currentUser.role === 'team_lead' && <UserCheck className="w-3 h-3 text-brand-600" />}
                    {currentUser.role.replace('_', ' ')}
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="text-sm font-medium text-slate-700 hover:text-brand-600 px-3 py-2 transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/guidelines"
                  className="text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl shadow-sm transition-all hover:shadow hover:scale-[1.02]"
                >
                  Register Team
                </Link>
              </div>
            )}
          </div>

        </div>
      </div>
    </nav>
  );
}
