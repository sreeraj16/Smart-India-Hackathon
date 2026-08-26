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
            redirectUri: 'http://localhost:3000/'
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
    <div className="relative overflow-hidden">
      
      {/* Hero Section */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 gradient-hero border-b border-slate-200/60">
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
          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
            Participate in the RGUKT Nuzvid Internal Hackathon and transform innovative ideas into impactful solutions for national problem statements.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
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

      {/* Feature Cards Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Complete Hackathon Lifecycle Platform</h2>
            <p className="text-slate-600">
              From registration and AI-assisted pitch prep to real-time timer presentation control, jury evaluation, and transparent admin result management.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Feature 1 */}
            <div className="bg-slate-50 border border-slate-100 p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow group">
              <div className="w-14 h-14 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Rocket className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Innovate</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                Select problem statements across Software and Hardware domains. Utilize our AI Assistant for technical architecture and jury Q&A preparation.
              </p>
              <Link href="/problem-statements" className="text-sm font-semibold text-brand-600 flex items-center gap-1 hover:gap-2 transition-all">
                View Statements <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-50 border border-slate-100 p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow group">
              <div className="w-14 h-14 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Collaborate</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                Manage team lead and student member rosters dynamically. Securely upload PPT/PDF presentation decks for automated admin mapping.
              </p>
              <Link href="/guidelines" className="text-sm font-semibold text-emerald-600 flex items-center gap-1 hover:gap-2 transition-all">
                Read Guidelines <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-50 border border-slate-100 p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow group">
              <div className="w-14 h-14 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Award className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Compete</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                Present before esteemed jury panels with live synchronized countdown timer controls, Web Audio buzzers, and automated 100-mark evaluation forms.
              </p>
              <Link href="/login" className="text-sm font-semibold text-amber-600 flex items-center gap-1 hover:gap-2 transition-all">
                Jury & Admin Login <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

          </div>

        </div>
      </section>

      {/* Evaluation Rubric Quick Highlight */}
      <section className="py-16 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-xl">
              <div className="text-xs font-semibold text-amber-400 uppercase tracking-widest mb-2">Official Rubric</div>
              <h3 className="text-2xl sm:text-3xl font-bold mb-4">Strict 100-Mark Evaluation System</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                Evaluations are conducted objectively across 5 core dimensions (20 marks each): Innovation, Problem Relevance, Technical Feasibility, Presentation Skills, and Q&A Responses.
              </p>
              <Link
                href="/guidelines"
                className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm px-6 py-3 rounded-xl transition-all"
              >
                <FileText className="w-4 h-4" /> Review Full Rules
              </Link>
            </div>

            <div className="w-full md:w-auto grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-slate-800/80 border border-slate-700/80 p-4 rounded-xl text-center">
                <div className="text-2xl font-bold text-rose-400 mb-1">20 Marks</div>
                <div className="text-xs text-slate-300">Innovation & Novelty</div>
              </div>
              <div className="bg-slate-800/80 border border-slate-700/80 p-4 rounded-xl text-center">
                <div className="text-2xl font-bold text-emerald-400 mb-1">20 Marks</div>
                <div className="text-xs text-slate-300">Relevance to PS</div>
              </div>
              <div className="bg-slate-800/80 border border-slate-700/80 p-4 rounded-xl text-center">
                <div className="text-2xl font-bold text-amber-400 mb-1">20 Marks</div>
                <div className="text-xs text-slate-300">Technical Feasibility</div>
              </div>
              <div className="bg-slate-800/80 border border-slate-700/80 p-4 rounded-xl text-center">
                <div className="text-2xl font-bold text-purple-400 mb-1">20 Marks</div>
                <div className="text-xs text-slate-300">Presentation Skills</div>
              </div>
              <div className="bg-slate-800/80 border border-slate-700/80 p-4 rounded-xl text-center col-span-2 sm:col-span-1">
                <div className="text-2xl font-bold text-rose-400 mb-1">20 Marks</div>
                <div className="text-xs text-slate-300">Q&A Responses</div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
