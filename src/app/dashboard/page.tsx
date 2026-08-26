'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { HackathonStateManager } from '@/lib/store/stateManager';
import { Team, ProblemStatement } from '@/lib/types';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Users, FileCheck, Layers, Plus, User, Bot, ArrowRight, ShieldCheck, Cpu } from 'lucide-react';

export default function TeamDashboardPage() {
  const [team, setTeam] = useState<Team | null>(null);
  const [allStatements, setAllStatements] = useState<ProblemStatement[]>([]);
  const [isAddPSModalOpen, setIsAddPSModalOpen] = useState(false);
  const [selectedSecondPS, setSelectedSecondPS] = useState<ProblemStatement | null>(null);

  useEffect(() => {
    const refreshData = () => {
      const user = HackathonStateManager.getCurrentUser();
      const teamId = user?.team_id || 'SIH-2026-1001';
      setTeam(HackathonStateManager.getTeamById(teamId) || null);
      setAllStatements(HackathonStateManager.getProblemStatements());
    };

    refreshData();

    window.addEventListener('sih_teams_updated', refreshData);
    window.addEventListener('sih_auth_changed', refreshData);
    return () => {
      window.removeEventListener('sih_teams_updated', refreshData);
      window.removeEventListener('sih_auth_changed', refreshData);
    };
  }, []);

  const [customPsId, setCustomPsId] = useState('');
  const [customPsTitle, setCustomPsTitle] = useState('');
  const [customPsCategory, setCustomPsCategory] = useState<'Software' | 'Hardware'>('Software');
  const [customPsDomain, setCustomPsDomain] = useState('Smart Automation');
  const [psError, setPsError] = useState('');

  if (!team) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center py-12 px-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center border border-slate-200 shadow-sm space-y-4">
          <div className="w-14 h-14 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mx-auto">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">No Registered Team Found</h2>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              You are signed in, but no registered team is associated with your account yet. Please register your team or sign in with your team credentials.
            </p>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <Link
              href="/register"
              className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Register New Team
            </Link>
            <Link
              href="/login"
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              Sign In to Portal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const hasSecondPS = team.selected_problem_statements.length >= 2;
  const pptUploaded = !!team.ppt_submission;

  const handleAddSecondPS = () => {
    if (!customPsId.trim()) {
      setPsError('Please enter Problem Statement ID (e.g. SIH1502).');
      return;
    }
    if (!customPsTitle.trim()) {
      setPsError('Please enter Problem Statement Title / Statement.');
      return;
    }

    const newPS: ProblemStatement = {
      problem_id: customPsId.trim(),
      problem_title: customPsTitle.trim(),
      category: customPsCategory,
      domain: customPsDomain.trim() || 'General',
      description: customPsTitle.trim()
    };

    const updatedTeam = {
      ...team,
      selected_problem_statements: [...team.selected_problem_statements, newPS]
    };
    HackathonStateManager.updateTeam(updatedTeam);
    setTeam(updatedTeam);
    setIsAddPSModalOpen(false);
    setCustomPsId('');
    setCustomPsTitle('');
    setPsError('');
  };

  return (
    <div className="space-y-8">
      
      {/* Top Banner Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="text-xs font-bold text-brand-700 uppercase tracking-wider mb-1">Student Team Portal</div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{team.team_name}</h1>
          <p className="text-xs text-slate-500 mt-1">
            Department of {team.department} • {team.college} ({team.year})
          </p>
        </div>

        <Link
          href="/dashboard/ai-assistant"
          className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-5 py-3 rounded-xl shadow transition-all hover:scale-105 flex items-center gap-2"
        >
          <Bot className="w-4 h-4" /> Open AI Assistant
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="text-xs font-bold text-slate-400 uppercase">Team Lead Email</div>
          <div className="text-sm font-bold text-slate-900 mt-1 truncate" title={team.team_lead_email}>{team.team_lead_email}</div>
          <div className="text-[11px] text-slate-500 mt-1">Official Contact Email</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase">Team Members</div>
          <div className="text-xl font-extrabold text-slate-900 mt-1">{team.members.length} Students</div>
          <div className="text-[11px] text-slate-500 mt-1">1 Lead + {team.members.length - 1} Members</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase">Registration Status</div>
          <div className="mt-2">
            <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 font-bold text-xs px-3 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span> 🟢 Registered
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase">PPT Presentation Status</div>
          <div className="mt-2">
            {pptUploaded ? (
              <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 font-bold text-xs px-3 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span> 🟢 Uploaded
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 font-bold text-xs px-3 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse"></span> 🟡 Pending Upload
              </span>
            )}
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Team Member Roster */}
        <div className="lg:col-span-1 bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-600" /> Team Member Roster
          </h3>

          <div className="space-y-3">
            {team.members.map((member, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm">
                  {member.name.charAt(0)}
                </div>
                <div className="flex-1 truncate">
                  <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                    {member.name}
                    {member.is_lead && (
                      <span className="text-[10px] bg-brand-600 text-white font-bold px-1.5 py-0.2 rounded">
                        LEAD
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500">ID: {member.id_number} • {member.department}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Selected Problem Statements */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-600" /> Selected Problem Statements ({team.selected_problem_statements.length}/2)
              </h3>

              {!hasSecondPS && (
                <button
                  onClick={() => setIsAddPSModalOpen(true)}
                  className="px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold text-xs rounded-xl border border-brand-200 transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Second Problem Statement
                </button>
              )}
            </div>

            <div className="space-y-4">
              {team.selected_problem_statements.map((ps, idx) => (
                <div key={ps.problem_id} className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-extrabold text-brand-700 bg-brand-50 border border-brand-100 px-2.5 py-0.5 rounded-md">
                      PS #{idx + 1}: {ps.problem_id}
                    </span>
                    <Badge variant={ps.category === 'Software' ? 'blue' : 'purple'}>{ps.category}</Badge>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mb-1">{ps.problem_title}</h4>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{ps.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 mt-6 flex justify-end">
            <Link
              href="/dashboard/presentation"
              className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              Go to Presentation Upload <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

      </div>

      {/* Add Second Problem Statement Modal */}
      {isAddPSModalOpen && (
        <Modal
          isOpen={isAddPSModalOpen}
          onClose={() => setIsAddPSModalOpen(false)}
          title="Add Second Problem Statement"
          maxWidth="lg"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600">Enter custom details for your team's second Problem Statement:</p>
            
            {psError && (
              <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-200">
                {psError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Problem Statement ID *</label>
                <input
                  type="text"
                  placeholder="e.g. SIH1502 or PS-02"
                  value={customPsId}
                  onChange={(e) => setCustomPsId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category *</label>
                <select
                  value={customPsCategory}
                  onChange={(e) => setCustomPsCategory(e.target.value as 'Software' | 'Hardware')}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="Software">Software</option>
                  <option value="Hardware">Hardware</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Problem Statement Title / Statement *</label>
              <textarea
                rows={3}
                placeholder="Enter full problem statement text or title..."
                value={customPsTitle}
                onChange={(e) => setCustomPsTitle(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Domain / Technology Area (Optional)</label>
              <input
                type="text"
                placeholder="e.g. AI / ML, IoT, Agriculture, Healthcare"
                value={customPsDomain}
                onChange={(e) => setCustomPsDomain(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                onClick={() => setIsAddPSModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSecondPS}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer"
              >
                Save Problem Statement 2
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
