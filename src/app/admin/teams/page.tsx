'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { HackathonStateManager } from '@/lib/store/stateManager';
import { Team } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { Search, Filter, Eye, Users, FileText, CheckCircle2, Layers } from 'lucide-react';

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [pptFilter, setPptFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  useEffect(() => {
    setTeams(HackathonStateManager.getTeams());

    const handleUpdate = () => setTeams(HackathonStateManager.getTeams());
    window.addEventListener('sih_teams_updated', handleUpdate);
    return () => window.removeEventListener('sih_teams_updated', handleUpdate);
  }, []);

  const filteredTeams = teams.filter(team => {
    const matchesSearch = team.team_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          team.team_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          team.team_lead_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const hasPpt = !!team.ppt_submission;
    const matchesPpt = pptFilter === 'All' ||
                      (pptFilter === 'Uploaded' && hasPpt) ||
                      (pptFilter === 'Pending' && !hasPpt);

    const matchesStatus = statusFilter === 'All' || team.registration_status === statusFilter;

    return matchesSearch && matchesPpt && matchesStatus;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Registered Teams Directory</h1>
          <p className="text-xs text-slate-500 mt-1">Manage team rosters, verify uploaded presentation files, and monitor live evaluation scores.</p>
        </div>
        <div className="text-xs font-bold bg-amber-50 text-amber-800 px-3.5 py-1.5 rounded-xl border border-amber-200">
          Total Teams: {teams.length}
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Team ID, Name, or Lead..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-semibold">PPT Status:</span>
            <select
              value={pptFilter}
              onChange={(e) => setPptFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium"
            >
              <option value="All">All Statuses</option>
              <option value="Uploaded">Uploaded Only</option>
              <option value="Pending">Pending Only</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-semibold">Registration:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium"
            >
              <option value="All">All Teams</option>
              <option value="registered">Registered</option>
              <option value="disqualified">Disqualified</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      {teams.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">No Teams Registered Yet</h3>
          <p className="text-xs text-slate-500 mt-1">Teams registered by student team leads will appear here in real-time.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Team ID</th>
                  <th className="py-3.5 px-4">Team Name</th>
                  <th className="py-3.5 px-4">Team Lead</th>
                  <th className="py-3.5 px-4 text-center">Members</th>
                  <th className="py-3.5 px-4">Problem Statement</th>
                  <th className="py-3.5 px-4">PPT Status</th>
                  <th className="py-3.5 px-4 text-center">Jury Accumulated Score</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredTeams.map((team) => {
                  const hasPpt = !!team.ppt_submission;
                  const primaryPS = team.selected_problem_statements[0];

                  return (
                    <tr key={team.team_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-extrabold text-brand-700">{team.team_id}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{team.team_name}</td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        {team.team_lead_name}
                        <div className="text-[10px] text-slate-400">{team.team_lead_email}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold">{team.members.length}</td>
                      <td className="py-3.5 px-4 max-w-xs truncate">
                        <span className="font-semibold text-slate-800">{primaryPS ? primaryPS.problem_id : 'N/A'}</span>
                        <div className="text-[10px] text-slate-500 truncate">{primaryPS ? primaryPS.problem_title : '-'}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        {hasPpt ? (
                           <Badge variant="green">🟢 Uploaded</Badge>
                        ) : (
                          <Badge variant="yellow">🟡 Pending</Badge>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center font-extrabold text-slate-900">
                        {(() => {
                          const teamEvals = HackathonStateManager.getEvaluations().filter(e => e.team_id === team.team_id);
                          const totalAccum = teamEvals.reduce((sum, ev) => sum + ev.total_score, 0);
                          const maxPossible = teamEvals.length * 100;
                          return teamEvals.length > 0 ? `${totalAccum}/${maxPossible}` : '-';
                        })()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/admin/teams/${team.team_id}`}
                          className="px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold rounded-lg transition-colors inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> Details
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
