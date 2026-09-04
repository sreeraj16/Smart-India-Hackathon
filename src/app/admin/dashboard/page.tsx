'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { HackathonStateManager } from '@/lib/store/stateManager';
import { Team } from '@/lib/types';
import { exportAllTeamsToExcel } from '@/lib/export/exportUtils';
import { Modal } from '@/components/ui/Modal';
import { 
  Users, 
  FileText, 
  Clock, 
  Award, 
  Trophy, 
  ArrowRight, 
  Download, 
  Layers, 
  Building2, 
  GraduationCap, 
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
  Search
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [stats, setStats] = useState({
    totalTeams: 0,
    totalParticipants: 0,
    totalDistinctPS: 0,
    teamsWithTwoPS: 0,
    pptsUploaded: 0,
    presentationsCompleted: 0,
    evaluationsCompleted: 0,
    top50Selected: 0
  });

  const [deptStats, setDeptStats] = useState<Record<string, number>>({});
  const [yearStats, setYearStats] = useState<Record<string, number>>({});
  const [panelStats, setPanelStats] = useState<Record<string, number>>({});
  const [psDistribution, setPsDistribution] = useState<Array<{ problem_id: string; title: string; category: string; domain: string; teamCount: number }>>([]);
  const [psSearchQuery, setPsSearchQuery] = useState('');

  const [isTwoPSModalOpen, setIsTwoPSModalOpen] = useState(false);
  const [deptFilter, setDeptFilter] = useState('All');

  useEffect(() => {
    loadDashboardData();
    window.addEventListener('sih_teams_updated', loadDashboardData);
    return () => window.removeEventListener('sih_teams_updated', loadDashboardData);
  }, []);

  const loadDashboardData = () => {
    const allTeams = HackathonStateManager.getTeams();
    setTeams(allTeams);

    const overrides = HackathonStateManager.getTop50Overrides();

    const participants = allTeams.reduce((acc, t) => acc + t.members.length, 0);
    const ppts = allTeams.filter(t => t.ppt_submission || t.google_slides_url).length;

    // Distinct Problem Statements & PS Distribution mapping
    const psSet = new Set<string>();
    const psCountMap = new Map<string, { problem_id: string; title: string; category: string; domain: string; teamCount: number }>();

    allTeams.forEach(t => {
      t.selected_problem_statements.forEach(ps => {
        if (ps && ps.problem_id) {
          psSet.add(ps.problem_id);
          const existing = psCountMap.get(ps.problem_id);
          if (existing) {
            existing.teamCount += 1;
          } else {
            psCountMap.set(ps.problem_id, {
              problem_id: ps.problem_id,
              title: ps.problem_title || ps.description || 'Problem Statement',
              category: ps.category || 'Software',
              domain: ps.domain || 'General',
              teamCount: 1
            });
          }
        }
      });
    });

    const psDistributionList = Array.from(psCountMap.values()).sort((a, b) => b.teamCount - a.teamCount);
    setPsDistribution(psDistributionList);

    // Teams with 2 Problem Statements
    const twoPSTeams = allTeams.filter(t => t.selected_problem_statements.length >= 2).length;

    // Top 50 calculation
    const teamsWithScore = allTeams.map(t => {
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

    const presentations = allTeams.filter(t => t.presentation_completed).length;
    const completedEvals = allTeams.filter(t => t.completed_at).length;

    // Department Analytics
    const depts: Record<string, number> = {
      'CSE': 0,
      'ECE': 0,
      'EEE': 0,
      'CHEM': 0,
      'MME': 0,
      'CIVIL': 0,
      'MECH': 0,
      'Other': 0
    };

    allTeams.forEach(t => {
      const lead = t.members.find(m => m.is_lead) || t.members[0];
      const dept = (t.department || (lead ? lead.department : '') || '').toUpperCase();

      if (dept.includes('COMPUTER') || dept.includes('CSE')) depts['CSE']++;
      else if (dept.includes('ELECTRONICS') || dept.includes('ECE')) depts['ECE']++;
      else if (dept.includes('ELECTRICAL') || dept.includes('EEE')) depts['EEE']++;
      else if (dept.includes('CHEMICAL') || dept.includes('CHEM')) depts['CHEM']++;
      else if (dept.includes('METALLURGICAL') || dept.includes('MME')) depts['MME']++;
      else if (dept.includes('CIVIL')) depts['CIVIL']++;
      else if (dept.includes('MECHANICAL') || dept.includes('MECH')) depts['MECH']++;
      else depts['Other']++;
    });

    // Academic Year Analytics
    const years: Record<string, number> = {
      'E1': 0,
      'E2': 0,
      'E3': 0,
      'E4': 0,
      'Other': 0
    };

    allTeams.forEach(t => {
      const lead = t.members.find(m => m.is_lead) || t.members[0];
      const yr = (t.year || (lead ? lead.year : '') || '').toUpperCase();

      if (yr.includes('E1')) years['E1']++;
      else if (yr.includes('E2')) years['E2']++;
      else if (yr.includes('E3')) years['E3']++;
      else if (yr.includes('E4')) years['E4']++;
      else years['Other']++;
    });

    // Panel Distribution Analytics
    const panels: Record<string, number> = {
      'Panel 1': 0,
      'Panel 2': 0,
      'Panel 3': 0
    };

    allTeams.forEach(t => {
      const p = t.panel || 'Panel 1';
      panels[p] = (panels[p] || 0) + 1;
    });

    setStats({
      totalTeams: allTeams.length,
      totalParticipants: participants,
      totalDistinctPS: psSet.size,
      teamsWithTwoPS: twoPSTeams,
      pptsUploaded: ppts,
      presentationsCompleted: presentations,
      evaluationsCompleted: completedEvals,
      top50Selected: selectedCount
    });

    setDeptStats(depts);
    setYearStats(years);
    setPanelStats(panels);
  };

  const handleExportAll = () => {
    exportAllTeamsToExcel(teams, 'SIH_2026_Verified_Unique_Registered_Teams.xlsx');
  };

  const twoProblemStatementTeams = teams.filter(t => t.selected_problem_statements.length >= 2);

  const filteredDeptTeams = deptFilter === 'All'
    ? teams
    : teams.filter(t => {
        const lead = t.members.find(m => m.is_lead) || t.members[0];
        const dept = (t.department || (lead ? lead.department : '') || '').toUpperCase();
        return dept.includes(deptFilter);
      });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* Top Banner Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="text-xs font-bold text-brand-700 uppercase tracking-wider mb-1">Central Hackathon Controller</div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Admin Control Center</h1>
          <p className="text-xs text-slate-500 mt-1">
            Realtime verified unique team count, department & academic year analytics, problem statement distribution, and panel monitoring.
          </p>
        </div>

        <button
          onClick={handleExportAll}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-5 py-3 rounded-xl shadow transition-all hover:scale-105 flex items-center gap-2 cursor-pointer"
        >
          <Download className="w-4 h-4" /> Export All Registered Teams (.xlsx)
        </button>
      </div>

      {/* 6 Core Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
          <Users className="w-6 h-6 text-brand-600 mx-auto mb-2" />
          <div className="text-2xl font-extrabold text-slate-900">{stats.totalTeams}</div>
          <div className="text-[11px] font-extrabold text-slate-700 mt-0.5">Total Unique Teams</div>
          <div className="text-[10px] text-emerald-600 font-bold mt-0.5">Deduplicated & Verified</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
          <Layers className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
          <div className="text-2xl font-extrabold text-indigo-900">{stats.totalDistinctPS}</div>
          <div className="text-[11px] font-extrabold text-slate-700 mt-0.5">Distinct PS Count</div>
          <div className="text-[10px] text-indigo-600 font-bold mt-0.5">Unique Problem IDs</div>
        </div>

        <button
          onClick={() => setIsTwoPSModalOpen(true)}
          className="bg-white p-5 rounded-2xl border border-purple-200 hover:border-purple-400 shadow-sm text-center transition-all cursor-pointer group hover:bg-purple-50/20"
        >
          <Layers className="w-6 h-6 text-purple-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <div className="text-2xl font-extrabold text-purple-900">{stats.teamsWithTwoPS}</div>
          <div className="text-[11px] font-extrabold text-purple-800 mt-0.5">Teams With 2 PS ↗</div>
          <div className="text-[10px] text-purple-600 font-bold mt-0.5">Click to View List</div>
        </button>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
          <Users className="w-6 h-6 text-cyan-600 mx-auto mb-2" />
          <div className="text-2xl font-extrabold text-slate-900">{stats.totalParticipants}</div>
          <div className="text-[11px] font-extrabold text-slate-700 mt-0.5">Total Students</div>
          <div className="text-[10px] text-slate-500 font-bold mt-0.5">Leads + Members</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
          <FileText className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
          <div className="text-2xl font-extrabold text-slate-900">{stats.pptsUploaded}</div>
          <div className="text-[11px] font-extrabold text-slate-700 mt-0.5">Slides / PPTs Uploaded</div>
          <div className="text-[10px] text-emerald-600 font-bold mt-0.5">Ready for Jury</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm text-center bg-gradient-to-b from-amber-50 to-white">
          <Trophy className="w-6 h-6 text-amber-600 mx-auto mb-2" />
          <div className="text-2xl font-extrabold text-amber-900">{stats.top50Selected}</div>
          <div className="text-[11px] font-extrabold text-amber-800 mt-0.5">Top 50 Selected</div>
          <div className="text-[10px] text-amber-600 font-bold mt-0.5">Finalist Roster</div>
        </div>

      </div>

      {/* Analytics Grid: Department & Academic Year Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Department Analytics */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-brand-600" /> Department Distribution
            </h2>
            <span className="text-xs font-extrabold text-brand-700 bg-brand-50 border border-brand-100 px-3 py-1 rounded-lg">
              {stats.totalTeams} Teams
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { name: 'CSE', count: deptStats['CSE'] || 0, color: 'bg-brand-50 border-brand-200 text-brand-900' },
              { name: 'ECE', count: deptStats['ECE'] || 0, color: 'bg-violet-50 border-violet-200 text-violet-900' },
              { name: 'EEE', count: deptStats['EEE'] || 0, color: 'bg-cyan-50 border-cyan-200 text-cyan-900' },
              { name: 'CHEM', count: deptStats['CHEM'] || 0, color: 'bg-amber-50 border-amber-200 text-amber-900' },
              { name: 'MME', count: deptStats['MME'] || 0, color: 'bg-emerald-50 border-emerald-200 text-emerald-900' },
              { name: 'CIVIL', count: deptStats['CIVIL'] || 0, color: 'bg-rose-50 border-rose-200 text-rose-900' },
              { name: 'MECH', count: deptStats['MECH'] || 0, color: 'bg-indigo-50 border-indigo-200 text-indigo-900' },
              { name: 'Other', count: deptStats['Other'] || 0, color: 'bg-slate-50 border-slate-200 text-slate-800' }
            ].map((d) => (
              <div key={d.name} className={`p-3.5 rounded-xl border ${d.color} text-center space-y-1`}>
                <div className="text-xs font-extrabold uppercase">{d.name}</div>
                <div className="text-xl font-extrabold">{d.count}</div>
                <div className="text-[10px] font-bold opacity-75">
                  {stats.totalTeams > 0 ? `${Math.round((d.count / stats.totalTeams) * 100)}%` : '0%'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Academic Year Analytics */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-indigo-600" /> Academic Year Breakdown
            </h2>
            <span className="text-xs font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-lg">
              E1 to E4 Batches
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { name: 'E1 (1st Yr)', count: yearStats['E1'] || 0, color: 'bg-emerald-50 border-emerald-200 text-emerald-900' },
              { name: 'E2 (2nd Yr)', count: yearStats['E2'] || 0, color: 'bg-indigo-50 border-indigo-200 text-indigo-900' },
              { name: 'E3 (3rd Yr)', count: yearStats['E3'] || 0, color: 'bg-purple-50 border-purple-200 text-purple-900' },
              { name: 'E4 (4th Yr)', count: yearStats['E4'] || 0, color: 'bg-amber-50 border-amber-200 text-amber-900' },
            ].map((y) => (
              <div key={y.name} className={`p-3.5 rounded-xl border ${y.color} text-center space-y-1`}>
                <div className="text-xs font-extrabold">{y.name}</div>
                <div className="text-2xl font-extrabold">{y.count}</div>
                <div className="text-[10px] font-bold opacity-75">
                  {stats.totalTeams > 0 ? `${Math.round((y.count / stats.totalTeams) * 100)}%` : '0%'}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Teams with Same Problem Statement Analytics Section */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" /> Teams with Same Problem Statement
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Breakdown of how many deduplicated teams have selected each problem statement (dual-PS teams counted under both statements).
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Problem Statement..."
              value={psSearchQuery}
              onChange={(e) => setPsSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-100/90 backdrop-blur text-slate-700 font-bold uppercase tracking-wider">
                <tr className="border-b border-slate-200">
                  <th className="py-3 px-4">Problem ID</th>
                  <th className="py-3 px-4">Problem Title & Domain</th>
                  <th className="py-3 px-4 text-center">Category</th>
                  <th className="py-3 px-4 text-center">Total Teams</th>
                  <th className="py-3 px-4 text-right">Distribution Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 font-semibold">
                {psDistribution.filter(ps => {
                  const q = psSearchQuery.toLowerCase();
                  return ps.problem_id.toLowerCase().includes(q) || ps.title.toLowerCase().includes(q) || ps.domain.toLowerCase().includes(q);
                }).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400 font-medium">
                      No matching problem statements found.
                    </td>
                  </tr>
                ) : (
                  psDistribution
                    .filter(ps => {
                      const q = psSearchQuery.toLowerCase();
                      return ps.problem_id.toLowerCase().includes(q) || ps.title.toLowerCase().includes(q) || ps.domain.toLowerCase().includes(q);
                    })
                    .map((ps) => {
                      const isMultipleTeams = ps.teamCount > 1;
                      return (
                        <tr key={ps.problem_id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 font-extrabold text-brand-700 whitespace-nowrap">
                            {ps.problem_id}
                          </td>
                          <td className="py-3 px-4 max-w-md">
                            <div className="font-bold text-slate-900 line-clamp-1">{ps.title}</div>
                            <div className="text-[10px] text-slate-400 font-medium">{ps.domain}</div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              ps.category === 'Software' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {ps.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex items-center justify-center min-w-[28px] px-2 py-1 rounded-lg text-xs font-black ${
                              isMultipleTeams ? 'bg-purple-100 text-purple-900 border border-purple-300' : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {ps.teamCount} {ps.teamCount === 1 ? 'Team' : 'Teams'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isMultipleTeams ? (
                              <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                                ⚡ Multiple Teams ({ps.teamCount})
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                                Single Team
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center mb-4">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Teams Roster & PPT Mapping</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              View full list of registered teams, verify uploaded presentation files, edit team rosters, and execute safe admin actions.
            </p>
          </div>
          <Link
            href="/admin/teams"
            className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
          >
            Manage Teams Roster <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-4">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Presentation Timer & Control</h3>
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

      {/* Modal: Teams With 2 Problem Statements */}
      {isTwoPSModalOpen && (
        <Modal
          isOpen={isTwoPSModalOpen}
          onClose={() => setIsTwoPSModalOpen(false)}
          title={`Valid Teams With 2 Selected Problem Statements (${twoProblemStatementTeams.length})`}
          maxWidth="2xl"
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <p className="text-xs text-slate-500">
              The following verified unique teams have selected two problem statements for SIH 2026:
            </p>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-purple-50 text-purple-900 font-bold border-b border-purple-200">
                    <th className="py-3 px-3">Team Details</th>
                    <th className="py-3 px-3">Contact Details</th>
                    <th className="py-3 px-3">Problem Statement 1</th>
                    <th className="py-3 px-3">Problem Statement 2</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {twoProblemStatementTeams.map((t) => {
                    const lead = t.members.find(m => m.is_lead) || t.members[0];
                    const ps1 = t.selected_problem_statements[0];
                    const ps2 = t.selected_problem_statements[1];

                    return (
                      <tr key={t.team_id} className="hover:bg-slate-50">
                        <td className="py-3 px-3 space-y-0.5">
                          <div className="font-extrabold text-purple-700">{t.team_id}</div>
                          <div className="font-bold text-slate-900">{t.team_name}</div>
                          <div className="text-[10px] text-slate-500">
                            {lead ? lead.department : t.department} • {lead ? lead.year : t.year}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-medium">
                          <div className="font-bold text-slate-900">{t.team_lead_name || (lead ? lead.name : '-')}</div>
                          <div className="text-[10px] text-slate-500">{t.team_lead_email || (lead ? lead.email : '-')}</div>
                          <div className="text-[10px] text-slate-500">{t.team_lead_phone || (lead ? lead.phone : '-')}</div>
                        </td>
                        <td className="py-3 px-3 max-w-xs">
                          <span className="font-extrabold text-brand-700">{ps1 ? ps1.problem_id : '-'}</span>
                          <div className="text-[10px] text-slate-600 line-clamp-2">{ps1 ? ps1.problem_title : '-'}</div>
                        </td>
                        <td className="py-3 px-3 max-w-xs">
                          <span className="font-extrabold text-purple-700">{ps2 ? ps2.problem_id : '-'}</span>
                          <div className="text-[10px] text-slate-600 line-clamp-2">{ps2 ? ps2.problem_title : '-'}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsTwoPSModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Close View
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
