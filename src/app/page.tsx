'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HackathonStateManager } from '@/lib/store/stateManager';
import { UserProfile, UserRole, Team } from '@/lib/types';
import { Rocket, ShieldCheck, Cpu, Users, Award, FileText, ArrowRight, CheckCircle, Loader2, Trophy, Search, User, Layers, X, Sparkles, Upload, FileSpreadsheet, Lock, Trash2 } from 'lucide-react';
import Top50UploadModal from '@/components/Top50UploadModal';
import { Modal } from '@/components/ui/Modal';
import top50Data from '@/lib/data/top50.json';

export default function LandingPage() {
  const [stats, setStats] = useState({ teamsCount: 0, psCount: 0, pptsCount: 0 });
  const [selectedTeams, setSelectedTeams] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [adminAuthModalOpen, setAdminAuthModalOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminAuthLoading, setAdminAuthLoading] = useState(false);
  const [adminAuthError, setAdminAuthError] = useState('');
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthStatus, setOauthStatus] = useState('');
  const router = useRouter();

  useEffect(() => {
    const loadData = () => {
      const teams = HackathonStateManager.getTeams();
      const ps = HackathonStateManager.getProblemStatements();
      const ppts = teams.filter(t => t.ppt_submission).length;
      setStats({
        teamsCount: teams.length,
        psCount: ps.length,
        pptsCount: ppts
      });

      const overrides = HackathonStateManager.getTop50Overrides();
      const combinedSelected: any[] = [];
      
      top50Data.forEach((item: any) => {
        const override = overrides[item.id];
        if (override && override.selected === false) {
           return;
        }
        
        combinedSelected.push({
           team_id: item.id,
           team_name: override?.team_name || item.team_name,
           team_lead_name: override?.team_lead_name || item.team_lead_name,
           selected_problem_statements: [
              {
                problem_id: override?.problem_id || item.problem_id,
                problem_title: override?.problem_title || 'Selected Problem Statement',
                category: undefined,
              }
           ]
        });
      });

      Object.entries(overrides).forEach(([teamId, ov]) => {
         if (ov.selected === true && !top50Data.some((t: any) => t.id === teamId)) {
            combinedSelected.push({
               team_id: teamId,
               team_name: ov.team_name || 'Unknown Team',
               team_lead_name: ov.team_lead_name || 'Team Lead',
               selected_problem_statements: [
                  {
                    problem_id: ov.problem_id || 'Unknown',
                    problem_title: ov.problem_title || 'Selected Problem Statement',
                    category: undefined,
                  }
               ]
            });
         }
      });

      setSelectedTeams(combinedSelected);
    };

    loadData();
    setCurrentUser(HackathonStateManager.getCurrentUser());

    // Sync from Supabase first
    HackathonStateManager.syncFromSupabase().then(() => {
      loadData();
      setCurrentUser(HackathonStateManager.getCurrentUser());
    });

    const handleUpdate = () => loadData();
    const handleAuthChange = () => {
      setCurrentUser(HackathonStateManager.getCurrentUser());
    };
    window.addEventListener('sih_results_updated', handleUpdate);
    window.addEventListener('sih_teams_updated', handleUpdate);
    window.addEventListener('sih_auth_changed', handleAuthChange);

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
      window.removeEventListener('sih_auth_changed', handleAuthChange);
    };
  }, [router]);

  const isVasuAdmin = currentUser?.role === 'admin' && ['vasuch9959@rguktn.ac.in', 'n220615@rguktn.ac.in'].includes((currentUser?.email || '').trim().toLowerCase());

  const handleAdminAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminAuthError('');
    setAdminAuthLoading(true);

    try {
      const res = await fetch('/api/auth/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'vasuch9959@rguktn.ac.in', password: adminPassword })
      });
      const data = await res.json();
      if (data.success && data.user) {
        HackathonStateManager.setCurrentUser(data.user);
        setCurrentUser(data.user);
        setAdminAuthModalOpen(false);
        setAdminPassword('');
        setUploadModalOpen(true);
      } else {
        setAdminAuthError(data.error || 'Incorrect admin password.');
      }
    } catch {
      setAdminAuthError('Authentication request failed. Please try again.');
    } finally {
      setAdminAuthLoading(false);
    }
  };

  const filteredTeams = selectedTeams.filter(team => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery = !q || (
      team.team_name.toLowerCase().includes(q) ||
      (team.team_lead_name || '').toLowerCase().includes(q) ||
      (team.members && team.members.some((m: any) => (m.name || '').toLowerCase().includes(q))) ||
      (team.selected_problem_statements && team.selected_problem_statements.some((ps: any) =>
        (ps.problem_id || '').toLowerCase().includes(q) ||
        (ps.problem_title || '').toLowerCase().includes(q)
      ))
    );

    return matchesQuery;
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

          {/* Admin Control Bar for vasuch9959@rguktn.ac.in */}
          {isVasuAdmin ? (
            <div className="mb-8 p-4 sm:p-5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-amber-500/10 border border-amber-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-extrabold text-amber-950 flex items-center gap-2">
                    Admin Tools: {currentUser?.email}
                    <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded-full border border-amber-300">
                      Super Admin
                    </span>
                  </div>
                  <p className="text-xs text-amber-800/80 mt-0.5">
                    Upload an Excel file (.xlsx / .xls) containing Top 50 teams to update the selection list live on the home page.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(true)}
                  className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  Upload Top 50 Excel
                </button>
                {selectedTeams.length > 0 && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (confirm('Are you sure you want to clear the current selected teams list?')) {
                        await HackathonStateManager.clearTop50Overrides(currentUser?.email);
                      }
                    }}
                    className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-rose-200"
                    title="Clear Selection List"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex justify-end mb-4">
              <button
                type="button"
                onClick={() => setAdminAuthModalOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-700 bg-slate-100/70 hover:bg-amber-50 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-amber-200 transition-all font-medium cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                Admin Excel Upload (vasuch9959@rguktn.ac.in)
              </button>
            </div>
          )}

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

          {/* 1-Column Structure (50 Rows) - Only Team Name, Team Lead, and Problem Statement */}
          {filteredTeams.length > 0 ? (
            <div className="space-y-3">
              {/* Header row on desktop */}
              <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100/80 rounded-xl border border-slate-200">
                <div className="md:col-span-4">Team Name</div>
                <div className="md:col-span-3">Team Lead</div>
                <div className="md:col-span-5">Problem Statement</div>
              </div>

              {/* 50 Rows */}
              {filteredTeams.map((team, index) => {
                const leadMember = team.members?.find(m => m.is_lead) || team.members?.[0];
                const leadName = team.team_lead_name || leadMember?.name || 'Lead';
                const ps = team.selected_problem_statements?.[0];

                return (
                  <div
                    key={team.team_id || index}
                    className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm hover:shadow-md hover:border-brand-300 transition-all grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-center"
                  >
                    {/* 1. Team Name */}
                    <div className="md:col-span-4">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 md:hidden">
                        Team Name
                      </div>
                      <div className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight">
                        {team.team_name}
                      </div>
                    </div>

                    {/* 2. Team Lead */}
                    <div className="md:col-span-3 border-t md:border-t-0 border-slate-100 pt-2 md:pt-0">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 md:hidden">
                        Team Lead
                      </div>
                      <div className="font-semibold text-xs sm:text-sm text-slate-800">
                        {leadName}
                      </div>
                    </div>

                    {/* 3. Problem Statement */}
                    <div className="md:col-span-5 border-t md:border-t-0 border-slate-100 pt-2 md:pt-0">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 md:hidden">
                        Problem Statement
                      </div>
                      <div className="flex items-start sm:items-center gap-2 flex-wrap sm:flex-nowrap">
                        {ps?.problem_id && (
                          <span className="shrink-0 font-bold text-brand-700 text-[11px] bg-brand-50 border border-brand-200/80 px-2.5 py-0.5 rounded-lg">
                            {ps.problem_id}
                          </span>
                        )}
                        <span className="font-medium text-slate-700 text-xs sm:text-sm line-clamp-2 sm:line-clamp-1" title={ps?.problem_title || ps?.description}>
                          {ps?.problem_title || ps?.description || ps?.problem_id || 'Selected Problem Statement'}
                        </span>
                      </div>
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
                    onClick={() => { setSearchQuery(''); }}
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

      {/* Top 50 Excel Upload Modal */}
      <Top50UploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        adminEmail={currentUser?.email || 'vasuch9959@rguktn.ac.in'}
        onSuccess={() => {
          loadData();
        }}
      />

      {/* Quick Admin Auth Modal for vasuch9959@rguktn.ac.in */}
      <Modal
        isOpen={adminAuthModalOpen}
        onClose={() => { setAdminAuthModalOpen(false); setAdminAuthError(''); setAdminPassword(''); }}
        title="Admin Authentication"
        maxWidth="sm"
      >
        <form onSubmit={handleAdminAuthSubmit} className="space-y-4">
          <div className="text-xs text-slate-600">
            Sign in as <strong className="text-slate-900">vasuch9959@rguktn.ac.in</strong> to upload the Top 50 Excel sheet.
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Admin Password
            </label>
            <input
              type="password"
              value={adminPassword}
              onChange={e => setAdminPassword(e.target.value)}
              placeholder="Enter admin password"
              required
              autoFocus
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          {adminAuthError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
              {adminAuthError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => { setAdminAuthModalOpen(false); setAdminAuthError(''); setAdminPassword(''); }}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={adminAuthLoading || !adminPassword}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-all flex items-center gap-1.5"
            >
              {adminAuthLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Sign In & Upload
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
