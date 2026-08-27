'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { HackathonStateManager } from '@/lib/store/stateManager';
import { Team, JuryEvaluation } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { Award, ShieldAlert, FileText, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

export default function JuryDashboardPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [evaluations, setEvaluations] = useState<JuryEvaluation[]>([]);
  const [showGuidelines, setShowGuidelines] = useState(true);

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

      {/* Roster of Assigned Teams */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Assigned Teams for Evaluation</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {teams.map((team) => {
            const myEval = evaluations.find(e => e.jury_id === currentJuryId && e.team_id === team.team_id);
            const hasSlides = !!(team.google_slides_url || team.ppt_submission);
            const primaryPS = team.selected_problem_statements[0];

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
                  <p className="text-xs text-slate-500 mb-4">Lead: {team.team_lead_name} • {team.members.length} Members</p>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mb-6 text-xs space-y-1">
                    <div className="font-extrabold text-brand-700">{primaryPS?.problem_id}: {primaryPS?.category}</div>
                    <div className="font-bold text-slate-800">{primaryPS?.problem_title}</div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-bold">
                    Google Slides: {hasSlides ? '🟢 Placed' : '🔴 Not Placed'}
                  </span>

                  <Link
                    href={`/jury/evaluate/${team.team_id}`}
                    className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 ${
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
      </div>

    </div>
  );
}
