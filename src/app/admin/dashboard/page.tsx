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
  Search,
  Eye,
  ChevronRight,
  Filter
} from 'lucide-react';

interface TeamScoreItem {
  team_id: string;
  team_name: string;
  team_lead_name: string;
  panel: string;
  evaluations_submitted: number;
  expected_evaluations: number | null;
  evaluations_display: string;
  total_score: number;
  max_possible_score: number | null;
  status: 'Completed' | 'Pending' | 'Not Evaluated';
  individual_scores: Array<{
    eval_index: number;
    evaluation_id: string;
    jury_id: string;
    jury_name: string;
    innovation_score: number;
    relevance_score: number;
    technical_score: number;
    presentation_score: number;
    qa_score: number;
    total_score: number;
    max_score: number;
    comments: string;
    submitted_at: string;
  }>;
}

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

  // --- ADMIN SCORES STATE ---
  const [teamScores, setTeamScores] = useState<TeamScoreItem[]>([]);
  const [scoreSearchQuery, setScoreSearchQuery] = useState('');
  const [scorePanelFilter, setScorePanelFilter] = useState('All');
  const [scoreStatusFilter, setScoreStatusFilter] = useState('All');
  const [selectedScoreTeam, setSelectedScoreTeam] = useState<TeamScoreItem | null>(null);
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);

  useEffect(() => {
    loadDashboardData();
    loadScoresData();
    window.addEventListener('sih_teams_updated', loadDashboardData);
    window.addEventListener('sih_evaluations_updated', loadScoresData);
    return () => {
      window.removeEventListener('sih_teams_updated', loadDashboardData);
      window.removeEventListener('sih_evaluations_updated', loadScoresData);
    };
  }, []);

  const loadScoresData = async () => {
    try {
      const res = await fetch('/api/admin/scores');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.scores)) {
          setTeamScores(json.scores);
          return;
        }
      }
    } catch (err) {
      console.warn('API score fetch failed, utilizing dynamic state manager fallback:', err);
    }

    // Dynamic Fallback calculation from local store and state manager
    const allTeams = HackathonStateManager.getTeams();
    const allEvals = HackathonStateManager.getEvaluations();

    const evalsByTeam: Record<string, typeof allEvals> = {};
    allEvals.forEach(e => {
      if (!evalsByTeam[e.team_id]) evalsByTeam[e.team_id] = [];
      evalsByTeam[e.team_id].push(e);
    });

    const fallbackScores: TeamScoreItem[] = allTeams.map(t => {
      const evs = evalsByTeam[t.team_id] || [];
      const uniqueMap = new Map();
      evs.forEach(e => uniqueMap.set(e.jury_id || e.evaluation_id, e));
      const uniqueEvals = Array.from(uniqueMap.values());

      const submittedCount = uniqueEvals.length;
      const totalScore = uniqueEvals.reduce((acc, curr) => acc + (curr.total_score || 0), 0);

      const expectedCount = null;
      const maxPossibleScore = null;
      const evaluationsDisplay = `${submittedCount} Evaluation${submittedCount === 1 ? '' : 's'}`;

      let status: 'Completed' | 'Pending' | 'Not Evaluated' = 'Not Evaluated';
      if (submittedCount === 0) status = 'Not Evaluated';
      else if (t.completed_at) status = 'Completed';
      else status = 'Pending';

      return {
        team_id: t.team_id,
        team_name: t.team_name,
        team_lead_name: t.team_lead_name || '-',
        panel: t.panel || 'Panel 1',
        evaluations_submitted: submittedCount,
        expected_evaluations: expectedCount,
        evaluations_display: evaluationsDisplay,
        total_score: totalScore,
        max_possible_score: maxPossibleScore,
        status,
        individual_scores: uniqueEvals.map((e, idx) => ({
          eval_index: idx + 1,
          evaluation_id: e.evaluation_id,
          jury_id: e.jury_id,
          jury_name: e.jury_name || `Jury ${idx + 1}`,
          innovation_score: e.innovation_score || 0,
          relevance_score: e.relevance_score || 0,
          technical_score: e.technical_score || 0,
          presentation_score: e.presentation_score || 0,
          qa_score: e.qa_score || 0,
          total_score: e.total_score || 0,
          max_score: 100,
          comments: e.comments || '',
          submitted_at: e.submitted_at || ''
        }))
      };
    });

    setTeamScores(fallbackScores);
  };

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

  // Filtered Scores for Admin Scores Table
  const filteredTeamScores = teamScores.filter(s => {
    const q = scoreSearchQuery.toLowerCase();
    const matchesSearch = 
      s.team_id.toLowerCase().includes(q) ||
      s.team_name.toLowerCase().includes(q) ||
      s.team_lead_name.toLowerCase().includes(q);

    const matchesPanel = scorePanelFilter === 'All' || s.panel === scorePanelFilter;
    const matchesStatus = scoreStatusFilter === 'All' || s.status === scoreStatusFilter;

    return matchesSearch && matchesPanel && matchesStatus;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* Top Banner Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="text-xs font-bold text-brand-700 uppercase tracking-wider mb-1">Central Hackathon Controller</div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Admin Control Center</h1>
          <p className="text-xs text-slate-500 mt-1">
            Realtime verified unique team count, jury score visibility, department & academic year analytics, problem statement distribution, and panel monitoring.
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

      {/* ========================================================================= */}
      {/* 🚀 ADMIN TEAM SCORE VISIBILITY BOARD (DYNAMIC EVALUATION COUNT) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
        
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <Award className="w-6 h-6 text-brand-600" />
              <h2 className="text-xl font-black text-slate-900">Jury Evaluation Scores & Team Visibility</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              End-to-end visibility of actual marks submitted by Jury members across all panels. View total scores, maximum possible score, and detailed individual jury score breakdowns.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-brand-50 border border-brand-100 text-brand-900 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
              <span>Teams Evaluated:</span>
              <span className="text-sm font-black text-brand-700">
                {teamScores.filter(s => s.evaluations_submitted > 0).length} / {teamScores.length}
              </span>
            </div>
          </div>
        </div>

        {/* Filters & Search Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Team ID, Team Name, or Lead..."
              value={scoreSearchQuery}
              onChange={(e) => setScoreSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 font-bold">Panel:</span>
              <select
                value={scorePanelFilter}
                onChange={(e) => setScorePanelFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700"
              >
                <option value="All">All Panels</option>
                <option value="Panel 1">Panel 1</option>
                <option value="Panel 2">Panel 2</option>
                <option value="Panel 3">Panel 3</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 font-bold">Evaluation Status:</span>
              <select
                value={scoreStatusFilter}
                onChange={(e) => setScoreStatusFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700"
              >
                <option value="All">All Statuses</option>
                <option value="Completed">Completed</option>
                <option value="Pending">Pending / In Progress</option>
                <option value="Not Evaluated">Not Evaluated</option>
              </select>
            </div>
          </div>
        </div>

        {/* Scores Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="max-h-[460px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-100 text-slate-700 font-bold uppercase tracking-wider z-10">
                <tr className="border-b border-slate-200">
                  <th className="py-3.5 px-4">Team ID</th>
                  <th className="py-3.5 px-4">Team Name & Lead</th>
                  <th className="py-3.5 px-4 text-center">Panel</th>
                  <th className="py-3.5 px-4 text-center">Jury Evaluations</th>
                  <th className="py-3.5 px-4 text-center">Total Score Obtained</th>
                  <th className="py-3.5 px-4 text-center">Evaluation Status</th>
                  <th className="py-3.5 px-4 text-right">Individual Scores</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 font-semibold">
                {filteredTeamScores.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                      No matching team evaluation scores found.
                    </td>
                  </tr>
                ) : (
                  filteredTeamScores.map((scoreItem) => (
                    <tr key={scoreItem.team_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-extrabold text-brand-700">{scoreItem.team_id}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{scoreItem.team_name}</div>
                        <div className="text-[10px] text-slate-500 font-medium">Lead: {scoreItem.team_lead_name}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold rounded-lg border border-slate-200">
                          {scoreItem.panel}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-extrabold text-slate-800">
                          {scoreItem.evaluations_display}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="font-black text-brand-700 text-sm">
                          {scoreItem.total_score}
                          {scoreItem.max_possible_score !== null && (
                            <span className="text-xs text-slate-400 font-bold"> / {scoreItem.max_possible_score}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {scoreItem.status === 'Completed' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 text-[11px] font-extrabold rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Completed
                          </span>
                        ) : scoreItem.status === 'Pending' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-800 text-[11px] font-extrabold rounded-full border border-amber-200">
                            <Clock className="w-3.5 h-3.5 text-amber-600" /> Pending ({scoreItem.evaluations_display})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-600 text-[11px] font-bold rounded-full border border-slate-200">
                            <AlertCircle className="w-3.5 h-3.5 text-slate-400" /> Not Evaluated
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedScoreTeam(scoreItem);
                            setIsScoreModalOpen(true);
                          }}
                          className="px-3.5 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 font-extrabold text-xs rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Breakdown
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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

      {/* 🚀 MODAL: INDIVIDUAL JURY SCORES BREAKDOWN */}
      {isScoreModalOpen && selectedScoreTeam && (
        <Modal
          isOpen={isScoreModalOpen}
          onClose={() => {
            setIsScoreModalOpen(false);
            setSelectedScoreTeam(null);
          }}
          title={`Jury Score Calculation Breakdown — ${selectedScoreTeam.team_name}`}
          maxWidth="2xl"
        >
          <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
            
            {/* Team Overview Card */}
            <div className="bg-slate-900 text-white p-5 rounded-2xl shadow border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-brand-300 tracking-wider">Team Information</span>
                <h3 className="text-lg font-black text-white">{selectedScoreTeam.team_name}</h3>
                <div className="text-xs text-slate-300 mt-0.5">
                  ID: <span className="font-extrabold text-brand-400">{selectedScoreTeam.team_id}</span> • Lead: {selectedScoreTeam.team_lead_name} • {selectedScoreTeam.panel}
                </div>
              </div>

              <div className="bg-slate-800 p-3.5 rounded-xl border border-slate-700 text-center min-w-[140px]">
                <div className="text-[10px] uppercase font-bold text-slate-400">Total Score Obtained</div>
                <div className="text-xl font-black text-amber-400">
                  {selectedScoreTeam.total_score}
                  {selectedScoreTeam.max_possible_score !== null && (
                    <span className="text-xs text-slate-400"> / {selectedScoreTeam.max_possible_score}</span>
                  )}
                </div>
                <div className="text-[10px] font-bold text-emerald-400 mt-0.5">
                  {selectedScoreTeam.evaluations_display} Submitted
                </div>
              </div>
            </div>

            {/* Individual Jury Scores List */}
            <div className="space-y-4">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Award className="w-4 h-4 text-brand-600" /> Individual Jury Score Cards ({selectedScoreTeam.individual_scores.length})
              </h4>

              {selectedScoreTeam.individual_scores.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs">
                  No jury evaluations submitted yet for this team.
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedScoreTeam.individual_scores.map((ev) => (
                    <div key={ev.evaluation_id || ev.jury_id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <div className="font-extrabold text-slate-900 text-xs flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-800 text-[11px] font-black flex items-center justify-center">
                            {ev.eval_index}
                          </span>
                          {ev.jury_name} <span className="text-[10px] text-slate-400 font-medium">({ev.jury_id})</span>
                        </div>
                        <div className="text-xs font-black text-brand-700 bg-brand-50 px-3 py-1 rounded-lg border border-brand-200">
                          {ev.total_score} / 100
                        </div>
                      </div>

                      {/* Criteria Score Grid */}
                      <div className="grid grid-cols-5 gap-2 text-center text-[10px]">
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <div className="text-slate-500 font-bold">Innovation</div>
                          <div className="font-black text-slate-800 text-xs mt-0.5">{ev.innovation_score} / 20</div>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <div className="text-slate-500 font-bold">Relevance</div>
                          <div className="font-black text-slate-800 text-xs mt-0.5">{ev.relevance_score} / 20</div>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <div className="text-slate-500 font-bold">Technical</div>
                          <div className="font-black text-slate-800 text-xs mt-0.5">{ev.technical_score} / 20</div>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <div className="text-slate-500 font-bold">Presentation</div>
                          <div className="font-black text-slate-800 text-xs mt-0.5">{ev.presentation_score} / 20</div>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <div className="text-slate-500 font-bold">Q&A Response</div>
                          <div className="font-black text-slate-800 text-xs mt-0.5">{ev.qa_score} / 20</div>
                        </div>
                      </div>

                      {ev.comments && (
                        <div className="text-[11px] bg-amber-50/50 p-2.5 rounded-xl border border-amber-100 text-amber-900 italic">
                          "{ev.comments}"
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Summary Total */}
                  <div className="p-4 bg-slate-100 rounded-xl border border-slate-200 flex justify-between items-center font-bold text-xs">
                    <span className="text-slate-700">Accumulated Total Score across Juries:</span>
                    <span className="text-sm font-black text-slate-900">
                      {selectedScoreTeam.total_score}
                      {selectedScoreTeam.max_possible_score !== null && (
                        <span> / {selectedScoreTeam.max_possible_score}</span>
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  setIsScoreModalOpen(false);
                  setSelectedScoreTeam(null);
                }}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer shadow transition-all"
              >
                Close Score Details
              </button>
            </div>

          </div>
        </Modal>
      )}

    </div>
  );
}
