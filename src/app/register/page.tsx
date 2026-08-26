'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { HackathonStateManager } from '@/lib/store/stateManager';
import { ProblemStatement, TeamMember } from '@/lib/types';
import { Modal } from '@/components/ui/Modal';
import { CheckCircle2, User, Plus, Trash2, Layers, Search, ShieldCheck, ArrowRight, ArrowLeft, Mail, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<number>(1);

  // Form State
  const [teamName, setTeamName] = useState('');
  const [leadName, setLeadName] = useState('');
  const [leadIdNumber, setLeadIdNumber] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadGender, setLeadGender] = useState('M');
  const [department, setDepartment] = useState('Computer Science & Engineering (CSE)');
  const [year, setYear] = useState('E3 (3rd Year)');
  const [college] = useState('RGUKT Nuzvid');

  const [members, setMembers] = useState<TeamMember[]>([
    { name: '', id_number: '', email: '', phone: '', department: 'Computer Science & Engineering (CSE)', year: 'E3 (3rd Year)', gender: 'M' },
    { name: '', id_number: '', email: '', phone: '', department: 'Computer Science & Engineering (CSE)', year: 'E3 (3rd Year)', gender: 'M' },
    { name: '', id_number: '', email: '', phone: '', department: 'Computer Science & Engineering (CSE)', year: 'E3 (3rd Year)', gender: 'M' },
    { name: '', id_number: '', email: '', phone: '', department: 'Computer Science & Engineering (CSE)', year: 'E3 (3rd Year)', gender: 'M' },
    { name: '', id_number: '', email: '', phone: '', department: 'Computer Science & Engineering (CSE)', year: 'E3 (3rd Year)', gender: 'M' }
  ]);
  const [selectedPS, setSelectedPS] = useState<ProblemStatement[]>([]);

  // Custom Problem Statements Input State
  const [ps1Id, setPs1Id] = useState('');
  const [ps1Title, setPs1Title] = useState('');
  const [ps1Category, setPs1Category] = useState<'Software' | 'Hardware'>('Software');
  const [ps1Domain, setPs1Domain] = useState('Smart Automation');

  const [hasPs2, setHasPs2] = useState(false);
  const [ps2Id, setPs2Id] = useState('');
  const [ps2Title, setPs2Title] = useState('');
  const [ps2Category, setPs2Category] = useState<'Software' | 'Hardware'>('Software');
  const [ps2Domain, setPs2Domain] = useState('AI & Data Analytics');

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTeam, setCreatedTeam] = useState<{ teamId: string } | null>(null);

  useEffect(() => {
    const currentUser = HackathonStateManager.getCurrentUser();
    if (currentUser && currentUser.role === 'team_lead') {
      if (currentUser.name) setLeadName(currentUser.name);
      if (currentUser.email) setLeadEmail(currentUser.email);
    }
  }, []);

  const handleNextFromStep1 = () => {
    setErrorMsg('');
    if (!teamName.trim()) {
      setErrorMsg('Warning: Team Name is required.');
      return;
    }
    if (!teamName.endsWith('_RGUKTN')) {
      setErrorMsg('Warning: Team Name must end exactly with _RGUKTN (e.g. TechTitans_RGUKTN). Other suffixes are invalid.');
      return;
    }
    if (!leadName.trim() || !leadIdNumber.trim() || !leadPhone.trim()) {
      setErrorMsg('All Team Leader details are mandatory to proceed.');
      return;
    }
    if (!leadEmail.trim() || !leadEmail.endsWith('@rguktn.ac.in')) {
      setErrorMsg('Team Leader must use a valid institutional email ending with @rguktn.ac.in.');
      return;
    }
    setStep(2);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNextFromStep2 = () => {
    setErrorMsg('');
    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      const num = i + 1;
      if (!m.name?.trim() || !m.id_number?.trim() || !m.phone?.trim() || !m.email?.trim()) {
        setErrorMsg(`All details (Name, Gender, Email, Mobile, Department, Year) are mandatory for Team Member #${num} before proceeding.`);
        return;
      }
      if (!m.email.endsWith('@rguktn.ac.in')) {
        setErrorMsg(`Team Member #${num} must use a valid institutional email ending with @rguktn.ac.in.`);
        return;
      }
    }
    setStep(3);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addMember = () => {
    if (members.length >= 5) {
      alert('Maximum 5 additional team members allowed per team.');
      return;
    }
    setMembers([
      ...members,
      { name: '', id_number: '', email: '', phone: '', department: department, year: year, gender: 'M' }
    ]);
  };

  const removeMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index));
  };

  const updateMember = (index: number, field: keyof TeamMember, value: string) => {
    const updated = [...members];
    updated[index] = { ...updated[index], [field]: value };
    setMembers(updated);
  };

  const togglePS = (ps: ProblemStatement) => {
    const isSelected = selectedPS.some(p => p.problem_id === ps.problem_id);
    if (isSelected) {
      setSelectedPS(selectedPS.filter(p => p.problem_id !== ps.problem_id));
    } else {
      if (selectedPS.length >= 2) {
        alert('Maximum 2 Problem Statements allowed per team.');
        return;
      }
      setSelectedPS([...selectedPS, ps]);
    }
  };

  const handleSubmitRegistration = async () => {
    if (selectedPS.length === 0) {
      setErrorMsg('At least 1 Problem Statement selection is mandatory.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    // --- Frontend Validations ---

    // 1. Team Name ending with _RGUKTN
    if (!teamName.trim() || !teamName.endsWith('_RGUKTN')) {
      setErrorMsg('Team Name is mandatory and must end exactly with _RGUKTN (e.g. TechTitans_RGUKTN).');
      setIsSubmitting(false);
      return;
    }

    const leadMemberObj: TeamMember = {
      name: leadName,
      id_number: leadIdNumber,
      email: leadEmail,
      phone: leadPhone,
      department: department,
      year: year,
      is_lead: true,
      gender: leadGender
    };

    const allMembers = [leadMemberObj, ...members];

    // 2. Exactly 6 members validation
    if (allMembers.length !== 6) {
      setErrorMsg('Mandatory: Registration requires exactly 6 members (1 Team Lead and 5 Team Members).');
      setIsSubmitting(false);
      return;
    }

    // 3. Email and required fields validation
    let hasFemale = false;
    for (let i = 0; i < allMembers.length; i++) {
      const m = allMembers[i];
      const label = m.is_lead ? 'Team Lead' : `Team Member #${i}`;

      if (!m.name?.trim() || !m.id_number?.trim() || !m.email?.trim() || !m.phone?.trim() || !m.department || !m.year || !m.gender) {
        setErrorMsg(`All details (Name, Gender, Email, Mobile, Department, Year) are mandatory for all 6 members. Check ${label}.`);
        setIsSubmitting(false);
        return;
      }

      if (!m.email.endsWith('@rguktn.ac.in')) {
        setErrorMsg(`Every member must use a valid institutional email ending with @rguktn.ac.in. Invalid email: ${m.email} (${label}).`);
        setIsSubmitting(false);
        return;
      }

      if (m.gender === 'F') {
        hasFemale = true;
      }
    }

    // 4. At least one female validation
    if (!hasFemale) {
      setErrorMsg('Gender Requirement: The team must contain at least one Female member.');
      setIsSubmitting(false);
      return;
    }

    // Submit to Backend Registration Endpoint for DB Insertion + Nodemailer Trigger
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamName: teamName.trim(),
          leadName,
          leadEmail,
          leadIdNumber,
          leadPhone,
          leadGender,
          department,
          year,
          college,
          members,
          selectedPS
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Server registration request failed.');
      }

      // Sync local state manager representation
      HackathonStateManager.registerTeam({
        team_id: data.teamId,
        team_name: teamName.trim(),
        team_lead_id: `lead-${Date.now()}`,
        team_lead_name: leadName,
        team_lead_email: leadEmail,
        team_lead_phone: leadPhone,
        department: department,
        year: year,
        college: college,
        registration_status: 'registered',
        members: data.allMembers || allMembers,
        selected_problem_statements: selectedPS,
        ppt_submission: null
      });

      setCreatedTeam({ teamId: data.teamId });
    } catch (err: any) {
      console.error('Registration dispatch error:', err);
      setErrorMsg(err.message || 'Failed to submit registration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-12 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Team Registration</h1>
          <p className="text-xs text-slate-500 mt-1">SIH Internal Hackathon 2026 — RGUKT Nuzvid</p>
        </div>

        {/* Step Progress Bar */}
        <div className="mb-8 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          {[
            { num: 1, label: 'Team & Lead' },
            { num: 2, label: 'Members' },
            { num: 3, label: 'Problem Statements' },
            { num: 4, label: 'Review & Submit' }
          ].map((st) => (
            <div
              key={st.num}
              onClick={() => {
                setErrorMsg('');
                setStep(st.num);
                if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                step === st.num ? 'bg-brand-600 text-white shadow-sm' :
                step > st.num ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
              }`}>
                {step > st.num ? <CheckCircle2 className="w-4 h-4" /> : st.num}
              </div>
              <span className={`text-xs font-semibold hidden sm:inline ${step === st.num ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>
                {st.label}
              </span>
            </div>
          ))}
        </div>

        {errorMsg && (
          <div className="mb-6 bg-rose-50 text-rose-700 text-xs p-4 rounded-xl border border-rose-200 font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {errorMsg}
          </div>
        )}

        {/* STEP 1: Team & Lead Details */}
        {step === 1 && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <User className="w-5 h-5 text-brand-600" /> Team Leader Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Team Name *</label>
                <input
                  type="text"
                  placeholder="e.g. TechTitans_RGUKTN"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                />
                <p className="mt-1.5 text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                  Warning: The Team Name must end exactly with "_RGUKTN".
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name (Team Lead) *</label>
                <input
                  type="text"
                  placeholder="Student Full Name"
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Student ID Number *</label>
                <input
                  type="text"
                  placeholder="e.g. N200101"
                  value={leadIdNumber}
                  onChange={(e) => setLeadIdNumber(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  placeholder="student@rguktn.ac.in"
                  value={leadEmail}
                  onChange={(e) => setLeadEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                />
                <p className="mt-1 text-[9px] text-slate-500 font-bold">
                  Must be institutional college email (@rguktn.ac.in)
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number *</label>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={leadPhone}
                  onChange={(e) => setLeadPhone(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Department *</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
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
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                >
                  <option value="E1 (1st Year)">E1 (1st Year)</option>
                  <option value="E2 (2nd Year)">E2 (2nd Year)</option>
                  <option value="E3 (3rd Year)">E3 (3rd Year)</option>
                  <option value="E4 (4th Year)">E4 (4th Year)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Gender *</label>
                <select
                  value={leadGender}
                  onChange={(e) => setLeadGender(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                >
                  <option value="M">Male (M)</option>
                  <option value="F">Female (F)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">College</label>
                <input
                  type="text"
                  disabled
                  value={college}
                  className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 font-semibold"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={handleNextFromStep1}
                className="px-8 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm rounded-xl shadow-md transition-all hover:scale-105 flex items-center gap-2 cursor-pointer"
              >
                Next: Add Members <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Team Members */}
        {step === 2 && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Mandatory Team Members</h2>
                <p className="text-xs text-slate-500">Every team must have exactly 5 additional student members (6 total including Lead).</p>
              </div>
            </div>

            {members.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-3">
                <User className="w-10 h-10 text-slate-400 mx-auto" />
                <p className="text-xs text-slate-600 font-semibold">No additional members added yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {members.map((member, index) => (
                  <div key={index} className="p-4 bg-slate-50 rounded-xl border border-slate-200 relative">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-bold text-slate-700">Team Member #{index + 1} *</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      <input
                        type="text"
                        placeholder="Member Full Name"
                        value={member.name}
                        onChange={(e) => updateMember(index, 'name', e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                      <input
                        type="text"
                        placeholder="ID Number (e.g. N200102)"
                        value={member.id_number}
                        onChange={(e) => updateMember(index, 'id_number', e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                      <input
                        type="email"
                        placeholder="Member Email Address"
                        value={member.email}
                        onChange={(e) => updateMember(index, 'email', e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                      <p className="sm:col-span-2 md:col-span-3 text-[9px] text-slate-500 font-bold -mt-2.5 mb-1 px-1">
                        Must be institutional college email (@rguktn.ac.in)
                      </p>
                      <input
                        type="text"
                        placeholder="Mobile (e.g. 9876543210)"
                        value={member.phone || ''}
                        onChange={(e) => updateMember(index, 'phone', e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                      <select
                        value={member.gender || 'M'}
                        onChange={(e) => updateMember(index, 'gender', e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                      >
                        <option value="M">Male (M)</option>
                        <option value="F">Female (F)</option>
                      </select>
                      <select
                        value={member.department || department}
                        onChange={(e) => updateMember(index, 'department', e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                      >
                        <option value="Computer Science & Engineering (CSE)">Computer Science & Engineering (CSE)</option>
                        <option value="Electronics & Communication Eng (ECE)">Electronics & Communication Eng (ECE)</option>
                        <option value="Electrical & Electronics Engineering (EEE)">Electrical & Electronics Engineering (EEE)</option>
                        <option value="Mechanical Engineering (MECH)">Mechanical Engineering (MECH)</option>
                        <option value="Civil Engineering (CIVIL)">Civil Engineering (CIVIL)</option>
                        <option value="Chemical Engineering (CHEM)">Chemical Engineering (CHEM)</option>
                        <option value="Metallurgical Engineering (MME)">Metallurgical Engineering (MME)</option>
                      </select>
                      <select
                        value={member.year || year}
                        onChange={(e) => updateMember(index, 'year', e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                      >
                        <option value="E1 (1st Year)">E1 (1st Year)</option>
                        <option value="E2 (2nd Year)">E2 (2nd Year)</option>
                        <option value="E3 (3rd Year)">E3 (3rd Year)</option>
                        <option value="E4 (4th Year)">E4 (4th Year)</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all flex items-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Team Lead Details
              </button>
              <button
                type="button"
                onClick={handleNextFromStep2}
                className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm rounded-xl transition-all flex items-center gap-2 cursor-pointer"
              >
                Next: Enter Problem Statements <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Enter Custom Problem Statements */}
        {step === 3 && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-xl font-bold text-slate-900">Enter Problem Statements</h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter your Problem Statement details (ID and Statement text). Problem Statement 1 is mandatory. Problem Statement 2 is optional and can be submitted now or updated later from your Team Dashboard.
              </p>
              <div className="mt-3 bg-amber-50 border border-amber-200 text-amber-900 p-3.5 rounded-xl text-xs flex gap-2 font-medium">
                <AlertCircle className="w-4.5 h-4.5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Mandatory Note:</strong> Please clearly copy-paste the exact <strong>Problem Statement ID</strong> and <strong>Problem Statement Title</strong> directly from the official <a href="https://sih.gov.in" target="_blank" rel="noreferrer" className="underline font-bold text-amber-800">sih.gov.in</a> website. Incorrect entries will block your registration progress during evaluation.
                </div>
              </div>
            </div>

            {/* Problem Statement 1 Box */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                <label className="block text-xs font-bold text-slate-700 mb-1">Problem Statement ID *</label>
                <input
                  type="text"
                  placeholder="e.g. SIH1501 or PS-01"
                  value={ps1Id}
                  onChange={(e) => setPs1Id(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Problem Statement Category *</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="ps1-category"
                      value="Software"
                      checked={ps1Category === 'Software'}
                      onChange={() => setPs1Category('Software')}
                      className="w-4 h-4 text-brand-600 focus:ring-brand-500 cursor-pointer"
                    />
                    Software
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="ps1-category"
                      value="Hardware"
                      checked={ps1Category === 'Hardware'}
                      onChange={() => setPs1Category('Hardware')}
                      className="w-4 h-4 text-brand-600 focus:ring-brand-500 cursor-pointer"
                    />
                    Hardware
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Problem Statement / Title *</label>
                <textarea
                  rows={3}
                  placeholder="Enter the full problem statement text or title..."
                  value={ps1Title}
                  onChange={(e) => setPs1Title(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            {/* Toggle / Checkbox for Problem Statement 2 */}
            <div className="bg-brand-50/60 p-4 rounded-2xl border border-brand-200/80">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="toggle-ps2"
                  checked={hasPs2}
                  onChange={(e) => setHasPs2(e.target.checked)}
                  className="w-5 h-5 text-brand-600 rounded cursor-pointer border-slate-300 focus:ring-brand-500"
                />
                <label htmlFor="toggle-ps2" className="text-xs font-bold text-slate-800 cursor-pointer">
                  Enter Problem Statement 2 Now (Optional)
                </label>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 pl-8">
                If you have not fixed Problem Statement 2 yet, leave this unchecked. You can add it anytime later from your Team Dashboard!
              </p>
            </div>

            {/* Problem Statement 2 Box (Conditional) */}
            {hasPs2 && (
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                  <span className="text-xs font-extrabold text-brand-700 bg-brand-100 px-3 py-1 rounded-lg">
                    Problem Statement 2 (Optional)
                  </span>
                  <span className="text-[11px] text-slate-500 font-semibold">Secondary Choice</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Problem Statement ID *</label>
                  <input
                    type="text"
                    placeholder="e.g. SIH1502 or PS-02"
                    value={ps2Id}
                    onChange={(e) => setPs2Id(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Problem Statement Category *</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="ps2-category"
                        value="Software"
                        checked={ps2Category === 'Software'}
                        onChange={() => setPs2Category('Software')}
                        className="w-4 h-4 text-brand-600 focus:ring-brand-500 cursor-pointer"
                      />
                      Software
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="ps2-category"
                        value="Hardware"
                        checked={ps2Category === 'Hardware'}
                        onChange={() => setPs2Category('Hardware')}
                        className="w-4 h-4 text-brand-600 focus:ring-brand-500 cursor-pointer"
                      />
                      Hardware
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Problem Statement / Title *</label>
                  <textarea
                    rows={3}
                    placeholder="Enter Problem Statement 2 text or title..."
                    value={ps2Title}
                    onChange={(e) => setPs2Title(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all flex items-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!ps1Id.trim()) {
                    setErrorMsg('Please enter Problem Statement 1 ID.');
                    return;
                  }
                  if (!ps1Title.trim()) {
                    setErrorMsg('Please enter Problem Statement 1 Title / Statement.');
                    return;
                  }

                  if (hasPs2) {
                    if (!ps2Id.trim()) {
                      setErrorMsg('Please enter Problem Statement 2 ID.');
                      return;
                    }
                    if (!ps2Title.trim()) {
                      setErrorMsg('Please enter Problem Statement 2 Title / Statement.');
                      return;
                    }
                  }

                  const customStatements: ProblemStatement[] = [
                    {
                      problem_id: ps1Id.trim(),
                      problem_title: ps1Title.trim(),
                      category: ps1Category,
                      domain: ps1Domain.trim() || 'General',
                      description: ps1Title.trim()
                    }
                  ];

                  if (hasPs2 && ps2Id.trim() && ps2Title.trim()) {
                    customStatements.push({
                      problem_id: ps2Id.trim(),
                      problem_title: ps2Title.trim(),
                      category: ps2Category,
                      domain: ps2Domain.trim() || 'General',
                      description: ps2Title.trim()
                    });
                  }

                  setSelectedPS(customStatements);
                  setErrorMsg('');
                  setStep(4);
                  if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm rounded-xl transition-all flex items-center gap-2 cursor-pointer"
              >
                Next: Review Registration <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Review & Submit */}
        {step === 4 && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-3">Review & Confirm Registration</h2>

            <div className="bg-slate-50 p-4 rounded-xl space-y-2 text-xs">
              <div className="font-bold text-slate-800 text-sm mb-2">{teamName}</div>
              <div><strong>Team Lead:</strong> {leadName} ({leadIdNumber})</div>
              <div><strong>Email:</strong> {leadEmail} | <strong>Phone:</strong> {leadPhone}</div>
              <div><strong>Department:</strong> {department} ({year})</div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">Team Members ({members.length})</h4>
              {members.length === 0 ? (
                <p className="text-xs text-slate-500">Only Team Lead registered.</p>
              ) : (
                <div className="space-y-1 text-xs">
                  {members.map((m, i) => (
                    <div key={i} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      {m.name} (ID: {m.id_number}) — {m.email}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">Selected Problem Statements ({selectedPS.length})</h4>
              <div className="space-y-2">
                {selectedPS.map((ps, i) => (
                  <div key={ps.problem_id} className="bg-brand-50/60 border border-brand-100 p-3 rounded-xl text-xs">
                    <span className="font-bold text-brand-700">PS #{i + 1} ({ps.problem_id}):</span> {ps.problem_title}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all flex items-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Edit Selections
              </button>
              <button
                type="button"
                onClick={handleSubmitRegistration}
                disabled={isSubmitting}
                className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition-all hover:scale-105 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" /> {isSubmitting ? 'Registering Team & Sending Email...' : 'Confirm & Submit Registration'}
              </button>
            </div>
          </div>
        )}

        {/* Success Credentials Modal */}
        {createdTeam && (
          <Modal
            isOpen={!!createdTeam}
            onClose={() => {}}
            title="Team Registration Successful!"
            maxWidth="md"
          >
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Your Team Has Been Registered</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Team details & WhatsApp Group invitation QR code dispatched to <strong className="text-slate-800">{leadEmail}</strong> via Nodemailer!
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Team Lead ID Number:</span>
                  <span className="font-bold text-slate-800">{leadIdNumber}</span>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl text-xs text-left">
                <div className="font-bold text-emerald-900 flex items-center gap-1.5 mb-1">
                  <Mail className="w-4 h-4 text-emerald-600" /> WhatsApp Group QR Sent to Email
                </div>
                <div className="text-emerald-800">
                  Join Team Leaders Group: <a href="https://chat.whatsapp.com/Ckfq83LH8Jf1sknV0E7SYe" target="_blank" rel="noreferrer" className="underline font-bold">https://chat.whatsapp.com/Ckfq83LH8Jf1sknV0E7SYe</a>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    HackathonStateManager.setCurrentUser({
                      user_id: `lead-${Date.now()}`,
                      name: leadName,
                      email: leadEmail,
                      role: 'team_lead',
                      team_id: createdTeam.teamId,
                      created_at: new Date().toISOString()
                    });
                    router.push('/dashboard');
                  }}
                  className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm rounded-xl shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  Proceed to Team Lead Dashboard <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </Modal>
        )}

      </div>
    </div>
  );
}
