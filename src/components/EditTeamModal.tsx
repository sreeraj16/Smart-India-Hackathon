'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Team, TeamMember, ProblemStatement } from '@/lib/types';
import { EditDiffConfirmationModal } from '@/components/EditDiffConfirmationModal';
import { FieldDiff } from '@/app/api/team/edit/route';
import { HackathonStateManager } from '@/lib/store/stateManager';
import { User, Users, Layers, AlertCircle, Save, CheckCircle2, ShieldCheck } from 'lucide-react';

interface EditTeamModalProps {
  team: Team;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (updatedTeam: Team) => void;
  currentUserEmail?: string;
}

export function EditTeamModal({
  team,
  isOpen,
  onClose,
  onSuccess,
  currentUserEmail
}: EditTeamModalProps) {
  const [activeTab, setActiveTab] = useState<'lead' | 'members' | 'ps'>('lead');

  // Form State initialized from current team props
  const [teamName, setTeamName] = useState(team.team_name || '');

  // Extract Lead Member
  const leadMember = team.members.find(m => m.is_lead) || team.members[0] || {
    name: team.team_lead_name || '',
    id_number: '',
    email: team.team_lead_email || '',
    phone: team.team_lead_phone || '',
    department: team.department || 'Computer Science & Engineering (CSE)',
    year: team.year || 'E3 (3rd Year)',
    gender: 'M'
  };

  const [leadName, setLeadName] = useState(leadMember.name || '');
  const [leadIdNumber, setLeadIdNumber] = useState(leadMember.id_number || '');
  const [leadEmail, setLeadEmail] = useState(leadMember.email || '');
  const [leadPhone, setLeadPhone] = useState(leadMember.phone || '');
  const [leadGender, setLeadGender] = useState(leadMember.gender || 'M');
  const [department, setDepartment] = useState(leadMember.department || team.department || 'Computer Science & Engineering (CSE)');
  const [year, setYear] = useState(leadMember.year || team.year || 'E3 (3rd Year)');

  // Extract non-lead members (should be 5 members)
  const initialOtherMembers = team.members.filter(m => !m.is_lead);
  // Guarantee exactly 5 member slots
  while (initialOtherMembers.length < 5) {
    initialOtherMembers.push({
      name: '',
      id_number: '',
      email: '',
      phone: '',
      department: department,
      year: year,
      gender: 'M'
    });
  }

  const [members, setMembers] = useState<TeamMember[]>(initialOtherMembers.slice(0, 5));

  // Problem Statements
  const initialPS = team.selected_problem_statements || [];
  const ps1 = initialPS[0] || { problem_id: '', problem_title: '', category: 'Software', domain: 'Smart Automation', description: '' };
  const ps2 = initialPS[1] || { problem_id: '', problem_title: '', category: 'Software', domain: 'General', description: '' };

  const [ps1Id, setPs1Id] = useState(ps1.problem_id || '');
  const [ps1Title, setPs1Title] = useState(ps1.problem_title || '');
  const [ps1Category, setPs1Category] = useState<'Software' | 'Hardware'>(ps1.category || 'Software');
  const [ps1Domain, setPs1Domain] = useState(ps1.domain || 'Smart Automation');

  const [hasPs2, setHasPs2] = useState(!!initialPS[1]);
  const [ps2Id, setPs2Id] = useState(ps2.problem_id || '');
  const [ps2Title, setPs2Title] = useState(ps2.problem_title || '');
  const [ps2Category, setPs2Category] = useState<'Software' | 'Hardware'>(ps2.category || 'Software');
  const [ps2Domain, setPs2Domain] = useState(ps2.domain || 'General');

  const [errorMsg, setErrorMsg] = useState('');
  const [computedDiffs, setComputedDiffs] = useState<FieldDiff[]>([]);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state when team prop changes
  useEffect(() => {
    setTeamName(team.team_name || '');
    const lMem = team.members.find(m => m.is_lead) || team.members[0];
    if (lMem) {
      setLeadName(lMem.name || '');
      setLeadIdNumber(lMem.id_number || '');
      setLeadEmail(lMem.email || '');
      setLeadPhone(lMem.phone || '');
      setLeadGender(lMem.gender || 'M');
      setDepartment(lMem.department || team.department || 'Computer Science & Engineering (CSE)');
      setYear(lMem.year || team.year || 'E3 (3rd Year)');
    }

    const oMems = team.members.filter(m => !m.is_lead);
    while (oMems.length < 5) {
      oMems.push({
        name: '',
        id_number: '',
        email: '',
        phone: '',
        department: team.department || 'Computer Science & Engineering (CSE)',
        year: team.year || 'E3 (3rd Year)',
        gender: 'M'
      });
    }
    setMembers(oMems.slice(0, 5));

    const psArr = team.selected_problem_statements || [];
    if (psArr[0]) {
      setPs1Id(psArr[0].problem_id || '');
      setPs1Title(psArr[0].problem_title || '');
      setPs1Category(psArr[0].category || 'Software');
      setPs1Domain(psArr[0].domain || 'Smart Automation');
    }
    if (psArr[1]) {
      setHasPs2(true);
      setPs2Id(psArr[1].problem_id || '');
      setPs2Title(psArr[1].problem_title || '');
      setPs2Category(psArr[1].category || 'Software');
      setPs2Domain(psArr[1].domain || 'General');
    } else {
      setHasPs2(false);
    }
  }, [team]);

  const updateMember = (index: number, field: keyof TeamMember, value: string) => {
    const updated = [...members];
    updated[index] = { ...updated[index], [field]: value };
    setMembers(updated);
  };

  // Helper to validate and calculate diffs before opening confirmation dialog
  const handleReviewEdits = () => {
    setErrorMsg('');

    // 1. Team Name validation
    const trimmedTeamName = teamName.trim();
    if (!trimmedTeamName || !trimmedTeamName.endsWith('_RGUKTN')) {
      setErrorMsg('Team Name is mandatory and must end exactly with "_RGUKTN" (e.g. TechTitans_RGUKTN).');
      return;
    }

    // 2. Team Lead validation
    if (!leadName.trim() || !leadIdNumber.trim() || !leadPhone.trim() || !leadEmail.trim()) {
      setErrorMsg('All Team Leader fields are required.');
      return;
    }
    if (!leadEmail.trim().toLowerCase().endsWith('@rguktn.ac.in')) {
      setErrorMsg('Team Leader must use a valid institutional email ending with @rguktn.ac.in.');
      return;
    }

    // 3. Members validation (5 members)
    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      const num = i + 1;
      if (!m.name?.trim() || !m.id_number?.trim() || !m.email?.trim() || !m.phone?.trim()) {
        setErrorMsg(`All details (Name, ID, Email, Mobile, Gender, Dept, Year) are required for Team Member #${num}.`);
        return;
      }
      if (!m.email.trim().toLowerCase().endsWith('@rguktn.ac.in')) {
        setErrorMsg(`Team Member #${num} must use a valid institutional email ending with @rguktn.ac.in.`);
        return;
      }
    }

    // 4. Gender Requirement: at least 1 female member across lead + 5 members
    const allMembersList = [
      { gender: leadGender },
      ...members
    ];
    const hasFemale = allMembersList.some(m => m.gender === 'F');
    if (!hasFemale) {
      setErrorMsg('Gender Requirement: The team must contain at least one Female member.');
      return;
    }

    // 5. Problem Statements validation
    if (!ps1Id.trim() || !ps1Title.trim()) {
      setErrorMsg('Problem Statement 1 (ID and Title) is mandatory.');
      return;
    }
    if (hasPs2 && (!ps2Id.trim() || !ps2Title.trim())) {
      setErrorMsg('Problem Statement 2 details are incomplete.');
      return;
    }

    // --- Calculate Diffs ---
    const diffs: FieldDiff[] = [];

    // Team Name
    if (team.team_name !== trimmedTeamName) {
      diffs.push({ field: 'Team Name', oldValue: team.team_name, newValue: trimmedTeamName });
    }

    // Lead fields
    if (leadMember.name !== leadName.trim()) {
      diffs.push({ field: 'Team Lead Name', oldValue: leadMember.name, newValue: leadName.trim() });
    }
    if (leadMember.id_number !== leadIdNumber.trim()) {
      diffs.push({ field: 'Team Lead ID Number', oldValue: leadMember.id_number, newValue: leadIdNumber.trim() });
    }
    if (leadMember.email !== leadEmail.trim()) {
      diffs.push({ field: 'Team Lead Email', oldValue: leadMember.email, newValue: leadEmail.trim() });
    }
    if (leadMember.phone !== leadPhone.trim()) {
      diffs.push({ field: 'Team Lead Mobile', oldValue: leadMember.phone, newValue: leadPhone.trim() });
    }
    if ((leadMember.gender || 'M') !== leadGender) {
      diffs.push({ field: 'Team Lead Gender', oldValue: leadMember.gender || 'M', newValue: leadGender });
    }
    if (leadMember.department !== department) {
      diffs.push({ field: 'Department', oldValue: leadMember.department, newValue: department });
    }
    if (leadMember.year !== year) {
      diffs.push({ field: 'Academic Year', oldValue: leadMember.year, newValue: year });
    }

    // Non-lead members
    const origOtherMembers = team.members.filter(m => !m.is_lead);
    members.forEach((m, idx) => {
      const orig = origOtherMembers[idx];
      const memberLabel = `Team Member #${idx + 1}`;
      if (orig) {
        if (orig.name !== m.name.trim()) {
          diffs.push({ field: `${memberLabel} Name`, oldValue: orig.name || '', newValue: m.name.trim() });
        }
        if (orig.id_number !== m.id_number.trim()) {
          diffs.push({ field: `${memberLabel} ID Number`, oldValue: orig.id_number || '', newValue: m.id_number.trim() });
        }
        if (orig.email !== m.email.trim()) {
          diffs.push({ field: `${memberLabel} Email`, oldValue: orig.email || '', newValue: m.email.trim() });
        }
        if (orig.phone !== m.phone.trim()) {
          diffs.push({ field: `${memberLabel} Phone`, oldValue: orig.phone || '', newValue: m.phone.trim() });
        }
        if ((orig.gender || 'M') !== (m.gender || 'M')) {
          diffs.push({ field: `${memberLabel} Gender`, oldValue: orig.gender || 'M', newValue: m.gender || 'M' });
        }
        if (orig.department !== m.department) {
          diffs.push({ field: `${memberLabel} Department`, oldValue: orig.department || '', newValue: m.department });
        }
        if (orig.year !== m.year) {
          diffs.push({ field: `${memberLabel} Year`, oldValue: orig.year || '', newValue: m.year });
        }
      }
    });

    // Problem Statements diff
    const origPSArr = team.selected_problem_statements || [];
    const origPS1 = origPSArr[0];
    if (origPS1) {
      if (origPS1.problem_id !== ps1Id.trim()) {
        diffs.push({ field: 'PS #1 ID', oldValue: origPS1.problem_id, newValue: ps1Id.trim() });
      }
      if (origPS1.problem_title !== ps1Title.trim()) {
        diffs.push({ field: 'PS #1 Title', oldValue: origPS1.problem_title, newValue: ps1Title.trim() });
      }
    }

    if (hasPs2) {
      const origPS2 = origPSArr[1];
      if (!origPS2) {
        diffs.push({ field: 'PS #2 Added', oldValue: 'None', newValue: `${ps2Id.trim()} - ${ps2Title.trim()}` });
      } else {
        if (origPS2.problem_id !== ps2Id.trim()) {
          diffs.push({ field: 'PS #2 ID', oldValue: origPS2.problem_id, newValue: ps2Id.trim() });
        }
        if (origPS2.problem_title !== ps2Title.trim()) {
          diffs.push({ field: 'PS #2 Title', oldValue: origPS2.problem_title, newValue: ps2Title.trim() });
        }
      }
    }

    if (diffs.length === 0) {
      setErrorMsg('No changes detected. Please modify at least one field before saving edits.');
      return;
    }

    setComputedDiffs(diffs);
    setIsDiffModalOpen(true);
  };

  // Submit confirmed edits to backend API
  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const selectedPSList: ProblemStatement[] = [
        {
          problem_id: ps1Id.trim(),
          problem_title: ps1Title.trim(),
          category: ps1Category,
          domain: ps1Domain.trim() || 'General',
          description: ps1Title.trim()
        }
      ];

      if (hasPs2 && ps2Id.trim() && ps2Title.trim()) {
        selectedPSList.push({
          problem_id: ps2Id.trim(),
          problem_title: ps2Title.trim(),
          category: ps2Category,
          domain: ps2Domain.trim() || 'General',
          description: ps2Title.trim()
        });
      }

      const effectiveUserEmail = currentUserEmail || leadEmail;

      const res = await fetch('/api/team/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: team.team_id,
          teamName: teamName.trim(),
          leadName: leadName.trim(),
          leadEmail: leadEmail.trim(),
          leadIdNumber: leadIdNumber.trim(),
          leadPhone: leadPhone.trim(),
          leadGender: leadGender,
          department: department,
          year: year,
          college: team.college || 'RGUKT Nuzvid',
          members: members.map(m => ({
            ...m,
            name: m.name.trim(),
            id_number: m.id_number.trim(),
            email: m.email.trim(),
            phone: m.phone.trim()
          })),
          selectedPS: selectedPSList,
          updatedByEmail: effectiveUserEmail
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Server error updating team registration.');
      }

      // Construct updated team object
      const leadMemberObj: TeamMember = {
        name: leadName.trim(),
        id_number: leadIdNumber.trim(),
        email: leadEmail.trim(),
        phone: leadPhone.trim(),
        department: department,
        year: year,
        gender: leadGender,
        is_lead: true
      };

      const updatedTeamObj: Team = {
        ...team,
        team_name: teamName.trim(),
        team_lead_name: leadName.trim(),
        team_lead_email: leadEmail.trim(),
        team_lead_phone: leadPhone.trim(),
        department: department,
        year: year,
        members: [leadMemberObj, ...members],
        selected_problem_statements: selectedPSList
      };

      // Sync state manager
      HackathonStateManager.editTeamRegistration(updatedTeamObj);

      if (onSuccess) {
        onSuccess(updatedTeamObj);
      }

      setIsDiffModalOpen(false);
      onClose();
    } catch (err: any) {
      console.error('Edit submission error:', err);
      setErrorMsg(err.message || 'Failed to update registration details.');
      setIsDiffModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Edit Registration — ${team.team_id}`}
        maxWidth="4xl"
      >
        <div className="space-y-6">
          
          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('lead')}
              className={`py-3 px-5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'lead'
                  ? 'border-brand-600 text-brand-600 bg-brand-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <User className="w-4 h-4" /> Team & Lead Details
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('members')}
              className={`py-3 px-5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'members'
                  ? 'border-brand-600 text-brand-600 bg-brand-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4" /> Member Roster (5 Members)
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ps')}
              className={`py-3 px-5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'ps'
                  ? 'border-brand-600 text-brand-600 bg-brand-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Layers className="w-4 h-4" /> Problem Statements
            </button>
          </div>

          {errorMsg && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {errorMsg}
            </div>
          )}

          {/* TAB 1: Team & Lead Details */}
          {activeTab === 'lead' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Team Name *</label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <p className="mt-1 text-[10px] text-rose-600 font-bold">
                    Warning: Must end with "_RGUKTN" (e.g. TechTitans_RGUKTN).
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name (Team Lead) *</label>
                  <input
                    type="text"
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Student ID Number *</label>
                  <input
                    type="text"
                    value={leadIdNumber}
                    onChange={(e) => setLeadIdNumber(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Institutional Email *</label>
                  <input
                    type="email"
                    value={leadEmail}
                    onChange={(e) => setLeadEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <p className="mt-1 text-[9px] text-slate-500 font-bold">Must end with @rguktn.ac.in</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone / Mobile Number *</label>
                  <input
                    type="text"
                    value={leadPhone}
                    onChange={(e) => setLeadPhone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Gender *</label>
                  <select
                    value={leadGender}
                    onChange={(e) => setLeadGender(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="M">Male (M)</option>
                    <option value="F">Female (F)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Department *</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="Computer Science & Engineering (CSE)">Computer Science & Engineering (CSE)</option>
                    <option value="Electronics & Communication Eng (ECE)">Electronics & Communication Eng (ECE)</option>
                    <option value="Electrical & Electronics Engineering (EEE)">Electrical & Electronics Engineering (EEE)</option>
                    <option value="Mechanical Engineering (MECH)">Mechanical Engineering (MECH)</option>
                    <option value="Civil Engineering (CIVIL)">Civil Engineering (CIVIL)</option>
                    <option value="Chemical Engineering (CHEM)">Chemical Engineering (CHEM)</option>
                    <option value="Metallurgical Engineering (MME)">Metallurgical Engineering (MME)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Academic Year *</label>
                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="E1 (1st Year)">E1 (1st Year)</option>
                    <option value="E2 (2nd Year)">E2 (2nd Year)</option>
                    <option value="E3 (3rd Year)">E3 (3rd Year)</option>
                    <option value="E4 (4th Year)">E4 (4th Year)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Member Roster */}
          {activeTab === 'members' && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <div className="text-xs text-slate-500 font-medium">
                Review and update details for any of the 5 additional team members below:
              </div>

              {members.map((member, idx) => (
                <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                    <span>Team Member #{idx + 1} *</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={member.name}
                      onChange={(e) => updateMember(idx, 'name', e.target.value)}
                      className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                    <input
                      type="text"
                      placeholder="ID Number (e.g. N200102)"
                      value={member.id_number}
                      onChange={(e) => updateMember(idx, 'id_number', e.target.value)}
                      className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                    <input
                      type="email"
                      placeholder="Email (@rguktn.ac.in)"
                      value={member.email}
                      onChange={(e) => updateMember(idx, 'email', e.target.value)}
                      className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Mobile Phone"
                      value={member.phone}
                      onChange={(e) => updateMember(idx, 'phone', e.target.value)}
                      className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                    <select
                      value={member.gender || 'M'}
                      onChange={(e) => updateMember(idx, 'gender', e.target.value)}
                      className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                    >
                      <option value="M">Male (M)</option>
                      <option value="F">Female (F)</option>
                    </select>
                    <select
                      value={member.department || department}
                      onChange={(e) => updateMember(idx, 'department', e.target.value)}
                      className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                    >
                      <option value="Computer Science & Engineering (CSE)">Computer Science & Engineering (CSE)</option>
                      <option value="Electronics & Communication Eng (ECE)">Electronics & Communication Eng (ECE)</option>
                      <option value="Electrical & Electronics Engineering (EEE)">Electrical & Electronics Engineering (EEE)</option>
                      <option value="Mechanical Engineering (MECH)">Mechanical Engineering (MECH)</option>
                      <option value="Civil Engineering (CIVIL)">Civil Engineering (CIVIL)</option>
                      <option value="Chemical Engineering (CHEM)">Chemical Engineering (CHEM)</option>
                      <option value="Metallurgical Engineering (MME)">Metallurgical Engineering (MME)</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: Problem Statements */}
          {activeTab === 'ps' && (
            <div className="space-y-5">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <span className="text-xs font-extrabold text-brand-700 bg-brand-100 px-3 py-1 rounded-md">
                  Problem Statement 1 (Primary)
                </span>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Problem Statement ID *</label>
                  <input
                    type="text"
                    value={ps1Id}
                    onChange={(e) => setPs1Id(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Problem Statement Title *</label>
                  <textarea
                    rows={2}
                    value={ps1Title}
                    onChange={(e) => setPs1Title(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div className="flex gap-4 pt-1">
                  <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                    <input
                      type="radio"
                      name="ps1-cat"
                      value="Software"
                      checked={ps1Category === 'Software'}
                      onChange={() => setPs1Category('Software')}
                    /> Software
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                    <input
                      type="radio"
                      name="ps1-cat"
                      value="Hardware"
                      checked={ps1Category === 'Hardware'}
                      onChange={() => setPs1Category('Hardware')}
                    /> Hardware
                  </label>
                </div>
              </div>

              {/* Problem Statement 2 */}
              <div className="p-4 bg-brand-50/50 border border-brand-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit-has-ps2"
                    checked={hasPs2}
                    onChange={(e) => setHasPs2(e.target.checked)}
                    className="w-4 h-4 text-brand-600 rounded"
                  />
                  <label htmlFor="edit-has-ps2" className="text-xs font-bold text-slate-800 cursor-pointer">
                    Enable Problem Statement 2 (Secondary Choice)
                  </label>
                </div>

                {hasPs2 && (
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">PS 2 ID *</label>
                      <input
                        type="text"
                        value={ps2Id}
                        onChange={(e) => setPs2Id(e.target.value)}
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">PS 2 Title *</label>
                      <textarea
                        rows={2}
                        value={ps2Title}
                        onChange={(e) => setPs2Title(e.target.value)}
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                      />
                    </div>

                    <div className="flex gap-4">
                      <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                        <input
                          type="radio"
                          name="ps2-cat"
                          value="Software"
                          checked={ps2Category === 'Software'}
                          onChange={() => setPs2Category('Software')}
                        /> Software
                      </label>
                      <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                        <input
                          type="radio"
                          name="ps2-cat"
                          value="Hardware"
                          checked={ps2Category === 'Hardware'}
                          onChange={() => setPs2Category('Hardware')}
                        /> Hardware
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer Action Bar */}
          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleReviewEdits}
              className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow transition-all hover:scale-105 flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" /> Review Edits & Save
            </button>
          </div>

        </div>
      </Modal>

      {/* Diff Confirmation Dialog */}
      <EditDiffConfirmationModal
        isOpen={isDiffModalOpen}
        onClose={() => setIsDiffModalOpen(false)}
        onConfirm={handleFinalSubmit}
        diffs={computedDiffs}
        isSubmitting={isSubmitting}
      />
    </>
  );
}
