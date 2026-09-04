'use client';

import React, { useEffect, useState } from 'react';
import { HackathonStateManager } from '@/lib/store/stateManager';
import { UserProfile, Team } from '@/lib/types';
import { Users, User, ShieldCheck, FileCheck, Layers, AlertCircle, Info, ExternalLink } from 'lucide-react';

export default function TeamMemberPage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = HackathonStateManager.getCurrentUser();
    setCurrentUser(user);

    if (user) {
      HackathonStateManager.syncFromSupabase().then(() => {
        const resolvedTeam = HackathonStateManager.getTeamForUser(user);
        setTeam(resolvedTeam || null);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const leadMember = team?.members.find(m => m.is_lead) || team?.members[0];
  const otherMembers = team?.members.filter(m => !m.is_lead) || [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white rounded-3xl p-6 sm:p-8 shadow-md border border-slate-700">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-teal-500/20 border border-teal-400/30 text-teal-300 px-3 py-1 rounded-full text-xs font-semibold mb-3">
              <Users className="w-3.5 h-3.5" /> Team Member View
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {team ? team.team_name : 'Team Roster Overview'}
            </h1>
            <p className="text-xs text-slate-300 mt-1 font-medium">
              Assigned Team ID: <strong className="text-amber-400 font-bold">{team ? team.team_id : 'Pending'}</strong>
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-2xl text-right shrink-0">
            <div className="text-[10px] uppercase font-bold text-slate-300">Registration Status</div>
            <div className="text-xs font-black text-emerald-400 uppercase mt-0.5">
              {team ? team.registration_status : 'Registered'}
            </div>
          </div>
        </div>
      </div>

      {/* Access Restrictions Notice */}
      <div className="bg-teal-50 border border-teal-200 text-teal-900 p-4 rounded-2xl text-xs font-semibold flex items-start gap-3 shadow-sm">
        <Info className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-teal-950">Role Authorization Notice:</span> You are authenticated as a <strong>Team Member</strong>. You have view permissions for your team's registration details, problem statements, and presentation status. Modifications to registration info or presentation uploads must be completed by your designated <strong>Team Lead ({team?.team_lead_name || 'Team Lead'})</strong>.
        </div>
      </div>

      {/* Team Lead Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
        <h2 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
          <User className="w-4 h-4 text-brand-600" /> Team Leader Details
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <div className="text-slate-500 font-medium">Full Name</div>
            <div className="font-bold text-slate-900 mt-0.5">{team?.team_lead_name || '—'}</div>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <div className="text-slate-500 font-medium">Institutional Email</div>
            <div className="font-bold text-slate-900 mt-0.5 truncate">{team?.team_lead_email || '—'}</div>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <div className="text-slate-500 font-medium">Mobile Number</div>
            <div className="font-bold text-slate-900 mt-0.5">{team?.team_lead_phone || '—'}</div>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <div className="text-slate-500 font-medium">Department & Year</div>
            <div className="font-bold text-slate-900 mt-0.5">{team?.department} ({team?.year})</div>
          </div>
        </div>
      </div>

      {/* Team Roster Grid */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
        <h2 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-teal-600" /> Team Roster ({team?.members?.length || 6} Members Total)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {team?.members?.map((m, idx) => (
            <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-xs">{m.name}</span>
                  {m.is_lead ? (
                    <span className="bg-brand-100 text-brand-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Team Lead
                    </span>
                  ) : (
                    <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Member #{idx}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 font-medium">
                  {m.email} | ID: {m.id_number}
                </div>
              </div>
              <div className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                {m.gender === 'F' ? 'Female (F)' : 'Male (M)'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Problem Statements */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
        <h2 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
          <Layers className="w-4 h-4 text-amber-600" /> Selected Problem Statements
        </h2>

        <div className="space-y-3">
          {team?.selected_problem_statements?.map((ps, idx) => (
            <div key={ps.problem_id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-brand-700 bg-brand-100 px-2.5 py-0.5 rounded text-[10px]">
                  PS #{idx + 1} ({ps.problem_id})
                </span>
                <span className="font-bold text-slate-800">{ps.category}</span>
              </div>
              <div className="font-bold text-slate-900 text-sm mt-1">{ps.problem_title}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Presentation Upload Status */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
        <h2 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-emerald-600" /> Presentation Deck Submission Status
        </h2>

        {team?.ppt_submission ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
            <div>
              <div className="font-bold text-emerald-900">{team.ppt_submission.file_name}</div>
              <div className="text-emerald-700 text-[11px] mt-0.5">Uploaded: {new Date(team.ppt_submission.uploaded_at).toLocaleString()}</div>
            </div>
            {team.ppt_submission.file_url && (
              <a
                href={team.ppt_submission.file_url}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1"
              >
                View PPT <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        ) : (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-semibold">
            No presentation deck uploaded yet. Your Team Lead will upload the official presentation deck before the deadline.
          </div>
        )}
      </div>

    </div>
  );
}
