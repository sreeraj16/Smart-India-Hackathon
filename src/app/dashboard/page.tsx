'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { HackathonStateManager } from '@/lib/store/stateManager';
import { Team, ProblemStatement } from '@/lib/types';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Users, FileCheck, Layers, Plus, User, Bot, ArrowRight, ShieldCheck, Cpu, Edit3 } from 'lucide-react';
import { EditTeamModal } from '@/components/EditTeamModal';

export default function TeamDashboardPage() {
  const [team, setTeam] = useState<Team | null>(null);
  const [allStatements, setAllStatements] = useState<ProblemStatement[]>([]);
  const [isAddPSModalOpen, setIsAddPSModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedSecondPS, setSelectedSecondPS] = useState<ProblemStatement | null>(null);

  useEffect(() => {
    const refreshData = async () => {
      const user = HackathonStateManager.getCurrentUser();
      setCurrentUser(user);
      const foundTeam = HackathonStateManager.getTeamForUser(user);
      if (foundTeam) {
        setTeam(foundTeam);
      } else if (user) {
        const asyncTeam = await HackathonStateManager.getTeamForUserAsync(user);
        if (asyncTeam) setTeam(asyncTeam);
      }
      setAllStatements(HackathonStateManager.getProblemStatements());
    };

    refreshData();

    HackathonStateManager.syncFromSupabase().then(() => {
      refreshData();
    });

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

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-3 rounded-xl shadow transition-all hover:scale-105 flex items-center gap-2 cursor-pointer"
          >
            <Edit3 className="w-4 h-4" /> Edit Registration
          </button>

          <Link
            href="/dashboard/ai-assistant"
            className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-5 py-3 rounded-xl shadow transition-all hover:scale-105 flex items-center gap-2"
          >
            <Bot className="w-4 h-4" /> Open AI Assistant
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="text-xs font-bold text-slate-400 uppercase">Team ID</div>
          <div className="text-xs font-extrabold text-slate-900 mt-1 break-all" title={team.team_id}>{team.team_id}</div>
          <div className="text-[11px] text-slate-500 mt-1">Official Identifier</div>
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
          <div className="text-xs font-bold text-slate-400 uppercase">Google Slides Link(s)</div>
          <div className="mt-2 flex flex-col gap-1.5">
            {team.selected_problem_statements.length >= 2 ? (
              <div className="space-y-1 text-xs font-medium">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-600">PS1 Link:</span>
                  {team.google_slides_url ? (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">🟢 Added</span>
                  ) : (
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">🟡 Pending</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-600">PS2 Link:</span>
                  {team.google_slides_url_2 ? (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">🟢 Added</span>
                  ) : (
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">🟡 Pending</span>
                  )}
                </div>
              </div>
            ) : team.google_slides_url ? (
              <>
                <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 font-bold text-xs px-3 py-1 rounded-full w-max">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span> 🟢 Configured
                </span>
                <button
                  onClick={() => window.open(team.google_slides_url || '', '_blank')}
                  className="text-[10px] text-indigo-650 hover:underline font-bold text-left mt-1 flex items-center gap-0.5"
                >
                  Open Slides ↗
                </button>
              </>
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 font-bold text-xs px-3 py-1 rounded-full w-max">
                <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse"></span> 🟡 Pending Link
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
              {team.selected_problem_statements.map((ps, idx) => {
                const psSlidesUrl = idx === 0 ? team.google_slides_url : team.google_slides_url_2;
                return (
                  <div key={ps.problem_id} className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-extrabold text-brand-700 bg-brand-50 border border-brand-100 px-2.5 py-0.5 rounded-md">
                        PS #{idx + 1}: {ps.problem_id}
                      </span>
                      <Badge variant={ps.category === 'Software' ? 'blue' : 'purple'}>{ps.category}</Badge>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 mb-1">{ps.problem_title}</h4>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{ps.description}</p>
                    
                    <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-medium">
                        Slides Link: {psSlidesUrl ? <span className="text-emerald-700 font-bold">🟢 Submitted</span> : <span className="text-amber-700 font-bold">Not Submitted</span>}
                      </span>
                      {psSlidesUrl && (
                        <button
                          onClick={() => window.open(psSlidesUrl, '_blank')}
                          className="text-[11px] text-indigo-650 hover:underline font-bold"
                        >
                          View Slides ↗
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 mt-6 flex justify-end">
            <Link
              href="/dashboard/presentation"
              className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              Go to Presentation Link <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

      </div>

      {/* PPT Reference Resources */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          📚 PPT Reference & Inspiration Resources
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed font-medium">
          Use these curated reference materials as inspiration for slide structure, problem statement breakdown, solution architecture charts, and technical feasibility layouts.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <a
            href="https://www.slideshare.net/search?searchFrom=header&q=Sih&page=3&fbclid=PAb21jcAT8rFlvbWNwBPekJlRERVgE1p0FcGRvZgJleHRuA2FlbQIxMABzcnRjBmFwcF9pZA8xMjQwMjQ1NzQyODc0MTQAAafpxP4cKM12UIRbm_Q-z7800VD-GHNenbvKPrEK_sg21yKRtDpGB83oB8KCFw_aem_VFOwVEL0Ei3k5nsyQbE13A"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-brand-500 hover:bg-brand-50/20 transition-all flex flex-col justify-between space-y-3 group text-left"
          >
            <div>
              <span className="text-[10px] font-black text-brand-700 bg-brand-50 px-2 py-0.5 rounded">SLIDESHARE</span>
              <h4 className="text-xs font-bold text-slate-900 mt-2">SlideShare – SIH Presentations</h4>
              <p className="text-[11px] text-slate-500 mt-1">Wide collection of Smart India Hackathon slide deck references, outlines, and design diagrams.</p>
            </div>
            <span className="text-[11px] text-brand-650 font-extrabold flex items-center gap-1 mt-2 group-hover:underline">
              View SlideShare References ↗
            </span>
          </a>

          <a
            href="https://drive.google.com/drive/folders/1-wTGWM3bIdaN74NYZDZsFvZbwlVhmvsE?utm_referrer=sp_auto_dm&fbclid=PAVERTVgT7fNtwZG9mAmV4dG4DYWVtAjEwAHNydGMGYXBwX2lkDzU2NzA2NzM0MzM1MjQyNwABp6HzkHGxi_5aK6ahcvit-AE_kxoHTjmta8ysbLzNDpOenu1skQU7p2c6sD5B_aem_tVcaa6Sh9Sxm9gdOhvcjvg"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-brand-500 hover:bg-brand-50/20 transition-all flex flex-col justify-between space-y-3 group text-left"
          >
            <div>
              <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">GOOGLE DRIVE</span>
              <h4 className="text-xs font-bold text-slate-900 mt-2">Winning SIH PPT References</h4>
              <p className="text-[11px] text-slate-500 mt-1">Official repository of high-scoring and winning presentation decks from previous SIH cohorts.</p>
            </div>
            <span className="text-[11px] text-indigo-650 font-extrabold flex items-center gap-1 mt-2 group-hover:underline">
              View SIH Winner PPTs ↗
            </span>
          </a>
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

      {/* Edit Registration Modal */}
      {isEditModalOpen && team && (
        <EditTeamModal
          team={team}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          currentUserEmail={currentUser?.email || team.team_lead_email}
          onSuccess={(updatedTeam) => {
            setTeam(updatedTeam);
          }}
        />
      )}

    </div>
  );
}
