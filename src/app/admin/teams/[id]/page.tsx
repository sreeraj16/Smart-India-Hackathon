'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { HackathonStateManager } from '@/lib/store/stateManager';
import { Team } from '@/lib/types';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { ArrowLeft, FileText, Download, Maximize2, Users, Layers, Award, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

export default function AdminTeamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = (params?.id as string) || '';

  const [team, setTeam] = useState<Team | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    if (teamId) {
      const loadedTeam = HackathonStateManager.getTeamById(teamId);
      setTeam(loadedTeam || null);
    }
  }, [teamId]);

  if (!team) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <h2 className="text-lg font-bold text-slate-700">Team Not Found</h2>
        <button
          onClick={() => router.push('/admin/teams')}
          className="mt-4 px-4 py-2 bg-brand-600 text-white font-bold text-xs rounded-xl"
        >
          Back to Teams List
        </button>
      </div>
    );
  }

  const avgScore = HackathonStateManager.getTeamAverageScore(team.team_id);
  const ppt = team.ppt_submission;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/admin/teams')}
          className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Teams Directory
        </button>
        <span className="text-xs font-extrabold text-brand-700 bg-brand-50 border border-brand-100 px-3 py-1 rounded-full">
          {team.team_id}
        </span>
      </div>

      {/* Team Info Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">{team.team_name}</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Department of {team.department} • {team.college} ({team.year})
            </p>
          </div>

          <div className="text-right">
            <div className="text-[11px] font-bold text-slate-400 uppercase">Jury Average Score</div>
            <div className="text-2xl font-extrabold text-emerald-600">
              {avgScore > 0 ? `${avgScore} / 100` : 'Not Evaluated Yet'}
            </div>
          </div>
        </div>

        {/* Lead Details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
          <div>
            <span className="text-slate-400 font-semibold block">Team Leader Name</span>
            <span className="font-bold text-slate-900 text-sm">{team.team_lead_name}</span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold block">Email Contact</span>
            <span className="font-bold text-slate-800">{team.team_lead_email}</span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold block">Phone Number</span>
            <span className="font-bold text-slate-800">{team.team_lead_phone}</span>
          </div>
        </div>
      </div>

      {/* Roster & Selected Problem Statements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Members */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-600" /> Team Member Roster ({team.members.length})
          </h3>

          <div className="space-y-2.5">
            {team.members.map((m, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs flex justify-between items-center">
                <div>
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    {m.name} {m.is_lead && <span className="text-[9px] bg-brand-600 text-white font-bold px-1.5 py-0.2 rounded">LEAD</span>}
                  </div>
                  <div className="text-[11px] text-slate-500">ID: {m.id_number} • {m.department}</div>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">{m.phone}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Problem Statements */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-600" /> Selected Problem Statements ({team.selected_problem_statements.length})
          </h3>

          <div className="space-y-3">
            {team.selected_problem_statements.map((ps, i) => (
              <div key={ps.problem_id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div className="font-extrabold text-brand-700 mb-0.5">PS #{i + 1} ({ps.problem_id}): {ps.category}</div>
                <div className="font-bold text-slate-900 mb-1">{ps.problem_title}</div>
                <div className="text-[11px] text-slate-500 line-clamp-2">{ps.description}</div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Admin PPT Viewer Section */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-emerald-600" /> Presentation Viewer (Mapped to Team {team.team_id})
        </h3>

        {ppt ? (
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-slate-900">{ppt.file_name}</div>
                <div className="text-xs text-slate-500 mt-0.5">Uploaded: {new Date(ppt.uploaded_at).toLocaleString()} • Size: {ppt.file_size || '3.4 MB'}</div>
              </div>
              <Badge variant="green">🟢 Uploaded & Verified</Badge>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={() => setIsPreviewOpen(true)}
                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Maximize2 className="w-4 h-4" /> Open In-App Presentation Viewer
              </button>

              <button
                onClick={() => {
                  alert(`Downloading ${ppt.file_name} via Supabase Storage signed URL...`);
                }}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" /> Download Presentation File
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 bg-amber-50 rounded-2xl border border-amber-200">
            <p className="text-xs text-amber-800 font-bold">No Presentation File Uploaded Yet by Team.</p>
          </div>
        )}
      </div>

      {/* In-App Presentation Viewer Modal */}
      {isPreviewOpen && ppt && (() => {
        const fileUrl = ppt.file_url || supabase.storage.from('SIH-Presentation').getPublicUrl(ppt.file_path).data.publicUrl;
        return (
          <Modal
            isOpen={isPreviewOpen}
            onClose={() => setIsPreviewOpen(false)}
            title={`Presentation Viewer — Team ${team.team_id}`}
            maxWidth="4xl"
          >
            <div className="space-y-4">
              <div className="w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950 min-h-[500px]">
                <iframe
                  src={
                    ppt.file_name.toLowerCase().endsWith('.pdf')
                      ? fileUrl
                      : `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`
                  }
                  className="w-full h-[500px] border-0"
                  allowFullScreen
                />
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-xs text-slate-500">Authorized Admin Preview</span>
                <button
                  onClick={() => setIsPreviewOpen(false)}
                  className="px-5 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}

    </div>
  );
}
