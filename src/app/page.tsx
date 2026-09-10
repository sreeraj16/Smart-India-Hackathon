'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HackathonStateManager } from '@/lib/store/stateManager';
import { UserProfile, UserRole, Team } from '@/lib/types';
import { Rocket, ShieldCheck, Cpu, Users, Award, FileText, ArrowRight, CheckCircle, Loader2, Trophy, Search, User, Layers, X, Sparkles } from 'lucide-react';

export default function LandingPage() {
  const [stats, setStats] = useState({ teamsCount: 0, psCount: 0, pptsCount: 0 });
  const [selectedTeams, setSelectedTeams] = useState<Team[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'Software' | 'Hardware'>('all');
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthStatus, setOauthStatus] = useState('');
  const router = useRouter();

  useEffect(() => {
    const loadData = () => {
      const teams = HackathonStateManager.getTeams();
      const ps = HackathonStateManager.getProblemStatements();
      const ppts = teams.filter(t => t.ppt_submission).length;
      const selected = HackathonStateManager.getSelectedTeams();
      setStats({
        teamsCount: teams.length,
        psCount: ps.length,
        pptsCount: ppts
      });
      setSelectedTeams(selected);
    };

    loadData();

    // Sync from Supabase first
    HackathonStateManager.syncFromSupabase().then(() => {
      loadData();
    });

    const handleUpdate = () => loadData();
    window.addEventListener('sih_results_updated', handleUpdate);
    window.addEventListener('sih_teams_updated', handleUpdate);

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
          .then(async data => {
            if (data.success && data.user) {
              const userEmail = (data.user.email || '').trim().toLowerCase();

              // Verify user role server-side against Supabase DB
              const verifyRes = await fetch('/api/auth/verify-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  email: userEmail,
                  name: data.user.name,
                  role: role
                })
              });
              const verifyData = await verifyRes.json();

              const verifiedRole = verifyData.user?.role || (role as UserRole) || 'team_lead';

              const googleUser: UserProfile = {
                user_id: `google-${data.user.id || Date.now()}`,
                name: data.user.name || 'Google Authenticated User',
                email: data.user.email || 'user@rgukt.ac.in',
                role: verifiedRole as UserRole,
                team_id: verifyData.user?.team_id,
                created_at: new Date().toISOString()
              };

              const matchedTeam = await HackathonStateManager.getTeamForUserAsync(googleUser);

              if (matchedTeam) {
                googleUser.team_id = matchedTeam.team_id;
              }

              HackathonStateManager.setCurrentUser(googleUser);

              window.history.replaceState({}, document.title, window.location.pathname);
              setOauthStatus(`Signed in as ${data.user.name} (${data.user.email})! Redirecting...`);

              setTimeout(() => {
                if (verifiedRole === 'admin') {
                  router.push('/admin/dashboard');
                } else if (verifiedRole === 'coordinator') {
                  router.push('/coordinator/dashboard');
                } else if (verifiedRole === 'jury') {
                  router.push('/jury/dashboard');
                } else if (verifiedRole === 'team_member') {
                  router.push('/team-member');
                } else if (verifiedRole === 'team_lead' || matchedTeam) {
                  router.push('/dashboard');
                } else {
                  router.push('/register');
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

    return () => {
      window.removeEventListener('sih_results_updated', handleUpdate);
      window.removeEventListener('sih_teams_updated', handleUpdate);
    };
  }, [router]);

  const filteredTeams = selectedTeams.filter(team => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery = !q || (
      team.team_name.toLowerCase().includes(q) ||
      (team.team_lead_name || '').toLowerCase().includes(q) ||
      (team.members && team.members.some(m => (m.name || '').toLowerCase().includes(q))) ||
      (team.selected_problem_statements && team.selected_problem_statements.some(ps =>
        (ps.problem_id || '').toLowerCase().includes(q) ||
        (ps.problem_title || '').toLowerCase().includes(q)
      ))
    );

    const matchesCategory = categoryFilter === 'all' ||
      (team.selected_problem_statements && team.selected_problem_statements.some(ps => ps.category === categoryFilter));

    return matchesQuery && matchesCategory;
  });

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
          <div className="max-w-xl mx-auto mb-6 p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm text-center">
            <div className="text-sm sm:text-base font-semibold text-slate-700 flex items-center justify-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-pulse"></span>
              Dates of Internal Hackathon: <span className="text-brand-600 font-black">7th & 8th September, 2026</span>
            </div>
          </div>

          {/* Registration Closed Notice Banner */}
          <div className="max-w-2xl mx-auto mb-8 p-4 bg-rose-50 border border-rose-200 rounded-2xl shadow-sm text-center">
            <div className="text-sm sm:text-base font-extrabold text-rose-800 flex items-center justify-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse"></span>
              Team Registration Closed
            </div>
            <p className="text-xs text-rose-700 mt-1 font-semibold">
              The registration deadline has ended. No new team registrations are being accepted at this time.
            </p>
          </div>


          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <a
              href="#results"
              className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-base px-8 py-4 rounded-xl shadow-lg shadow-amber-500/25 transition-all hover:scale-105 flex items-center justify-center gap-2"
            >
              <Trophy className="w-5 h-5 text-amber-100" />
              View Selected Teams
            </a>
            <Link
              href="/register"
              className="w-full sm:w-auto bg-slate-800 hover:bg-slate-900 text-white font-bold text-base px-8 py-4 rounded-xl shadow-lg transition-all hover:scale-105 flex items-center justify-center gap-2"
            >
              <Rocket className="w-5 h-5 text-rose-400" />
              Registration Status
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto bg-brand-600 hover:bg-brand-700 text-white font-semibold text-base px-8 py-4 rounded-xl shadow-lg shadow-brand-700/25 transition-all hover:scale-105 flex items-center justify-center gap-2"
            >
              Login to Portal
            </Link>
          </div>

          {/* Live Stats Ticker */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 max-w-4xl mx-auto">
            <div className="glass-card p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="text-2xl sm:text-3xl font-extrabold text-brand-600 mb-1">{stats.teamsCount}+</div>
              <div className="text-xs sm:text-sm font-medium text-slate-600">Registered Teams</div>
            </div>
            <div className="glass-card p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 mb-1">{stats.psCount}</div>
              <div className="text-xs sm:text-sm font-medium text-slate-600">Problem Statements</div>
            </div>
            <div className="glass-card p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 mb-1">{selectedTeams.length}</div>
              <div className="text-xs sm:text-sm font-medium text-slate-600">Selected Teams</div>
            </div>
            <div className="glass-card p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-700 mb-1">100</div>
              <div className="text-xs sm:text-sm font-medium text-slate-600">Max Marks</div>
            </div>
          </div>

        </div>
      </section>

      {/* Results Section - Selected Teams (Unranked) */}
      <section id="results" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 mb-16 scroll-mt-24">
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-md">
          
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-10">
            <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-3 shadow-sm">
              <Trophy className="w-3.5 h-3.5 text-amber-600" />
              SIH 2026 Nominated Teams
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Selected Teams — RGUKT Nuzvid
            </h2>
            <p className="text-sm text-slate-600 mt-2 font-normal">
              Hearty congratulations to the teams selected for the Smart India Hackathon 2026!
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 text-[11px] font-medium px-3.5 py-1 rounded-full border border-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
              Teams are displayed in unranked order
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-8 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by team name, lead, or problem statement..."
                className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category Filter Buttons */}
            <div className="flex items-center gap-2 self-center sm:self-auto">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${categoryFilter === 'all' ? 'bg-brand-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
              >
                All Categories
              </button>
              <button
                onClick={() => setCategoryFilter('Software')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${categoryFilter === 'Software' ? 'bg-brand-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
              >
                Software
              </button>
              <button
                onClick={() => setCategoryFilter('Hardware')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${categoryFilter === 'Hardware' ? 'bg-brand-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
              >
                Hardware
              </button>
            </div>
          </div>

          {/* Teams Counter */}
          <div className="flex items-center justify-between text-xs text-slate-500 mb-6 px-1">
            <span>
              Showing <strong className="text-slate-800 font-bold">{filteredTeams.length}</strong> of {selectedTeams.length} selected team{selectedTeams.length === 1 ? '' : 's'}
            </span>
            {searchQuery && (
              <span className="text-brand-600 font-medium">Filtered by: &ldquo;{searchQuery}&rdquo;</span>
            )}
          </div>

          {/* Cards Grid */}
          {filteredTeams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredTeams.map((team) => {
                const leadMember = team.members?.find(m => m.is_lead) || team.members?.[0];
                const leadName = team.team_lead_name || leadMember?.name || 'Lead';
                const leadDept = leadMember?.department || team.department;
                const leadYear = leadMember?.year || team.year;
                const problemStatements = team.selected_problem_statements || [];

                return (
                  <div
                    key={team.team_id}
                    className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-brand-300 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Card Header: Team Name & Selected Badge */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 shrink-0">
                            <Users className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 leading-snug">
                              {team.team_name}
                            </h3>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {team.college || 'RGUKT Nuzvid'}
                            </span>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          Selected
                        </span>
                      </div>

                      {/* Team Lead Info */}
                      <div className="mb-4 p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          Team Lead
                        </div>
                        <div className="font-bold text-xs sm:text-sm text-slate-800">
                          {leadName}
                        </div>
                        {(leadDept || leadYear) && (
                          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                            {[leadDept, leadYear].filter(Boolean).join(' • ')}
                          </div>
                        )}
                      </div>

                      {/* Problem Statements */}
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <Layers className="w-3 h-3 text-slate-400" />
                          Selected Problem Statement{problemStatements.length > 1 ? 's' : ''}
                        </div>

                        {problemStatements.length > 0 ? (
                          <div className="space-y-2">
                            {problemStatements.map((ps, idx) => (
                              <div
                                key={ps.problem_id || idx}
                                className="p-2.5 bg-brand-50/40 rounded-xl border border-brand-100/70 text-xs"
                              >
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <span className="font-bold text-brand-700 text-[11px] bg-brand-100/80 px-2 py-0.5 rounded-md">
                                    {ps.problem_id || 'SIH2026'}
                                  </span>
                                  {ps.category && (
                                    <span className="text-[10px] text-slate-500 font-semibold bg-white px-2 py-0.5 rounded border border-slate-200">
                                      {ps.category}
                                    </span>
                                  )}
                                </div>
                                <p className="font-medium text-slate-700 text-xs line-clamp-2 leading-relaxed">
                                  {ps.problem_title || ps.description || 'Problem Statement Title'}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400 italic">
                            Problem statement details will be updated shortly
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                      <span>Members: {team.members?.length || 6} students</span>
                      <span className="text-brand-600 font-semibold">RGUKT SIH &apos;26</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 px-4 bg-slate-50 rounded-2xl border border-slate-200">
              {selectedTeams.length === 0 ? (
                <div className="max-w-md mx-auto space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-slate-800">
                    Selection Results in Progress
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    The evaluation committee is compiling the final selection list. Please check back once nominations are officially finalized.
                  </p>
                </div>
              ) : (
                <div className="max-w-md mx-auto space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <Search className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-slate-800">
                    No matching teams found
                  </h4>
                  <p className="text-xs text-slate-500">
                    No selected teams matched your search for &ldquo;{searchQuery}&rdquo;.
                  </p>
                  <button
                    onClick={() => { setSearchQuery(''); setCategoryFilter('all'); }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors shadow-sm"
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </section>

      {/* Prominent Timeline Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 mb-20">
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-md">
          <div className="text-center mb-10">
            <span className="text-[10px] bg-brand-100 text-brand-700 font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              Roadmap
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
              SIH Internal Hackathon Process Flow
            </h2>
            <p className="text-xs text-slate-500 mt-1.5">
              Follow these chronological phases to register, participate, and win nomination.
            </p>
          </div>

          <div className="relative border-l-2 border-slate-100 ml-3 sm:ml-6 space-y-8">
            {/* Step 1 */}
            <div className="relative pl-6 sm:pl-10">
              <span className="absolute -left-3.5 sm:-left-4.5 top-0 flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-brand-600 text-white font-extrabold text-xs shadow-md border-4 border-white">
                1
              </span>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex flex-wrap items-center gap-2">
                  Team Formation & Registration
                  <span className="text-[9px] sm:text-[10px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full border border-slate-200">
                    Phase 1 (Aug 25 - Sep 3)
                  </span>
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Form a team of exactly 6 student members including at least 1 female student (mandatory). Choose a problem statement directly from sih.gov.in and register on our platform.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative pl-6 sm:pl-10">
              <span className="absolute -left-3.5 sm:-left-4.5 top-0 flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-brand-600 text-white font-extrabold text-xs shadow-md border-4 border-white">
                2
              </span>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex flex-wrap items-center gap-2">
                  Presentation Deck Upload
                  <span className="text-[9px] sm:text-[10px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full border border-slate-200">
                    Phase 2 (Until Sep 5)
                  </span>
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Prepare your presentation slides using the official SIH template deck. Upload the PPT/PDF file directly from your Team Lead Dashboard to finalize eligibility.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative pl-6 sm:pl-10">
              <span className="absolute -left-3.5 sm:-left-4.5 top-0 flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-brand-600 text-white font-extrabold text-xs shadow-md border-4 border-white">
                3
              </span>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex flex-wrap items-center gap-2">
                  Jury Evaluation Slot (Screening)
                  <span className="text-[9px] sm:text-[10px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full border border-slate-200">
                    Phase 3 (Sep 7 - Sep 8)
                  </span>
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Pitch your solution to the internal evaluation jury. Your team has a 4-minute presentation slot, followed by 3 minutes of interactive Q&A from the examiners.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="relative pl-6 sm:pl-10">
              <span className="absolute -left-3.5 sm:-left-4.5 top-0 flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-brand-600 text-white font-extrabold text-xs shadow-md border-4 border-white">
                4
              </span>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex flex-wrap items-center gap-2">
                  Nomination & Official Central Entry
                  <span className="text-[9px] sm:text-[10px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full border border-slate-200">
                    Final Phase (Sep 9)
                  </span>
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  The top-performing selected teams will be officially nominated and registered on the central Smart India Hackathon portal by the institute's primary SPOC.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
