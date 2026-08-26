'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HackathonStateManager } from '@/lib/store/stateManager';
import { UserProfile, UserRole } from '@/lib/types';
import { Rocket, ShieldCheck, Cpu, Users, Award, FileText, ArrowRight, CheckCircle, Loader2 } from 'lucide-react';

export default function LandingPage() {
  const [stats, setStats] = useState({ teamsCount: 0, psCount: 0, pptsCount: 0 });
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthStatus, setOauthStatus] = useState('');
  const router = useRouter();

  useEffect(() => {
    const teams = HackathonStateManager.getTeams();
    const ps = HackathonStateManager.getProblemStatements();
    const ppts = teams.filter(t => t.ppt_submission).length;
    setStats({
      teamsCount: teams.length,
      psCount: ps.length,
      pptsCount: ppts
    });

    // Check if returning from Google OAuth redirect with ?code=...
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const role = urlParams.get('state') || 'team_lead';

      if (code) {
        setOauthLoading(true);
        setOauthStatus('Authenticating via Google Cloud Credentials...');

        fetch('/api/auth/google/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            redirectUri: window.location.origin + '/'
          })
        })
          .then(res => res.json())
          .then(data => {
            if (data.success && data.user) {
              const googleUser: UserProfile = {
                user_id: `google-${data.user.id || Date.now()}`,
                name: data.user.name || 'Google Authenticated User',
                email: data.user.email || 'user@rgukt.ac.in',
                role: (role as UserRole) || 'team_lead',
                created_at: new Date().toISOString()
              };

              const userEmail = (data.user.email || '').toLowerCase();

              // Admin Google OAuth access restriction
              if (role === 'admin') {
                const adminEmails = ['n220615@rguktn.ac.in', 'vasuch9959@rguktn.ac.in'];
                if (!adminEmails.includes(userEmail)) {
                  setOauthStatus('Google Auth Notice: Unauthorized Admin Account.');
                  setOauthLoading(false);
                  return;
                }
              }

              const teams = HackathonStateManager.getTeams();
              // Check if user is the Team Lead OR a member of a registered team
              const matchedTeam = teams.find(t => 
                t.team_lead_email.toLowerCase() === userEmail ||
                (t.members && t.members.some(m => m.email.toLowerCase() === userEmail))
              );

              if (matchedTeam) {
                googleUser.team_id = matchedTeam.team_id;
              }

              HackathonStateManager.setCurrentUser(googleUser);

              window.history.replaceState({}, document.title, window.location.pathname);
              setOauthStatus(`Signed in as ${data.user.name} (${data.user.email})! Redirecting...`);

              setTimeout(() => {
                if (role === 'jury') {
                  router.push('/jury/dashboard');
                } else if (role === 'admin') {
                  router.push('/admin/dashboard');
                } else if (matchedTeam) {
                  router.push('/dashboard');
                } else {
                  // Direct unregistered Google users to Team & Members Registration page!
                  router.push('/register?google=true');
                }
              }, 800);
            } else {
              console.error('Google Auth Error:', data.error);
              setOauthStatus(`Google Auth Notice: ${data.error || 'Please login via Portal Credentials'}`);
              setOauthLoading(false);
            }
          })
          .catch(err => {
            console.error('OAuth callback error:', err);
            setOauthStatus('Authentication error occurred.');
            setOauthLoading(false);
          });
      }
    }
  }, [router]);

  return (
    <div className="relative overflow-hidden bg-slate-50 min-h-screen pb-16">
      
      {/* Hero Section */}
      <section className="relative pt-12 pb-16 md:pt-16 md:pb-20 gradient-hero border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          
          {/* Header Pill */}
          <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200 text-brand-800 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-6 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-brand-600 animate-pulse"></span>
            RGUKT Nuzvid Internal Hackathon 2026
          </div>

          {oauthStatus && (
            <div className="max-w-md mx-auto mb-6 p-4 bg-brand-50 border border-brand-200 rounded-2xl text-xs font-bold text-brand-900 shadow-sm flex items-center justify-center gap-2 animate-bounce">
              {oauthLoading && <Loader2 className="w-4 h-4 animate-spin text-brand-600" />}
              {oauthStatus}
            </div>
          )}

          {/* Heading */}
          <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight mb-6">
            Smart India Hackathon <br className="hidden sm:inline" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-700 via-rose-700 to-amber-600">
              Innovate. Build. Solve.
            </span>
          </h1>

          {/* Tagline */}
          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-8 leading-relaxed font-normal">
            Participate in the RGUKT Nuzvid Internal Hackathon and transform innovative ideas into impactful solutions for national problem statements.
          </p>

          {/* Hackathon Dates Banner */}
          <div className="max-w-xl mx-auto mb-10 p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm text-center">
            <div className="text-sm sm:text-base font-semibold text-slate-700 flex items-center justify-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-pulse"></span>
              Dates of Internal Hackathon: <span className="text-brand-600 font-black">7th & 8th September, 2026</span>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link
              href="/guidelines"
              className="w-full sm:w-auto bg-brand-600 hover:bg-brand-700 text-white font-bold text-base px-8 py-4 rounded-xl shadow-lg shadow-brand-700/25 hover:shadow-brand-800/40 transition-all hover:scale-105 flex items-center justify-center gap-2"
            >
              <Rocket className="w-5 h-5" />
              Register Now
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto bg-white hover:bg-slate-50 text-slate-800 font-semibold text-base px-8 py-4 rounded-xl border border-slate-200 shadow-sm transition-all hover:scale-105 flex items-center justify-center gap-2"
            >
              Login to Portal
            </Link>
          </div>

          {/* Live Stats Ticker */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="glass-card p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="text-3xl font-extrabold text-brand-600 mb-1">{stats.teamsCount}+</div>
              <div className="text-sm font-medium text-slate-600">Registered Teams</div>
            </div>
            <div className="glass-card p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="text-3xl font-extrabold text-emerald-600 mb-1">{stats.psCount}</div>
              <div className="text-sm font-medium text-slate-600">Problem Statements</div>
            </div>
            <div className="glass-card p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="text-3xl font-extrabold text-amber-600 mb-1">100</div>
              <div className="text-sm font-medium text-slate-600">Max Evaluation Marks</div>
            </div>
          </div>

        </div>
      </section>

      {/* Prominent Timeline Image Container */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md overflow-hidden">
          <h2 className="text-base sm:text-lg font-black text-slate-900 mb-6 flex items-center justify-center gap-2 border-b border-slate-100 pb-3">
            📋 SIH Process Flow & Timeline
          </h2>
          <div className="relative rounded-2xl overflow-hidden border border-slate-100 shadow-inner bg-slate-50 p-2">
            <img
              src="/sih-process-flow.png"
              alt="SIH Process Flow and Timeline"
              className="w-full h-auto object-contain"
            />
          </div>
        </div>
      </section>

    </div>
  );
}
