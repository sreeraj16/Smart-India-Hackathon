'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { HackathonStateManager } from '@/lib/store/stateManager';
import { UserRole, UserProfile } from '@/lib/types';
import { createClient } from '@/utils/supabase/client';
import { Shield, Award, UserCheck, Lock, Mail, ArrowRight, ClipboardList } from 'lucide-react';

export default function LoginPage() {
  const [activeRole, setActiveRole] = useState<UserRole>('team_lead');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (activeRole === 'team_lead') {
      setErrorMsg('Please login using Google OAuth.');
      return;
    }

    if (activeRole === 'jury') {
      const juryNameOrId = email.trim();
      if (!juryNameOrId) {
        setErrorMsg('Please enter your Jury Name or ID.');
        return;
      }

      const userObj: UserProfile = {
        user_id: `jury-${juryNameOrId.replace(/\s+/g, '-').toLowerCase()}`,
        name: juryNameOrId,
        email: `${juryNameOrId.replace(/\s+/g, '-').toLowerCase()}@jury.sih.local`,
        role: 'jury',
        jury_id: `jury-${juryNameOrId.replace(/\s+/g, '-').toLowerCase()}`,
        created_at: new Date().toISOString()
      };

      HackathonStateManager.setCurrentUser(userObj);
      router.push('/jury/dashboard');
    } else if (activeRole === 'coordinator') {
      if (!email.trim() || !password) {
        setErrorMsg('Please enter both Coordinator ID and Password.');
        return;
      }

      const input = email.trim().toLowerCase();
      const pass = password.trim();

      if (
        (input === 'panel1' && pass === 'panel1') ||
        (input === 'panel2' && pass === 'panel2') ||
        (input === 'panel3' && pass === 'panel3')
      ) {
        const panelNumber = input === 'panel1' ? 'Panel 1' : input === 'panel2' ? 'Panel 2' : 'Panel 3';
        const userObj: UserProfile = {
          user_id: input,
          name: `${panelNumber} Coordinator`,
          email: `${input}@sih.local`,
          role: 'coordinator',
          panel: panelNumber,
          created_at: new Date().toISOString()
        };

        HackathonStateManager.setCurrentUser(userObj);
        router.push('/coordinator/dashboard');
      } else {
        setErrorMsg('Invalid Coordinator ID or Password. (Try: panel1 / panel2 / panel3)');
      }
    } else if (activeRole === 'admin') {
      if (!email.trim() || !password) {
        setErrorMsg('Please enter both Email and Password.');
        return;
      }

      try {
        const response = await fetch('/api/auth/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password })
        });
        const data = await response.json();

        if (data.success && data.user) {
          HackathonStateManager.setCurrentUser(data.user);
          router.push('/admin/dashboard');
        } else {
          setErrorMsg(data.error || 'Invalid Admin Credentials.');
        }
      } catch (err) {
        console.error('Admin API error:', err);
        setErrorMsg('Authentication request failed. Please try again.');
      }
    }
  };

  const handleGoogleAuth = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
    const redirectUri = encodeURIComponent(window.location.origin + '/');
    const scope = encodeURIComponent('openid email profile');
    const state = encodeURIComponent(activeRole);
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}&prompt=select_account`;

    window.location.href = googleAuthUrl;
  };

  return (
    <div className="py-16 bg-slate-50 min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center space-x-3 bg-white p-2 px-4 rounded-2xl border border-slate-200 shadow-sm mb-3">
            <img src="/rgukt-logo.png" alt="RGUKT Logo" className="h-10 w-auto object-contain" />
            <div className="h-6 w-px bg-slate-200" />
            <img src="/sih-logo.png" alt="SIH Logo" className="h-10 w-auto object-contain" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">Portal Login</h1>
          <p className="text-xs text-slate-500 mt-1">SIH Internal Hackathon 2026 — RGUKT Nuzvid</p>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-4 gap-1 bg-slate-200/80 p-1.5 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => { setActiveRole('team_lead'); setErrorMsg(''); }}
            className={`py-2 px-1 rounded-xl text-[10px] sm:text-xs font-bold transition-all flex flex-col items-center gap-1 ${
              activeRole === 'team_lead'
                ? 'bg-white text-brand-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-4 h-4" /> Team Lead
          </button>
          
          <button
            type="button"
            onClick={() => { setActiveRole('jury'); setErrorMsg(''); }}
            className={`py-2 px-1 rounded-xl text-[10px] sm:text-xs font-bold transition-all flex flex-col items-center gap-1 ${
              activeRole === 'jury'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Award className="w-4 h-4" /> Jury Member
          </button>

          <button
            type="button"
            onClick={() => { setActiveRole('coordinator'); setErrorMsg(''); }}
            className={`py-2 px-1 rounded-xl text-[10px] sm:text-xs font-bold transition-all flex flex-col items-center gap-1 ${
              activeRole === 'coordinator'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ClipboardList className="w-4 h-4" /> Coordinator
          </button>

          <button
            type="button"
            onClick={() => { setActiveRole('admin'); setErrorMsg(''); }}
            className={`py-2 px-1 rounded-xl text-[10px] sm:text-xs font-bold transition-all flex flex-col items-center gap-1 ${
              activeRole === 'admin'
                ? 'bg-white text-amber-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-4 h-4" /> Admin
          </button>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6 text-xs font-semibold text-slate-700 border-b border-slate-100 pb-3">
            <span>Logging in as:</span>
            <span className="capitalize font-bold text-brand-600">
              {activeRole.replace('_', ' ')}
            </span>
          </div>

          {errorMsg && (
            <div className="bg-rose-50 text-rose-700 text-xs p-3 rounded-xl border border-rose-200 mb-4 font-bold">
              {errorMsg}
            </div>
          )}

          {activeRole === 'team_lead' ? (
            <div className="space-y-4 text-center py-4">
              <div className="text-xs text-slate-600 leading-relaxed font-medium">
                Team Leads and registered members must authenticate securely using <strong>Google OAuth</strong>.
              </div>
              <button
                type="button"
                onClick={handleGoogleAuth}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                Sign In with Google
              </button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {activeRole === 'jury' ? 'Jury Member Name or ID *' : activeRole === 'coordinator' ? 'Coordinator Username/ID *' : 'Email Address *'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder={
                      activeRole === 'jury' ? 'e.g. Dr. V. S. R. Murthy or Jury-A' : activeRole === 'coordinator' ? 'e.g. panel1, panel2, panel3' : 'admin@rgukt.ac.in'
                    }
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all font-semibold"
                  />
                </div>
              </div>

              {(activeRole === 'admin' || activeRole === 'coordinator') && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Password *</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all font-semibold"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full mt-4 bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all hover:scale-[1.01] flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                Sign In to Portal <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Google Auth Option for other roles (only show when not team_lead since team_lead has it above) */}
          {activeRole !== 'team_lead' && activeRole !== 'coordinator' && (
            <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
              <button
                type="button"
                onClick={handleGoogleAuth}
                className="w-full py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                Sign In with Google
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
