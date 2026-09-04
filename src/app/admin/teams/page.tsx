'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { HackathonStateManager } from '@/lib/store/stateManager';
import { Team } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { EditTeamModal } from '@/components/EditTeamModal';
import { exportAllTeamsToExcel } from '@/lib/export/exportUtils';
import { Modal } from '@/components/ui/Modal';
import { 
  Search, 
  Filter, 
  Eye, 
  Users, 
  FileText, 
  CheckCircle2, 
  Layers, 
  Download, 
  Edit3, 
  Trash2, 
  AlertTriangle 
} from 'lucide-react';

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [pptFilter, setPptFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [psCountFilter, setPsCountFilter] = useState<string>('All');

  // Edit / Delete Modal state
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [deletingTeamId, setDeletingTeamId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string>('');

  useEffect(() => {
    loadTeams();
    const handleUpdate = () => loadTeams();
    window.addEventListener('sih_teams_updated', handleUpdate);
    return () => window.removeEventListener('sih_teams_updated', handleUpdate);
  }, []);

  const loadTeams = () => {
    setTeams(HackathonStateManager.getTeams());
  };

  const handleDeleteConfirm = () => {
    if (!deletingTeamId) return;
    HackathonStateManager.deleteTeam(deletingTeamId);
    setActionSuccess(`Team "${deletingTeamId}" was safely removed from the system.`);
    setDeletingTeamId(null);
    setTimeout(() => setActionSuccess(''), 5000);
  };

  const handleExport = () => {
    exportAllTeamsToExcel(teams, 'SIH_2026_Registered_Teams_Verified_Unique.xlsx');
  };

  const filteredTeams = teams.filter(team => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      team.team_id.toLowerCase().includes(query) ||
      team.team_name.toLowerCase().includes(query) ||
      team.team_lead_name.toLowerCase().includes(query);
    
    const hasSlides = !!team.google_slides_url || !!team.ppt_submission;
    const matchesPpt = 
      pptFilter === 'All' ||
      (pptFilter === 'Uploaded' && hasSlides) ||
      (pptFilter === 'Pending' && !hasSlides);

    const matchesStatus = statusFilter === 'All' || team.registration_status === statusFilter;

    const psCount = team.selected_problem_statements.length;
    const matchesPsCount = 
      psCountFilter === 'All' ||
      (psCountFilter === '2PS' && psCount >= 2) ||
      (psCountFilter === '1PS' && psCount === 1);

    return matchesSearch && matchesPpt && matchesStatus && matchesPsCount;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Registered Teams Directory</h1>
          <p className="text-xs text-slate-500 mt-1">
            Verified unique team roster. Admin can edit, update, delete with confirmation, and export full data.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow transition-all flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" /> Export All Teams (.xlsx)
          </button>
          <div className="text-xs font-extrabold bg-amber-50 text-amber-800 px-3.5 py-2.5 rounded-xl border border-amber-200">
            Total Unique Teams: {teams.length}
          </div>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {actionSuccess}
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Team ID, Name, or Lead..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-semibold">Problem Statements:</span>
            <select
              value={psCountFilter}
              onChange={(e) => setPsCountFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
            >
              <option value="All">All PS Counts</option>
              <option value="2PS">2 Problem Statements ({teams.filter(t => t.selected_problem_statements.length >= 2).length})</option>
              <option value="1PS">1 Problem Statement</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-semibold">PPT Status:</span>
            <select
              value={pptFilter}
              onChange={(e) => setPptFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
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
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
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
                  <th className="py-3.5 px-4">Team Name & Lead</th>
                  <th className="py-3.5 px-4">Dept / Year</th>
                  <th className="py-3.5 px-4 text-center">Members</th>
                  <th className="py-3.5 px-4">Problem Statement(s)</th>
                  <th className="py-3.5 px-4">Presentation Link</th>
                  <th className="py-3.5 px-4 text-center">Panel</th>
                  <th className="py-3.5 px-4 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredTeams.map((team) => {
                  const lead = team.members.find(m => m.is_lead) || team.members[0];
                  const primaryPS = team.selected_problem_statements[0];
                  const secondaryPS = team.selected_problem_statements[1];

                  return (
                    <tr key={team.team_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-extrabold text-brand-700 break-all">{team.team_id}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div>{team.team_name}</div>
                        <div className="text-[11px] font-medium text-slate-500 mt-0.5">
                          Lead: {team.team_lead_name || (lead ? lead.name : '-')} ({team.team_lead_email || (lead ? lead.email : '-')})
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        {team.department || (lead ? lead.department : '-')}
                        <div className="text-[10px] text-slate-400">{team.year || (lead ? lead.year : '-')}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold">{team.members.length}</td>
                      <td className="py-3.5 px-4 max-w-xs space-y-1">
                        {primaryPS && (
                          <div className="truncate">
                            <span className="font-extrabold text-brand-700">#1 {primaryPS.problem_id}</span>
                            <span className="text-[10px] text-slate-500 ml-1 truncate">{primaryPS.problem_title}</span>
                          </div>
                        )}
                        {secondaryPS && (
                          <div className="truncate">
                            <span className="font-extrabold text-purple-700">#2 {secondaryPS.problem_id}</span>
                            <span className="text-[10px] text-purple-600 ml-1 truncate">{secondaryPS.problem_title}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {team.google_slides_url ? (
                          <button
                            onClick={() => window.open(team.google_slides_url || '', '_blank')}
                            className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 font-extrabold rounded-lg hover:bg-indigo-100 transition-all cursor-pointer text-[10px] inline-flex items-center gap-0.5"
                          >
                            Open Slides ↗
                          </button>
                        ) : team.ppt_submission?.file_url ? (
                          <button
                            onClick={() => window.open(team.ppt_submission?.file_url || '', '_blank')}
                            className="px-2.5 py-1 bg-slate-150 border border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-all cursor-pointer text-[10px] inline-flex items-center gap-0.5"
                          >
                            Open Backup PPT ↗
                          </button>
                        ) : (
                          <Badge variant="yellow">🟡 Pending</Badge>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                        {team.panel || 'Panel 1'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setEditingTeam(team)}
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors cursor-pointer"
                            title="Edit Team Registration"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingTeamId(team.team_id)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition-colors cursor-pointer"
                            title="Delete Team"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <Link
                            href={`/admin/teams/${team.team_id}`}
                            className="p-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg transition-colors cursor-pointer"
                            title="View Full Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Registration Modal */}
      {editingTeam && (
        <EditTeamModal
          team={editingTeam}
          isOpen={!!editingTeam}
          onClose={() => setEditingTeam(null)}
          currentUserEmail={editingTeam.team_lead_email}
          onSuccess={(updatedTeam) => {
            setEditingTeam(null);
            loadTeams();
            setActionSuccess(`Team "${updatedTeam.team_id}" registration updated successfully!`);
            setTimeout(() => setActionSuccess(''), 5000);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingTeamId && (
        <Modal
          isOpen={!!deletingTeamId}
          onClose={() => setDeletingTeamId(null)}
          title="Confirm Team Deletion (Admin Access)"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs space-y-2">
              <div className="font-extrabold flex items-center gap-1.5 text-sm text-rose-900">
                <AlertTriangle className="w-4 h-4 text-rose-600" /> Permanent Delete Confirmation
              </div>
              <p>
                Are you sure you want to permanently delete team <span className="font-extrabold font-mono">{deletingTeamId}</span>?
              </p>
              <p className="text-[11px] text-rose-700 font-medium">
                This action will delete the team record, member rosters, presentation links, and evaluation logs from Supabase. This operation cannot be undone.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setDeletingTeamId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl shadow transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" /> Yes, Delete Team
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
