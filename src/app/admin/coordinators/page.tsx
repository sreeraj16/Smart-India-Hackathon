'use client';

import React, { useState, useEffect } from 'react';
import { HackathonStateManager } from '@/lib/store/stateManager';
import { Team } from '@/lib/types';
import { createClient } from '@/utils/supabase/client';
import { 
  Users, 
  Search, 
  ArrowUpDown, 
  Plus, 
  Trash2, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Sliders
} from 'lucide-react';

export default function AdminCoordinatorsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [faculties, setFaculties] = useState<string[]>([]);
  const [newFacultyName, setNewFacultyName] = useState('');
  
  // Search/Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [panelFilter, setPanelFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

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
      // 1. Fetch teams
      const { data: dbTeams, error: teamsError } = await supabase
        .from('teams')
        .select(`
          *,
          members:team_members(*)
        `);

      let loadedTeams: Team[] = [];
      if (dbTeams && !teamsError) {
        loadedTeams = dbTeams.map((t: any) => ({
          team_id: t.team_id,
          team_name: t.team_name,
          team_lead_id: t.team_lead_id || '',
          team_lead_name: t.members?.find((m: any) => m.is_lead)?.name || 'Unknown',
          team_lead_email: t.members?.find((m: any) => m.is_lead)?.email || '',
          team_lead_phone: t.members?.find((m: any) => m.is_lead)?.phone || '',
          department: t.members?.find((m: any) => m.is_lead)?.department || 'CSE',
          year: t.members?.find((m: any) => m.is_lead)?.year || 'E3',
          college: 'RGUKT Nuzvid',
          registration_status: t.registration_status || 'registered',
          members: t.members || [],
          selected_problem_statements: [],
          panel: t.panel || 'Panel 1',
          presentation_completed: !!t.presentation_completed,
          completed_by: t.completed_by || null,
          completed_at: t.completed_at || null,
          created_at: t.created_at
        }));
        setTeams(loadedTeams);
      } else {
        // Fallback
        setTeams(HackathonStateManager.getTeams());
      }

      // 2. Fetch Faculty members list
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
        <button
          onClick={loadData}
          disabled={loading}
          className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl transition-all flex items-center gap-1.5 font-bold text-xs cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
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
                        {team.presentation_completed ? (
                          <span className="px-2 py-0.5 text-[10px] rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Completed
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] rounded-full font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-[10px] text-slate-500 font-medium">
                        {team.presentation_completed ? (
                          <div>
                            By: {team.completed_by || 'Coordinator'}<br/>
                            At: {team.completed_at ? new Date(team.completed_at).toLocaleString() : 'N/A'}
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

    </div>
  );
}
