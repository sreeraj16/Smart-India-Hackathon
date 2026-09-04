'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, Sliders, Award, UserCheck, Layers } from 'lucide-react';
import { HackathonStateManager } from '@/lib/store/stateManager';

export function RoleSwitcher() {
  const pathname = usePathname();
  const currentUser = HackathonStateManager.getCurrentUser();
  const userEmail = (currentUser?.email || '').trim().toLowerCase();

  // Only render for vasuch9959@rguktn.ac.in
  if (userEmail !== 'vasuch9959@rguktn.ac.in') {
    return null;
  }

  const portals = [
    { label: 'Admin Portal', href: '/admin/dashboard', match: '/admin', icon: Shield, badgeColor: 'bg-amber-500' },
    { label: 'Coordinator Portal', href: '/coordinator/dashboard', match: '/coordinator', icon: Sliders, badgeColor: 'bg-indigo-500' },
    { label: 'Jury Portal', href: '/jury/dashboard', match: '/jury', icon: Award, badgeColor: 'bg-emerald-500' },
    { label: 'Team Lead Portal', href: '/dashboard', match: '/dashboard', icon: UserCheck, badgeColor: 'bg-blue-500' },
  ];

  return (
    <div className="bg-slate-900 text-white border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between text-xs shadow-md">
      <div className="flex items-center gap-2 font-bold text-amber-400">
        <Layers className="w-4 h-4 animate-spin-slow" />
        <span>Multi-Role Access Authorized: <span className="text-white font-normal">vasuch9959@rguktn.ac.in</span></span>
      </div>

      <div className="flex items-center gap-1.5 mt-1 sm:mt-0">
        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mr-1">Switch Portal:</span>
        {portals.map((p) => {
          const Icon = p.icon;
          const isActive = pathname.startsWith(p.match);
          return (
            <Link
              key={p.href}
              href={p.href}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1.5 ${
                isActive
                  ? `${p.badgeColor} text-white shadow-sm ring-2 ring-white/20`
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {p.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
