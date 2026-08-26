'use client';

import React, { useState, useEffect } from 'react';
import { HackathonStateManager } from '@/lib/store/stateManager';
import { AuditLog } from '@/lib/types';
import { FileSpreadsheet, Shield, Search, RefreshCw } from 'lucide-react';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setLogs(HackathonStateManager.getAuditLogs());

    const handleUpdate = () => setLogs(HackathonStateManager.getAuditLogs());
    window.addEventListener('sih_audit_updated', handleUpdate);
    return () => window.removeEventListener('sih_audit_updated', handleUpdate);
  }, []);

  const filteredLogs = logs.filter(log =>
    log.team_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.admin_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.reason.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-amber-600" /> Admin Audit Logs
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Immutable audit record of all manual result overrides, status modifications, and admin interventions.
          </p>
        </div>

        <button
          onClick={() => setLogs(HackathonStateManager.getAuditLogs())}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5"
        >
          <RefreshCw className="w-4 h-4" /> Refresh Audit Trail
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search audit logs by Admin, Team ID, Action, or Override Reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Admin Name</th>
                <th className="py-3.5 px-4">Team ID</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Status Transition</th>
                <th className="py-3.5 px-4">Override Justification / Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredLogs.map((log) => (
                <tr key={log.log_id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">{log.admin_name}</td>
                  <td className="py-3.5 px-4 font-extrabold text-brand-700">{log.team_id}</td>
                  <td className="py-3.5 px-4 font-semibold text-indigo-700">{log.action}</td>
                  <td className="py-3.5 px-4 text-[11px]">
                    <span className="text-slate-500">{log.previous_value}</span>
                    <span className="mx-1 text-slate-400">→</span>
                    <span className="font-bold text-slate-900">{log.new_value}</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 italic max-w-xs truncate">
                    "{log.reason}"
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
