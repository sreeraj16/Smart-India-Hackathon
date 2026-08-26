'use client';

import React, { useState, useEffect } from 'react';
import { HackathonStateManager } from '@/lib/store/stateManager';
import { Team, AuditLog } from '@/lib/types';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { exportToExcel, exportToCSV, exportToPDF, FinalRankItem } from '@/lib/export/exportUtils';
import { Trophy, Shield, Download, FileSpreadsheet, Plus, Trash2, RefreshCw, CheckCircle2, Search, Edit3 } from 'lucide-react';

export default function AdminResultsPage() {
  const [rankedList, setRankedList] = useState<FinalRankItem[]>([]);
  const [selectedCount, setSelectedCount] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Override Modal state
  const [overrideModalTeam, setOverrideModalTeam] = useState<FinalRankItem | null>(null);
  const [overrideAction, setOverrideAction] = useState<boolean>(true);
  const [overrideReason, setOverrideReason] = useState<string>('');

  const loadRankings = () => {
    const teams = HackathonStateManager.getTeams();
    const overrides = HackathonStateManager.getTop50Overrides();

    // 1. Calculate Average Jury Score per team
    const items: FinalRankItem[] = teams.map(t => {
      const avgScore = HackathonStateManager.getTeamAverageScore(t.team_id);
      const ps = t.selected_problem_statements[0];

      return {
        rank: 0,
        team_id: t.team_id,
        team_name: t.team_name,
        problem_id: ps?.problem_id || 'SIH1501',
        problem_title: ps?.problem_title || 'General',
        category: ps?.category || 'Software',
        score: avgScore,
        selected: false,
        override: false,
        override_reason: ''
      };
    });

    // 2. Sort by score descending
    items.sort((a, b) => b.score - a.score);

    // 3. Assign initial ranks and check overrides
    let count = 0;
    items.forEach((item, index) => {
      item.rank = index + 1;
      const ov = overrides[item.team_id];

      if (ov !== undefined) {
        item.selected = ov.selected;
        item.override = true;
        item.override_reason = ov.reason;
      } else {
        item.selected = index < 50; // default top 50
      }

      if (item.selected) count++;
    });

    setRankedList(items);
    setSelectedCount(count);
  };

  useEffect(() => {
    loadRankings();

    const handleUpdate = () => loadRankings();
    window.addEventListener('sih_results_updated', handleUpdate);
    window.addEventListener('sih_evaluations_updated', handleUpdate);
    return () => {
      window.removeEventListener('sih_results_updated', handleUpdate);
      window.removeEventListener('sih_evaluations_updated', handleUpdate);
    };
  }, []);

  const handleOpenOverrideModal = (item: FinalRankItem, targetStatus: boolean) => {
    setOverrideModalTeam(item);
    setOverrideAction(targetStatus);
    setOverrideReason('');
  };

  const handleConfirmOverride = () => {
    if (!overrideModalTeam) return;
    if (!overrideReason.trim()) {
      alert('Mandatory requirement: Please enter an override justification reason for audit logging.');
      return;
    }

    HackathonStateManager.setTop50Override(
      overrideModalTeam.team_id,
      overrideAction,
      overrideReason,
      'Admin Coordinator'
    );

    setOverrideModalTeam(null);
    loadRankings();
  };

  const filteredList = rankedList.filter(item =>
    item.team_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.team_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.problem_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">Strict Admin-Only Portal</div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-2">
            <Trophy className="w-7 h-7 text-amber-500" /> Results & Top 50 Final Selection
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Official aggregated score standings with manual admin override authority, audit logging, and export tools.
          </p>
        </div>

        {/* Top 50 Completion Tracker Panel (§30) */}
        <div className="bg-gradient-to-r from-slate-900 to-rose-950 text-white p-4 rounded-2xl border border-slate-800 flex items-center gap-4 shadow-lg">
          <div>
            <div className="text-[10px] uppercase font-bold text-amber-400">Top 50 Selection Status</div>
            <div className="text-xl font-black text-white mt-0.5">
              Selected: <span className="text-amber-400">{selectedCount}</span> / 50
            </div>
          </div>

          {selectedCount === 50 ? (
            <span className="bg-emerald-500 text-white text-xs font-extrabold px-3 py-1.5 rounded-xl shadow animate-pulse">
              TOP 50 COMPLETE
            </span>
          ) : (
            <span className="bg-amber-500/20 text-amber-300 text-xs font-bold px-3 py-1 rounded-xl border border-amber-500/40">
              In Progress
            </span>
          )}
        </div>
      </div>

      {/* Export Bar (§32) */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter results by Team ID or Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportToExcel(rankedList)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" /> Export Excel (.xlsx)
          </button>

          <button
            onClick={() => exportToCSV(rankedList)}
            className="px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>

          <button
            onClick={() => exportToPDF(rankedList)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" /> Export PDF Print Report
          </button>
        </div>

      </div>

      {/* Ranked Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4 text-center">Rank</th>
                <th className="py-3.5 px-4">Team ID</th>
                <th className="py-3.5 px-4">Team Name</th>
                <th className="py-3.5 px-4">Problem Statement</th>
                <th className="py-3.5 px-4 text-center">Jury Avg Score</th>
                <th className="py-3.5 px-4 text-center">Top 50 Status</th>
                <th className="py-3.5 px-4">Override Info</th>
                <th className="py-3.5 px-4 text-right">Manual Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredList.map((item) => (
                <tr
                  key={item.team_id}
                  className={`transition-colors ${
                    item.selected ? 'bg-amber-50/40 hover:bg-amber-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <td className="py-3.5 px-4 text-center">
                    <span className={`w-7 h-7 rounded-lg inline-flex items-center justify-center font-extrabold ${
                      item.rank <= 3 ? 'bg-amber-500 text-white shadow-sm' :
                      item.rank <= 50 ? 'bg-brand-100 text-brand-800 font-bold border border-brand-200' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {item.rank}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 font-extrabold text-brand-700">{item.team_id}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">{item.team_name}</td>
                  
                  <td className="py-3.5 px-4 max-w-xs truncate">
                    <span className="font-bold text-slate-800">{item.problem_id}</span>
                    <div className="text-[10px] text-slate-500 truncate">{item.problem_title}</div>
                  </td>

                  <td className="py-3.5 px-4 text-center font-black text-sm text-slate-900">
                    {item.score > 0 ? `${item.score.toFixed(2)}` : '-'}
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    {item.selected ? (
                      <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300 font-extrabold px-3 py-1 rounded-full text-[11px]">
                        🏆 SELECTED (Top 50)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 font-semibold px-2.5 py-0.5 rounded-full text-[11px]">
                        Not Selected
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-[11px]">
                    {item.override ? (
                      <div className="text-amber-800 font-semibold truncate max-w-xs" title={item.override_reason}>
                        ⚡ Override: "{item.override_reason}"
                      </div>
                    ) : (
                      <span className="text-slate-400">Auto Rank</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    {item.selected ? (
                      <button
                        onClick={() => handleOpenOverrideModal(item, false)}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg transition-colors inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove from Top 50
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenOverrideModal(item, true)}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg transition-colors inline-flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add to Top 50
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Override Confirmation Modal (§29 & §31) */}
      {overrideModalTeam && (
        <Modal
          isOpen={!!overrideModalTeam}
          onClose={() => setOverrideModalTeam(null)}
          title={`Admin Manual Override — ${overrideModalTeam.team_id}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl">
              <div className="font-bold text-amber-900 text-sm">{overrideModalTeam.team_name} ({overrideModalTeam.team_id})</div>
              <div className="text-slate-600 mt-1">Current Score: <strong>{overrideModalTeam.score} / 100</strong></div>
              <div className="text-slate-600 mt-0.5">
                Target Action: <strong className="text-amber-900">{overrideAction ? 'Add to Top 50' : 'Remove from Top 50'}</strong>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Mandatory Override Justification / Reason *
              </label>
              <textarea
                rows={3}
                placeholder="Specify administrative reason (e.g. Exceptional technical feasibility, domain balance, or jury score re-evaluation)..."
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 font-medium"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setOverrideModalTeam(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmOverride}
                className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow cursor-pointer"
              >
                Confirm & Log Override
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
