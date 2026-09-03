'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Team } from '@/lib/types';
import { HackathonStateManager } from '@/lib/store/stateManager';
import { ShieldAlert, AlertTriangle, Trash2, Loader2 } from 'lucide-react';

interface AdminDeleteTeamModalProps {
  team: Team;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (teamId: string) => void;
  adminEmail?: string;
}

export function AdminDeleteTeamModal({
  team,
  isOpen,
  onClose,
  onSuccess,
  adminEmail
}: AdminDeleteTeamModalProps) {
  const [reason, setReason] = useState('Disqualified by Administrator');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleConfirmDelete = async () => {
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/admin/team/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: team.team_id,
          reason: reason.trim() || 'Disqualified by Administrator',
          adminEmail: adminEmail || 'admin@rguktn.ac.in'
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to remove team.');
      }

      // Update state manager locally
      HackathonStateManager.disqualifyTeam(team.team_id);

      if (onSuccess) {
        onSuccess(team.team_id);
      }

      onClose();
      alert(`Team "${team.team_name}" (${team.team_id}) was successfully removed/disqualified.`);
    } catch (err: any) {
      console.error('Delete team error:', err);
      setErrorMsg(err.message || 'Failed to complete team removal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Team Removal"
      maxWidth="lg"
    >
      <div className="space-y-5">
        
        {/* Warning Banner */}
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3">
          <ShieldAlert className="w-6 h-6 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-rose-950 leading-relaxed font-medium">
            <strong className="font-extrabold block text-rose-900 mb-0.5">
              Warning: Safe Team Disqualification
            </strong>
            Are you sure you want to permanently remove/disqualify this team? The team status will be marked as disqualified and hidden from active rosters while preserving all audit history.
          </div>
        </div>

        {/* Team Details Summary Card */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Team ID</span>
            <span className="font-extrabold text-slate-900">{team.team_id}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Team Name</span>
            <span className="font-bold text-slate-900">{team.team_name}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Team Lead</span>
            <span className="font-bold text-slate-800">{team.team_lead_name} ({team.team_lead_email})</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Total Members</span>
            <span className="font-bold text-slate-900">{team.members?.length || 6} Students</span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {errorMsg}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Removal (Audit Log) *</label>
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Specify reason for team disqualification or removal..."
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-end gap-2.5 pt-4 border-t border-slate-100">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel / Keep Team
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleConfirmDelete}
            className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Disqualifying Team...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" /> Confirm Removal
              </>
            )}
          </button>
        </div>

      </div>
    </Modal>
  );
}
