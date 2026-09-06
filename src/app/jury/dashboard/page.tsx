'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { HackathonStateManager } from '@/lib/store/stateManager';
import { Team, JuryEvaluation } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { Award, ShieldAlert, FileText, CheckCircle2, ChevronDown, ChevronUp, Search, X } from 'lucide-react';

export default function JuryDashboardPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [evaluations, setEvaluations] = useState<JuryEvaluation[]>([]);
  const [showGuidelines, setShowGuidelines] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setTeams(HackathonStateManager.getTeams());
    setEvaluations(HackathonStateManager.getEvaluations());

    const handleUpdate = () => {
      setTeams(HackathonStateManager.getTeams());
      setEvaluations(HackathonStateManager.getEvaluations());
    };

    window.addEventListener('sih_teams_updated', handleUpdate);
    window.addEventListener('sih_evaluations_updated', handleUpdate);
    return () => {
      window.removeEventListener('sih_teams_updated', handleUpdate);
      window.removeEventListener('sih_evaluations_updated', handleUpdate);
    };
  }, []);

  const juryRules = [
    "1. Verify Team Name, Members, and Problem Statement against the official list before scoring.",
    "2. Disqualify immediately any team not on the list or not present on time.",
    "3. Allow each team its full 4 minutes (Pitching) + 4 minutes (Q&A) — no more, no less.",
    "4. Evaluate strictly against the five published metrics (20 marks each, 100 total).",
    "5. Score fairly and without bias; complete the evaluation form for each team before moving to the next.",
    "6. Submit evaluations to coordinators through the system — never disclose scores or results directly to students.",
    "7. Maintain professionalism and fairness throughout the session.",
    "8. Give constructive feedback in the Comments field where time permits.",
    "9. Keep all evaluation details and team ideas confidential.",
    "10. Coordinate with venue coordinators/Admin for smooth session conduct."
  ];

  const currentUser = HackathonStateManager.getCurrentUser();
  const currentJuryId = currentUser?.jury_id || 'jury-1';

  // Case-insensitive filtering across Team ID, Team Name, Team Lead Name, Panel, Problem Statements, and Members
  const filteredTeams = teams.filter((team) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();

    const matchId = (team.team_id || '').toLowerCase().includes(q);
    const matchName = (team.team_name || '').toLowerCase().includes(q);
    const matchLead = (team.team_lead_name || '').toLowerCase().includes(q);
    const matchPanel = (team.panel || '').toLowerCase().includes(q);

    const matchPS = team.selected_problem_statements?.some(ps =>
      (ps.problem_id || '').toLowerCase().includes(q) ||
      (ps.problem_title || '').toLowerCase().includes(q)
    );

    const matchMember = team.members?.some(m =>
      (m.name || '').toLowerCase().includes(q) ||
      (m.id_number || '').toLowerCase().includes(q)
    );

    return matchId || matchName || matchLead || matchPanel || matchPS || matchMember;
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Official Jury Panel</div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Award className="w-6 h-6 text-emerald-600" /> Jury Evaluation Console
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Evaluator: <strong className="text-slate-800">{currentUser?.name || 'Dr. V. S. R. Murthy (Jury Chair)'}</strong>
          </p>
        </div>

        <div className="text-xs font-bold bg-emerald-50 text-emerald-800 px-3.5 py-1.5 rounded-xl border border-emerald-200">
          Assigned Teams: {teams.length}
        </div>
      </div>

      {/* Jury Guidelines Reference Panel (§19.0) */}
      <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowGuidelines(!showGuidelines)}
          className="w-full px-6 py-4 bg-emerald-50/70 hover:bg-emerald-100/70 flex items-center justify-between transition-colors text-left"
        >
          <div className="flex items-center gap-2 font-bold text-emerald-900 text-sm">
            <ShieldAlert className="w-5 h-5 text-emerald-600" />
            Jury Roles & Responsibilities Code (10 Rules)
          </div>
          {showGuidelines ? <ChevronUp className="w-4 h-4 text-emerald-700" /> : <ChevronDown className="w-4 h-4 text-emerald-700" />}
        </button>

        {showGuidelines && (
          <div className="p-6 bg-white border-t border-emerald-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-700">
              {juryRules.map((rule, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 font-medium">
                  {rule}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Team Search & Filter Input Bar */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Search className="w-4 h-4 text-emerald-600" /> Search & Filter Teams
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Quickly find any team by Team ID, Team Name, Team Lead Name, Panel, or Problem Statement ID.
            </p>
          </div>
          <span className="text-xs font-extrabold text-slate-700 bg-slate-100 px-3.5 py-1.5 rounded-xl border border-slate-200">
            Showing {filteredTeams.length} of {teams.length} teams
          </span>
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search Teams (e.g. ThinkAi, SIH26047, Panduru, Panel 1)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Roster of Assigned Teams */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Assigned Teams for Evaluation</h2>

        {filteredTeams.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-sm space-y-3">
            <Search className="w-8 h-8 text-slate-400 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900">No teams found matching "{searchQuery}"</h3>
            <p className="text-xs text-slate-500">Try adjusting your search criteria or clear the search input.</p>
            <button
              onClick={() => setSearchQuery('')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Clear Search Filter
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredTeams.map((team) => {
              const myEval = evaluations.find(e => e.jury_id === currentJuryId && e.team_id === team.team_id);
              const psList = team.selected_problem_statements || [];
              const primaryPS = psList[0];
              const secondaryPS = psList[1];
              const isDualPS = psList.length >= 2;

              const hasSlides1 = !!(team.google_slides_url || team.ppt_submission);
              const hasSlides2 = !!team.google_slides_url_2;

              return (
                <div
                  key={team.team_id}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:border-emerald-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-extrabold text-xs text-brand-700 bg-brand-50 border border-brand-100 px-3 py-1 rounded-lg">
                        {team.team_id}
                      </span>
                      {myEval ? (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Evaluated ({myEval.total_score}/100)
                        </span>
                      ) : (
                        <Badge variant="yellow">Pending Evaluation</Badge>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 mb-1">{team.team_name}</h3>
                    <p className="text-xs text-slate-500 mb-4">Lead: {team.team_lead_name} • {team.members.length} Members • {team.panel || 'Panel 1'}</p>

                    <div className="space-y-2 mb-6">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1">
                        <div className="font-extrabold text-brand-700">PS1 ({primaryPS?.problem_id}): {primaryPS?.category}</div>
                        <div className="font-bold text-slate-800 line-clamp-1">{primaryPS?.problem_title}</div>
                      </div>

                      {isDualPS && secondaryPS && (
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1">
                          <div className="font-extrabold text-indigo-700">PS2 ({secondaryPS?.problem_id}): {secondaryPS?.category}</div>
                          <div className="font-bold text-slate-800 line-clamp-1">{secondaryPS?.problem_title}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="text-[11px] text-slate-600 font-bold space-y-0.5">
                      {isDualPS ? (
                        <>
                          <div>PS1 Slides: {hasSlides1 ? '🟢 Added' : '🔴 Pending'}</div>
                          <div>PS2 Slides: {hasSlides2 ? '🟢 Added' : '🔴 Pending'}</div>
                        </>
                      ) : (
                        <div>Slides: {hasSlides1 ? '🟢 Placed' : '🔴 Not Placed'}</div>
                      )}
                    </div>

                    <Link
                      href={`/jury/evaluate/${team.team_id}`}
                      className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer ${
                        myEval
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white hover:scale-105'
                      }`}
                    >
                      <Award className="w-4 h-4" /> {myEval ? 'Review / Edit Score' : 'Evaluate Team'}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
