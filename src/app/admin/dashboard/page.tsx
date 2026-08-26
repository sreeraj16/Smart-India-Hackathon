'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { HackathonStateManager } from '@/lib/store/stateManager';
import { Users, FileText, Clock, Award, Trophy, ArrowRight, ShieldCheck } from 'lucide-react';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalTeams: 0,
    totalParticipants: 0,
    pptsUploaded: 0,
    presentationsCompleted: 0,
    evaluationsCompleted: 0,
    top50Selected: 0
  });

  useEffect(() => {
    const teams = HackathonStateManager.getTeams();
    const evals = HackathonStateManager.getEvaluations();
    const overrides = HackathonStateManager.getTop50Overrides();

    const participants = teams.reduce((acc, t) => acc + t.members.length, 0);
    const ppts = teams.filter(t => t.ppt_submission).length;
    
    // Top 50 calculation
    const teamsWithScore = teams.map(t => {
      const avg = HackathonStateManager.getTeamAverageScore(t.team_id);
      return { id: t.team_id, avg };
    }).sort((a, b) => b.avg - a.avg);

    let selectedCount = 0;
    teamsWithScore.forEach((t, i) => {
      const isOverridden = overrides[t.id]?.selected;
      if (isOverridden === true || (isOverridden === undefined && i < 50)) {
        selectedCount++;
      }
    });

    setStats({
      totalTeams: teams.length,
      totalParticipants: participants,
      pptsUploaded: ppts,
      presentationsCompleted: 2, // demo
      evaluationsCompleted: evals.length,
      top50Selected: selectedCount
    });
  }, []);

  return (
    <div className="space-y-8">
      
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200">
        <div className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">Central Hackathon Controller</div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Admin Control Center</h1>
        <p className="text-xs text-slate-500 mt-1">
          Monitor team registrations, manage presentation slots with realtime timer & buzzer, review jury evaluations, and finalize Top 50 results.
        </p>
      </div>

      {/* 6 Top Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
          <Users className="w-6 h-6 text-brand-600 mx-auto mb-2" />
          <div className="text-2xl font-extrabold text-slate-900">{stats.totalTeams}</div>
          <div className="text-[11px] font-bold text-slate-500 mt-0.5">Total Teams</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
          <Users className="w-6 h-6 text-brand-700 mx-auto mb-2" />
          <div className="text-2xl font-extrabold text-slate-900">{stats.totalParticipants}</div>
          <div className="text-[11px] font-bold text-slate-500 mt-0.5">Participants</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
          <FileText className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
          <div className="text-2xl font-extrabold text-slate-900">{stats.pptsUploaded}</div>
          <div className="text-[11px] font-bold text-slate-500 mt-0.5">PPTs Uploaded</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
          <Clock className="w-6 h-6 text-purple-600 mx-auto mb-2" />
          <div className="text-2xl font-extrabold text-slate-900">{stats.presentationsCompleted}</div>
          <div className="text-[11px] font-bold text-slate-500 mt-0.5">Presentations Done</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
          <Award className="w-6 h-6 text-amber-600 mx-auto mb-2" />
          <div className="text-2xl font-extrabold text-slate-900">{stats.evaluationsCompleted}</div>
          <div className="text-[11px] font-bold text-slate-500 mt-0.5">Evaluations Done</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center bg-gradient-to-b from-amber-50 to-white border-amber-200">
          <Trophy className="w-6 h-6 text-amber-600 mx-auto mb-2" />
          <div className="text-2xl font-extrabold text-amber-900">{stats.top50Selected}</div>
          <div className="text-[11px] font-bold text-amber-800 mt-0.5">Top 50 Selected</div>
        </div>

      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center mb-4">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Teams Roster & PPT Mapping</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              View full list of registered teams, verify uploaded presentation files, and map team IDs to slide decks.
            </p>
          </div>
          <Link
            href="/admin/teams"
            className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
          >
            Manage Teams <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-4">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Presentation Timer & Buzzer</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Launch realtime 4-minute presentation slots with synchronized timer countdowns and automated time-up buzzers.
            </p>
          </div>
          <Link
            href="/admin/presentation-control"
            className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1"
          >
            Open Timer Control <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
              <Trophy className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Results & Top 50 Overrides</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              View auto-aggregated jury scores, apply manual admin overrides with audit logging, and export to Excel/CSV/PDF.
            </p>
          </div>
          <Link
            href="/admin/results"
            className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
          >
            Manage Top 50 <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </div>

    </div>
  );
}
