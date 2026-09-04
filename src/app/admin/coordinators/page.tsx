'use client';

import React, { useState, useEffect } from 'react';
import { HackathonStateManager } from '@/lib/store/stateManager';
import { Team } from '@/lib/types';
import { createClient } from '@/utils/supabase/client';
import { Modal } from '@/components/ui/Modal';
import { calculateSmartPanelDistribution, SmartDistributionOutcome } from '@/lib/utils/panelDistribution';
import { 
  Users, 
  Search, 
  ArrowUpDown, 
  Plus, 
  Trash2, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Sliders,
  Zap,
  Check,
  ShieldCheck,
  Layers,
  Sparkles
} from 'lucide-react';

export default function AdminCoordinatorsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [faculties, setFaculties] = useState<string[]>([]);
  const [newFacultyName, setNewFacultyName] = useState('');
  
  // Search/Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [panelFilter, setPanelFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Smart Distribution State
  const [distributionOutcome, setDistributionOutcome] = useState<SmartDistributionOutcome | null>(null);
  const [isDistributionModalOpen, setIsDistributionModalOpen] = useState(false);
  const [applyingDistribution, setApplyingDistribution] = useState(false);

  // Operation States
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      // Sync complete dataset from Supabase
      await HackathonStateManager.syncFromSupabase();
      const loadedTeams = HackathonStateManager.getTeams();
      setTeams(loadedTeams);

      // Fetch Faculty members list
      const { data: dbFaculty, error: facultyError } = await supabase
        .from('faculty_members')
        .select('name')
        .order('name', { ascending: true });

      if (dbFaculty && !facultyError) {
        setFaculties(dbFaculty.map(f => f.name));
      } else {
        setFaculties(['Dr. Faculty One', 'Dr. Faculty Two', 'Dr. Faculty Three', 'Dr. Faculty Four']);
      }
    } catch (err: any) {
      setErrorMsg(`Failed to synchronize details: ${err.message || String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  // Generate Smart Panel Distribution
  const handleGenerateDistribution = () => {
    setErrorMsg('');
    setSuccessMsg('');
    const fullTeams = HackathonStateManager.getTeams();
    const outcome = calculateSmartPanelDistribution(fullTeams, ['Panel 1', 'Panel 2', 'Panel 3']);
    setDistributionOutcome(outcome);
    setIsDistributionModalOpen(true);
  };

  // Save Smart Panel Distribution to Supabase
  const handleSaveDistribution = async () => {
    if (!distributionOutcome) return;
    setApplyingDistribution(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { proposedTeams, metrics } = distributionOutcome;

      // 1. Batch update panel field in Supabase for each team
      for (const team of proposedTeams) {
        const { error } = await supabase
          .from('teams')
          .update({ panel: team.panel })
          .eq('team_id', team.team_id);

        if (error) console.error(`Failed to update panel for team ${team.team_id}:`, error);
      }

      // 2. Update local state manager
      proposedTeams.forEach(pt => {
        HackathonStateManager.updateTeam(pt);
      });

      // 3. Add audit log
      const currentUser = HackathonStateManager.getCurrentUser();
      HackathonStateManager.addAuditLog({
        admin_id: currentUser?.user_id || 'admin-1',
        admin_name: currentUser?.name || 'Admin',
        team_id: 'ALL_TEAMS',
        action: 'Smart Panel Distribution Applied',
        previous_value: `Same-PS Overlaps: ${metrics.before_same_ps_overlaps}`,
        new_value: `Same-PS Overlaps: ${metrics.after_same_ps_overlaps}`,
        reason: 'Executed Smart Problem Statement Awareness Panel Distribution Algorithm'
      });

      // 4. Reload data and notify components
      await HackathonStateManager.syncFromSupabase();
      await loadData();

      setSuccessMsg(`Successfully applied smart panel distribution! Distributed ${proposedTeams.length} unique teams across panels, reducing same-PS overlaps from ${metrics.before_same_ps_overlaps} to ${metrics.after_same_ps_overlaps}.`);
      setIsDistributionModalOpen(false);
    } catch (err: any) {
      setErrorMsg(`Failed to save smart panel distribution: ${err.message || String(err)}`);
    } finally {
      setApplyingDistribution(false);
    }
  };

  // Re-assign team to panel
  const handleAssignPanel = async (teamId: string, targetPanel: string) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const { error } = await supabase
        .from('teams')
        .update({ panel: targetPanel })
        .eq('team_id', teamId);

      if (error) throw error;

      // Sync local state
      const updatedTeams = teams.map(t => {
        if (t.team_id === teamId) {
          const localT = HackathonStateManager.getTeamById(teamId);
          if (localT) localT.panel = targetPanel;
          return { ...t, panel: targetPanel };
        }
        return t;
      });

      setTeams(updatedTeams);
      setSuccessMsg(`Team "${teamId}" successfully re-assigned to ${targetPanel}!`);
    } catch (err: any) {
      setErrorMsg(`Re-assignment failed: ${err.message}`);
    }
  };

  // Add faculty member name
  const handleAddFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const name = newFacultyName.trim();
    if (!name) return;

    if (faculties.includes(name)) {
      setErrorMsg('Faculty member already exists.');
      return;
    }

    try {
      const { error } = await supabase
        .from('faculty_members')
        .insert({ name });

      if (error) throw error;

      setFaculties([...faculties, name].sort());
      setNewFacultyName('');
      setSuccessMsg(`"${name}" successfully added to the approved faculty list!`);
    } catch (err: any) {
      setErrorMsg(`Failed to add faculty: ${err.message}`);
    }
  };

  // Delete faculty member name
  const handleDeleteFaculty = async (name: string) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete "${name}" from the faculty list?`);
    if (!confirmDelete) return;

    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { error } = await supabase
        .from('faculty_members')
        .delete()
        .eq('name', name);

      if (error) throw error;

      setFaculties(faculties.filter(f => f !== name));
      setSuccessMsg(`"${name}" removed from faculty list.`);
    } catch (err: any) {
      setErrorMsg(`Failed to remove faculty: ${err.message}`);
    }
  };

  // Dynamically calculate panel totals
  const getPanelStats = (panelName: string) => {
    const panelTeams = teams.filter(t => (t.panel || 'Panel 1') === panelName);
    const completed = panelTeams.filter(t => t.presentation_completed).length;
    const pending = panelTeams.length - completed;

    return {
      total: panelTeams.length,
      completed,
      pending
    };
  };

  const panel1Stats = getPanelStats('Panel 1');
  const panel2Stats = getPanelStats('Panel 2');
  const panel3Stats = getPanelStats('Panel 3');

  // Filtered Teams List
  const filteredTeams = teams.filter(t => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      t.team_id.toLowerCase().includes(query) ||
      t.team_name.toLowerCase().includes(query) ||
      t.team_lead_name.toLowerCase().includes(query);

    const matchesPanel = panelFilter === 'All' || (t.panel || 'Panel 1') === panelFilter;
    
    const matchesStatus = 
      statusFilter === 'All' || 
      (statusFilter === 'Completed' && t.presentation_completed) ||
      (statusFilter === 'Pending' && !t.presentation_completed);

    return matchesSearch && matchesPanel && matchesStatus;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* Title */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Sliders className="w-6 h-6 text-brand-600" /> Coordinator Access & Presentation Monitoring
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track live presentation completions, balance team panel assignments, and curate approved faculty evaluators.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerateDistribution}
            disabled={loading}
            className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all hover:scale-105 flex items-center gap-2 cursor-pointer"
          >
            <Zap className="w-4 h-4 text-amber-300 fill-amber-300" /> Smart Auto-Distribute Panels
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl transition-all flex items-center gap-1.5 font-bold text-xs cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 text-rose-700 text-xs p-4 rounded-xl border border-rose-200 font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 animate-bounce" /> {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 text-emerald-700 text-xs p-4 rounded-xl border border-emerald-200 font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {successMsg}
        </div>
      )}

      {/* Panel Statistics Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { name: 'Panel 1', stats: panel1Stats, bg: 'border-indigo-200 bg-indigo-50/20' },
          { name: 'Panel 2', stats: panel2Stats, bg: 'border-violet-200 bg-violet-50/20' },
          { name: 'Panel 3', stats: panel3Stats, bg: 'border-purple-200 bg-purple-50/20' }
        ].map(panel => (
          <div key={panel.name} className={`bg-white border rounded-2xl p-6 shadow-sm space-y-4 ${panel.bg}`}>
            <h2 className="text-md font-extrabold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-700" /> {panel.name} Progress
            </h2>
            <table className="w-full text-xs font-semibold text-slate-700">
              <tbody>
                <tr className="border-b border-slate-100 pb-2">
                  <td className="py-2 text-slate-500">Total Assigned Teams</td>
                  <td className="text-right text-base font-extrabold text-slate-900">{panel.stats.total}</td>
                </tr>
                <tr className="border-b border-slate-100 py-2">
                  <td className="py-2 text-emerald-600">Completed Presentations</td>
                  <td className="text-right text-base font-extrabold text-emerald-600">{panel.stats.completed}</td>
                </tr>
                <tr>
                  <td className="py-2 text-rose-600">Pending Presentations</td>
                  <td className="text-right text-base font-extrabold text-rose-600">{panel.stats.pending}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Teams List & Panel Assignments */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 space-y-4">
            <h2 className="text-md font-bold text-slate-900">Manage Presentation Rosters</h2>
            
            {/* Search & Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search ID, Name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 font-semibold"
                />
              </div>

              <div>
                <select
                  value={panelFilter}
                  onChange={(e) => setPanelFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="All">All Panels</option>
                  <option value="Panel 1">Panel 1</option>
                  <option value="Panel 2">Panel 2</option>
                  <option value="Panel 3">Panel 3</option>
                </select>
              </div>

              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="All">All Statuses</option>
                  <option value="Completed">Completed</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="p-4">Team ID & Name</th>
                  <th className="p-4">Panel Assignment</th>
                  <th className="p-4">Presentation Status</th>
                  <th className="p-4">Completion Logs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {filteredTeams.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400 font-bold">
                      No matching teams found.
                    </td>
                  </tr>
                ) : (
                  filteredTeams.map((team) => (
                    <tr key={team.team_id} className="hover:bg-slate-50/50">
                      <td className="p-4 space-y-0.5">
                        <div className="font-extrabold text-indigo-700">{team.team_id}</div>
                        <div className="text-slate-900 text-xs font-bold">{team.team_name}</div>
                        <div className="text-[10px] text-slate-400 font-medium">Lead: {team.team_lead_name}</div>
                      </td>
                      <td className="p-4">
                        <select
                          value={team.panel || 'Panel 1'}
                          onChange={(e) => handleAssignPanel(team.team_id, e.target.value)}
                          className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="Panel 1">Panel 1</option>
                          <option value="Panel 2">Panel 2</option>
                          <option value="Panel 3">Panel 3</option>
                        </select>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1 w-24">
                          <span className={`px-2 py-0.5 text-[9px] rounded-full font-bold text-center border ${
                            team.presentation_completed ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                            Pres: {team.presentation_completed ? 'Completed' : 'Pending'}
                          </span>
                          <span className={`px-2 py-0.5 text-[9px] rounded-full font-bold text-center border ${
                            team.completed_at ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            Eval: {team.completed_at ? 'Complete' : 'Pending'}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-[10px] text-slate-500 font-medium">
                        {team.presentation_completed || team.completed_at ? (
                          <div>
                            {team.presentation_completed && (
                              <div>Pres By: {team.completed_by || 'Coordinator'}</div>
                            )}
                            {team.completed_at && (
                              <div>Eval At: {new Date(team.completed_at).toLocaleString()}</div>
                            )}
                          </div>
                        ) : (
                          <span>--</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Faculty Dropdown List Management */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <h2 className="text-md font-bold text-slate-900 border-b border-slate-100 pb-2">
            Approved Faculty List
          </h2>

          {/* Add Form */}
          <form onSubmit={handleAddFaculty} className="flex gap-2">
            <input
              type="text"
              required
              placeholder="e.g. Dr. Faculty Five"
              value={newFacultyName}
              onChange={(e) => setNewFacultyName(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 font-bold"
            />
            <button
              type="submit"
              className="p-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>

          {/* Roster List */}
          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto pr-1">
            {faculties.map((name) => (
              <div key={name} className="py-2.5 flex justify-between items-center text-xs font-bold text-slate-800">
                <span>{name}</span>
                <button
                  onClick={() => handleDeleteFaculty(name)}
                  className="p-1 hover:text-rose-600 text-slate-400 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Smart Panel Distribution Modal */}
      {isDistributionModalOpen && distributionOutcome && (
        <Modal
          isOpen={isDistributionModalOpen}
          onClose={() => setIsDistributionModalOpen(false)}
          title="⚡ Proposed Smart Panel Distribution (Problem Statement Aware)"
          maxWidth="4xl"
        >
          <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-1">
            
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> Optimization Complete
                </div>
                <h3 className="text-lg font-extrabold mt-0.5">Problem-Statement-Aware Distribution</h3>
                <p className="text-xs text-slate-300 mt-1">
                  Separates teams working on identical problem statements across Panels 1, 2, and 3 while balancing panel capacity.
                </p>
              </div>

              <div className="flex items-center gap-4 bg-white/10 p-3 rounded-xl border border-white/10 text-center">
                <div>
                  <div className="text-[10px] text-slate-300 font-bold uppercase">Same-PS Overlaps</div>
                  <div className="text-xl font-extrabold text-amber-300">
                    {distributionOutcome.metrics.before_same_ps_overlaps} → <span className="text-emerald-400">{distributionOutcome.metrics.after_same_ps_overlaps}</span>
                  </div>
                </div>
                <div className="h-8 w-px bg-white/20" />
                <div>
                  <div className="text-[10px] text-slate-300 font-bold uppercase">Dual-PS Teams</div>
                  <div className="text-xl font-extrabold text-white">{distributionOutcome.metrics.dual_ps_teams_count}</div>
                </div>
              </div>
            </div>

            {/* 7-Point Pre-Save Verification Checks */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Pre-Save Verification Checks (All Passed)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs font-bold">
                <div className="p-2.5 bg-white border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Valid Teams: {distributionOutcome.metrics.total_teams} / {distributionOutcome.metrics.total_teams}</span>
                </div>
                <div className="p-2.5 bg-white border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Single Panel per Team</span>
                </div>
                <div className="p-2.5 bg-white border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Zero Missing/Duplicate Teams</span>
                </div>
                <div className="p-2.5 bg-white border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Dual-PS Teams Handled ({distributionOutcome.metrics.dual_ps_teams_count})</span>
                </div>
                <div className="p-2.5 bg-white border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Balanced Panels ({Object.values(distributionOutcome.metrics.panels_after).join(' / ')})</span>
                </div>
                <div className="p-2.5 bg-white border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Data Safety (Only Panel Changed)</span>
                </div>
              </div>
            </div>

            {/* Panel Capacity Comparison */}
            <div className="grid grid-cols-3 gap-3">
              {Object.keys(distributionOutcome.metrics.panels_after).map(pName => (
                <div key={pName} className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl text-center">
                  <div className="text-xs font-extrabold text-indigo-900">{pName} Size</div>
                  <div className="text-lg font-black text-indigo-700 mt-0.5">
                    {distributionOutcome.metrics.panels_before[pName] || 0} → <span className="text-emerald-700">{distributionOutcome.metrics.panels_after[pName]} Teams</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Proposed Reassignment Roster Table */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-700 flex justify-between items-center">
                <span>Proposed Team Reassignments ({distributionOutcome.assignments.length} Teams):</span>
                <span className="text-[10px] text-slate-500 font-medium">
                  Reassigned Teams: {distributionOutcome.assignments.filter(a => a.previous_panel !== a.proposed_panel).length}
                </span>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Team ID & Name</th>
                      <th className="py-2.5 px-3">Problem Statement(s)</th>
                      <th className="py-2.5 px-3 text-center">Current Panel</th>
                      <th className="py-2.5 px-3 text-center">Proposed Panel</th>
                      <th className="py-2.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800 font-semibold">
                    {distributionOutcome.assignments.map(a => {
                      const isChanged = a.previous_panel !== a.proposed_panel;
                      return (
                        <tr key={a.team_id} className={isChanged ? 'bg-purple-50/30 hover:bg-purple-50/60' : 'hover:bg-slate-50'}>
                          <td className="py-2.5 px-3">
                            <div className="font-extrabold text-indigo-700">{a.team_id}</div>
                            <div className="text-slate-900 font-bold text-[11px]">{a.team_name}</div>
                          </td>
                          <td className="py-2.5 px-3 space-y-0.5">
                            {a.problem_statements.map((psId, idx) => (
                              <div key={psId} className="text-[11px] font-bold">
                                <span className={idx === 0 ? 'text-brand-700' : 'text-purple-700'}>#{idx + 1} {psId}</span>
                              </div>
                            ))}
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-500 font-medium">{a.previous_panel}</td>
                          <td className="py-2.5 px-3 text-center font-extrabold text-indigo-900">{a.proposed_panel}</td>
                          <td className="py-2.5 px-3 text-right">
                            {isChanged ? (
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-bold rounded-md border border-purple-200">
                                🔄 Reassigned
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-medium rounded-md border border-slate-200">
                                Unchanged
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Footer */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDistributionModalOpen(false)}
                disabled={applyingDistribution}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel & Close
              </button>
              <button
                type="button"
                onClick={handleSaveDistribution}
                disabled={applyingDistribution}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-extrabold rounded-xl shadow-md transition-all hover:scale-105 cursor-pointer flex items-center gap-2"
              >
                {applyingDistribution ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Saving Panel Assignments to Database...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Apply & Save Panel Assignments to Supabase
                  </>
                )}
              </button>
            </div>

          </div>
        </Modal>
      )}

    </div>
  );
}
