'use client';

import React, { useState, useEffect } from 'react';
import { HackathonStateManager } from '@/lib/store/stateManager';
import { Team, UserProfile } from '@/lib/types';
import { createClient } from '@/utils/supabase/client';
import { Award, CheckCircle2, AlertCircle, Save } from 'lucide-react';

export default function CoordinatorJuryMarks() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [faculties, setFaculties] = useState<string[]>([]);
  
  // Selection States
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  // Score Rubric States
  const [innovationScore, setInnovationScore] = useState(0);
  const [relevanceScore, setRelevanceScore] = useState(0);
  const [technicalScore, setTechnicalScore] = useState(0);
  const [presentationScore, setPresentationScore] = useState(0);
  const [qaScore, setQaScore] = useState(0);
  const [comments, setComments] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const supabase = createClient();

  useEffect(() => {
    const user = HackathonStateManager.getCurrentUser();
    setCurrentUser(user);

    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      // 1. Fetch registered teams and members directly from Supabase
      const { data: dbTeams, error: teamsError } = await supabase
        .from('teams')
        .select(`
          *,
          members:team_members(*),
          selected_problem_statements:team_problem_statements(
            problem_id,
            problem_statements(problem_title, description, domain, category)
          )
        `)
        .order('team_id', { ascending: true });

      if (dbTeams && !teamsError) {
        const formatted = dbTeams.map((t: any) => {
          const formattedPS = (t.selected_problem_statements || []).map((mapping: any) => ({
            problem_id: mapping.problem_id,
            problem_title: mapping.problem_statements?.problem_title || 'Unknown title',
            description: mapping.problem_statements?.description || '',
            domain: mapping.problem_statements?.domain || 'General',
            category: mapping.problem_statements?.category || 'Software'
          }));

          return {
            team_id: t.team_id,
            team_name: t.team_name,
            team_lead_name: t.members?.find((m: any) => m.is_lead)?.name || 'Unknown',
            team_lead_email: t.members?.find((m: any) => m.is_lead)?.email || '',
            team_lead_phone: t.members?.find((m: any) => m.is_lead)?.phone || '',
            department: t.members?.find((m: any) => m.is_lead)?.department || 'CSE',
            year: t.members?.find((m: any) => m.is_lead)?.year || 'E3',
            college: 'RGUKT Nuzvid',
            registration_status: t.registration_status || 'registered',
            members: t.members || [],
            selected_problem_statements: formattedPS,
            panel: t.panel || 'Panel 1',
            presentation_completed: !!t.presentation_completed,
            completed_by: t.completed_by || null,
            completed_at: t.completed_at || null,
            created_at: t.created_at
          };
        });
        setTeams(formatted as any);
      } else {
        setTeams(HackathonStateManager.getTeams());
      }
    } catch (err) {
      setTeams(HackathonStateManager.getTeams());
    }

    // 2. Load Faculty/Jury members list from Supabase profiles table
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name')
        .eq('role', 'jury')
        .order('name', { ascending: true });

      if (data && !error && data.length > 0) {
        setFaculties(data.map(f => f.name));
      } else {
        // Fallback to faculty_members table if profiles has no jury members
        const { data: facData } = await supabase
          .from('faculty_members')
          .select('name')
          .order('name', { ascending: true });
          
        if (facData && facData.length > 0) {
          setFaculties(facData.map(f => f.name));
        } else {
          setFaculties(['Dr. Faculty One', 'Dr. Faculty Two', 'Dr. Faculty Three', 'Dr. Faculty Four']);
        }
      }
    } catch (err) {
      setFaculties(['Dr. Faculty One', 'Dr. Faculty Two', 'Dr. Faculty Three', 'Dr. Faculty Four']);
    }
  };

  useEffect(() => {
    if (selectedTeamId) {
      const teamObj = teams.find(t => t.team_id === selectedTeamId);
      setSelectedTeam(teamObj || null);
    } else {
      setSelectedTeam(null);
    }
  }, [selectedTeamId, teams]);

  const totalScore = innovationScore + relevanceScore + technicalScore + presentationScore + qaScore;

  const handleSubmitEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedFaculty) {
      setErrorMsg('Please select a Faculty / Jury Member.');
      return;
    }

    if (!selectedTeamId || !selectedTeam) {
      setErrorMsg('Please select a Team ID.');
      return;
    }

    setIsSubmitting(true);

    const facultyIdentifier = `faculty-${selectedFaculty.replace(/\s+/g, '-').toLowerCase()}`;
    const auditComments = `${comments.trim()} [Entered by Coordinator: ${currentUser?.panel || 'Panel'}]`;

    try {
      // 1. Insert/Upsert into Supabase `jury_evaluations`
      const { error } = await supabase
        .from('jury_evaluations')
        .upsert({
          jury_id: facultyIdentifier,
          jury_name: selectedFaculty,
          team_id: selectedTeam.team_id,
          innovation_score: innovationScore,
          relevance_score: relevanceScore,
          technical_score: technicalScore,
          presentation_score: presentationScore,
          qa_score: qaScore,
          total_score: totalScore,
          comments: auditComments,
          submitted_at: new Date().toISOString()
        }, { onConflict: 'jury_id,team_id' });

      if (error) throw error;

      // 2. Also log audit log if possible
      try {
        await supabase.from('audit_logs').insert({
          log_id: crypto.randomUUID(),
          admin_id: currentUser?.user_id || 'coordinator',
          admin_name: currentUser?.name || 'Coordinator',
          team_id: selectedTeam.team_id,
          action: 'Enter Faculty Marks',
          previous_value: 'N/A',
          new_value: `Jury: ${selectedFaculty}, Score: ${totalScore}/100`,
          reason: 'Paper-based marks collection',
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        console.warn('Logging audit log failed:', err);
      }

      // Sync local state manager evaluation
      HackathonStateManager.submitEvaluation({
        jury_id: facultyIdentifier,
        jury_name: selectedFaculty,
        team_id: selectedTeam.team_id,
        innovation_score: innovationScore,
        relevance_score: relevanceScore,
        technical_score: technicalScore,
        presentation_score: presentationScore,
        qa_score: qaScore,
        total_score: totalScore,
        comments: auditComments
      });

      setSuccessMsg(`Marks successfully submitted for "${selectedFaculty}" on team "${selectedTeam.team_name}" (${selectedTeam.team_id})!`);
      
      // Reset form
      setInnovationScore(0);
      setRelevanceScore(0);
      setTechnicalScore(0);
      setPresentationScore(0);
      setQaScore(0);
      setComments('');
      setSelectedTeamId('');
      setSelectedFaculty('');
    } catch (err: any) {
      console.error('Submit evaluation error:', err);
      setErrorMsg(`Failed to submit evaluation: ${err.message || String(err)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCriterionBlock = (
    label: string,
    score: number,
    setScore: (s: number) => void
  ) => {
    return (
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
        <div className="flex justify-between items-center">
          <label className="text-xs font-bold text-slate-800">{label}</label>
          <span className="text-xs font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-lg">{score} / 20</span>
        </div>
        
        {/* Quick Options */}
        <div className="grid grid-cols-4 gap-2">
          {[5, 10, 15, 20].map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => setScore(val)}
              className={`py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                score === val 
                  ? 'bg-indigo-600 text-white border-indigo-600' 
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {val}
            </button>
          ))}
        </div>

        {/* Custom Input Slider */}
        <div className="flex items-center gap-3 pt-1">
          <input
            type="range"
            min={0}
            max={20}
            value={score}
            onChange={(e) => setScore(parseInt(e.target.value, 10))}
            className="flex-1 accent-indigo-600"
          />
          <input
            type="number"
            min={0}
            max={20}
            value={score}
            onChange={(e) => {
              const val = Math.min(20, Math.max(0, parseInt(e.target.value, 10) || 0));
              setScore(val);
            }}
            className="w-12 text-center py-1 bg-white border border-slate-200 rounded-md text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200">
        <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <Award className="w-6 h-6 text-indigo-600" /> Work as Jury (Paper Marks Entry)
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Enter collected paper marks from presentations. These marks will be credited directly to the selected faculty member.
        </p>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 text-rose-700 text-xs p-4 rounded-xl border border-rose-200 font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 text-emerald-700 text-xs p-4 rounded-xl border border-emerald-200 font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmitEvaluation} className="space-y-6">
        
        {/* Dropdown selects */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Select Faculty / Jury Member *</label>
            <select
              value={selectedFaculty}
              onChange={(e) => setSelectedFaculty(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Choose Faculty --</option>
              {faculties.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Select Team ID *</label>
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Choose Team ID --</option>
              {teams.map(t => (
                <option key={t.team_id} value={t.team_id}>
                  {t.team_id} ({t.team_name})
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedTeam && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            
            {/* Team details header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Selected Team</span>
                <h2 className="text-lg font-bold text-slate-900">
                  {selectedTeam.team_name}
                </h2>
                <p className="text-xs text-indigo-600 font-bold mt-1">
                  Problem Statement: {selectedTeam.selected_problem_statements?.[0]?.problem_title || 'General / Hardware'}
                </p>
              </div>

              <div className="text-right">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Total Score</div>
                <div className="text-2xl font-extrabold text-indigo-600">{totalScore} / 100</div>
              </div>
            </div>

            {/* Criteria Grid (Side-by-Side) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderCriterionBlock("1. Innovation & Novelty (Idea / Approach)", innovationScore, setInnovationScore)}
              {renderCriterionBlock("2. Relevance to Problem Statement (PPT)", relevanceScore, setRelevanceScore)}
              {renderCriterionBlock("3. Technical Feasibility & Project Impact", technicalScore, setTechnicalScore)}
              {renderCriterionBlock("4. Presentation Skills (Pitching)", presentationScore, setPresentationScore)}
              <div className="md:col-span-2">
                {renderCriterionBlock("5. Q&A Responses", qaScore, setQaScore)}
              </div>
            </div>

            {/* Comments Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Comments & Constructive Remarks (Optional)</label>
              <textarea
                rows={3}
                placeholder="Remarks regarding technical implementation, slide presentation, or Q&A responses..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            {/* Submit button */}
            <div className="flex justify-end border-t border-slate-100 pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSubmitting ? 'Saving Marks...' : 'Submit Faculty Marks'}
              </button>
            </div>

          </div>
        )}

      </form>

    </div>
  );
}
