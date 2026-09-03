'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { HackathonStateManager } from '@/lib/store/stateManager';
import { Team, JuryEvaluation } from '@/lib/types';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { ArrowLeft, FileText, Download, Maximize2, Users, Layers, Award, CheckCircle2, AlertCircle, ExternalLink, Edit3, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { AdminEditTeamModal } from '@/components/AdminEditTeamModal';
import { AdminDeleteTeamModal } from '@/components/AdminDeleteTeamModal';

export default function AdminTeamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = (params?.id as string) || '';

  const [team, setTeam] = useState<Team | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [evaluations, setEvaluations] = useState<JuryEvaluation[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Scoring rubric modal state variables
  const [isEvalModalOpen, setIsEvalModalOpen] = useState(false);
  const [selectedEval, setSelectedEval] = useState<JuryEvaluation | null>(null);

  const [innovationScore, setInnovationScore] = useState<number>(15);
  const [relevanceScore, setRelevanceScore] = useState<number>(15);
  const [technicalScore, setTechnicalScore] = useState<number>(15);
  const [presentationScore, setPresentationScore] = useState<number>(15);
  const [qaScore, setQaScore] = useState<number>(15);
  const [comments, setComments] = useState<string>('');

  const [evalJuryId, setEvalJuryId] = useState<string>('admin-evaluation');
  const [evalJuryName, setEvalJuryName] = useState<string>('Admin Controller');
  const [isSubmittingEval, setIsSubmittingEval] = useState(false);

  useEffect(() => {
    if (teamId) {
      const loadedTeam = HackathonStateManager.getTeamById(teamId);
      setTeam(loadedTeam || null);

      const handleUpdate = () => {
        const t = HackathonStateManager.getTeamById(teamId);
        setTeam(t || null);
      };
      window.addEventListener('sih_teams_updated', handleUpdate);

      // Fetch evaluations
      const fetchEvals = async () => {
        try {
          const { data, error } = await supabase
            .from('jury_evaluations')
            .select('*')
            .eq('team_id', teamId);
          if (data && !error) {
            setEvaluations(data);
          }
        } catch (err) {
          console.error('Error fetching evaluations:', err);
        }
      };
      fetchEvals();

      return () => {
        window.removeEventListener('sih_teams_updated', handleUpdate);
      };
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

  const handleScoreInput = (
    setter: React.Dispatch<React.SetStateAction<number>>,
    val: string
  ) => {
    const parsed = parseInt(val, 10);
    if (isNaN(parsed)) setter(0);
    else if (parsed < 0) setter(0);
    else if (parsed > 20) setter(20);
    else setter(parsed);
  };

  const openEditEval = (ev: JuryEvaluation) => {
    setSelectedEval(ev);
    setEvalJuryId(ev.jury_id);
    setEvalJuryName(ev.jury_name || 'Jury Member');
    setInnovationScore(ev.innovation_score);
    setRelevanceScore(ev.relevance_score);
    setTechnicalScore(ev.technical_score);
    setPresentationScore(ev.presentation_score);
    setQaScore(ev.qa_score);
    setComments(ev.comments || '');
    setIsEvalModalOpen(true);
  };

  const openNewEval = () => {
    setSelectedEval(null);
    setEvalJuryId('admin-evaluation');
    setEvalJuryName('Admin Controller');
    setInnovationScore(15);
    setRelevanceScore(15);
    setTechnicalScore(15);
    setPresentationScore(15);
    setQaScore(15);
    setComments('');
    setIsEvalModalOpen(true);
  };

  const handleSaveEvaluation = async () => {
    setIsSubmittingEval(true);
    const totalScore = innovationScore + relevanceScore + technicalScore + presentationScore + qaScore;
    
    try {
      const newOrUpdatedEval = {
        jury_id: evalJuryId,
        jury_name: evalJuryName,
        team_id: teamId,
        innovation_score: innovationScore,
        relevance_score: relevanceScore,
        technical_score: technicalScore,
        presentation_score: presentationScore,
        qa_score: qaScore,
        total_score: totalScore,
        comments: comments,
        submitted_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('jury_evaluations')
        .upsert(newOrUpdatedEval, { onConflict: 'jury_id,team_id' });

      if (error) throw error;

      // Update state manager locally
      HackathonStateManager.submitEvaluation({
        jury_id: evalJuryId,
        jury_name: evalJuryName,
        team_id: teamId,
        innovation_score: innovationScore,
        relevance_score: relevanceScore,
        technical_score: technicalScore,
        presentation_score: presentationScore,
        qa_score: qaScore,
        total_score: totalScore,
        comments: comments
      });

      // Reload evaluations state
      const { data } = await supabase
        .from('jury_evaluations')
        .select('*')
        .eq('team_id', teamId);
      if (data) {
        setEvaluations(data);
      }

      window.dispatchEvent(new Event('sih_teams_updated'));

      await HackathonStateManager.checkTeamEvaluationCompletion(teamId);

      setIsEvalModalOpen(false);
      alert('Evaluation scores successfully recorded!');
    } catch (err: any) {
      console.error(err);
      alert('Error saving evaluation: ' + err.message);
    } finally {
      setIsSubmittingEval(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/admin/teams')}
          className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Teams Directory
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs rounded-xl border border-amber-200 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" /> Edit Registration
          </button>

          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" /> Remove Team
          </button>

          <span className="text-xs font-extrabold text-brand-700 bg-brand-50 border border-brand-100 px-3 py-1 rounded-full">
            {team.team_id}
          </span>
        </div>
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
            <div className="text-[11px] font-bold text-slate-400 uppercase">Jury Accumulated Score</div>
            <div className="text-2xl font-extrabold text-emerald-600">
              {(() => {
                const totalAccum = evaluations.reduce((sum, ev) => sum + ev.total_score, 0);
                const maxPossible = evaluations.length * 100;
                return evaluations.length > 0 ? `${totalAccum} / ${maxPossible}` : 'Not Evaluated Yet';
              })()}
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
                  <div className="text-[11px] text-slate-500">
                    ID: {m.id_number} • {m.department} • <strong className="text-slate-700">Gender: {m.gender || 'M'}</strong>
                  </div>
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

      {/* Admin Presentation Viewer Section */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-emerald-600" /> Presentation Viewer (Team {team.team_id})
        </h3>

        {team.google_slides_url ? (
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-slate-900">Google Slides Presentation Link</div>
                <div className="text-xs text-slate-500 mt-0.5 break-all font-semibold text-indigo-650">{team.google_slides_url}</div>
              </div>
              <Badge variant="green">🟢 Configured</Badge>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={() => setIsPreviewOpen(true)}
                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Maximize2 className="w-4 h-4" /> Open In-App Presentation Viewer
              </button>

              <button
                onClick={() => window.open(team.google_slides_url || '', '_blank')}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" /> Open Google Slides (New Tab)
              </button>
            </div>
          </div>
        ) : team.ppt_submission ? (
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-slate-900">Legacy File: {team.ppt_submission.file_name}</div>
                <div className="text-xs text-slate-500 mt-0.5">Uploaded: {new Date(team.ppt_submission.uploaded_at).toLocaleString()} • Size: {team.ppt_submission.file_size || '3.4 MB'}</div>
              </div>
              <Badge variant="green">🟢 Uploaded Backup</Badge>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={() => setIsPreviewOpen(true)}
                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Maximize2 className="w-4 h-4" /> Open In-App Presentation Viewer
              </button>

              <button
                onClick={() => window.open(team.ppt_submission?.file_url || '', '_blank')}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" /> Download Backup PPT
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 bg-amber-50 rounded-2xl border border-amber-200">
            <p className="text-xs text-amber-800 font-bold">No Google Slides link or legacy presentation file uploaded yet.</p>
          </div>
        )}
      </div>

      {/* Admin Evaluations Panel */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-600" /> Evaluations & Marks Management
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Award fresh scores or edit existing evaluations submitted by Jury members.</p>
          </div>
          <button
            onClick={openNewEval}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            Award Admin Marks
          </button>
        </div>

        {evaluations.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <p className="text-xs text-slate-500 font-semibold">No evaluations recorded for this team yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {evaluations.map((ev) => (
              <div key={ev.jury_id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-3">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <div>
                    <span className="font-bold text-slate-950 text-sm">{ev.jury_name}</span>
                    <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded ml-2 font-mono">{ev.jury_id}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-sm text-emerald-600">Total: {ev.total_score} / 100</span>
                    <button
                      onClick={() => openEditEval(ev)}
                      className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-lg border border-slate-200 transition-colors cursor-pointer"
                    >
                      Edit Marks
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] text-slate-600">
                  <div>Innovation: <strong className="text-slate-900">{ev.innovation_score} / 20</strong></div>
                  <div>Relevance: <strong className="text-slate-900">{ev.relevance_score} / 20</strong></div>
                  <div>Technical: <strong className="text-slate-900">{ev.technical_score} / 20</strong></div>
                  <div>Presentation: <strong className="text-slate-900">{ev.presentation_score} / 20</strong></div>
                  <div>Q&A: <strong className="text-slate-900">{ev.qa_score} / 20</strong></div>
                </div>

                {ev.comments && (
                  <div className="italic text-slate-500 bg-white p-2 rounded border border-slate-100">
                    "{ev.comments}"
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Admin Evaluation Modal */}
      {isEvalModalOpen && (
        <Modal
          isOpen={isEvalModalOpen}
          onClose={() => setIsEvalModalOpen(false)}
          title={selectedEval ? `Edit Marks for ${evalJuryName}` : "Award Admin Marks"}
          maxWidth="2xl"
        >
          <div className="space-y-6 text-xs">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Evaluator ID / Role</label>
                <input
                  type="text"
                  value={evalJuryId}
                  disabled={!!selectedEval}
                  onChange={(e) => setEvalJuryId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-75"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Evaluator Name</label>
                <input
                  type="text"
                  value={evalJuryName}
                  disabled={!!selectedEval}
                  onChange={(e) => setEvalJuryName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-75"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Innovation */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <label className="font-bold text-slate-900">Innovation & Novelty (Max 20)</label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={innovationScore}
                  onChange={(e) => handleScoreInput(setInnovationScore, e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-center font-bold"
                />
              </div>

              {/* Relevance */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <label className="font-bold text-slate-900">Relevance to PS (Max 20)</label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={relevanceScore}
                  onChange={(e) => handleScoreInput(setRelevanceScore, e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-center font-bold"
                />
              </div>

              {/* Technical */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <label className="font-bold text-slate-900">Technical Feasibility (Max 20)</label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={technicalScore}
                  onChange={(e) => handleScoreInput(setTechnicalScore, e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-center font-bold"
                />
              </div>

              {/* Presentation */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <label className="font-bold text-slate-900">Presentation Skills (Max 20)</label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={presentationScore}
                  onChange={(e) => handleScoreInput(setPresentationScore, e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-center font-bold"
                />
              </div>

              {/* Q&A */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 sm:col-span-2 space-y-2">
                <label className="font-bold text-slate-900">Q&A Responses (Max 20)</label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={qaScore}
                  onChange={(e) => handleScoreInput(setQaScore, e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-center font-bold"
                />
              </div>
            </div>

            <div className="text-right font-black text-sm text-emerald-600 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
              Total Score: {innovationScore + relevanceScore + technicalScore + presentationScore + qaScore} / 100
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Comments / Feedback</label>
              <textarea
                rows={3}
                placeholder="Constructive feedback regarding idea iteration, hardware elements, or presentation..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsEvalModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEvaluation}
                disabled={isSubmittingEval}
                className="px-6 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-70 text-white font-bold text-xs rounded-xl shadow cursor-pointer"
              >
                {isSubmittingEval ? 'Saving...' : 'Save Evaluation'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* In-App Presentation Viewer Modal */}
      {isPreviewOpen && (team.google_slides_url || team.ppt_submission) && (() => {
        let embedUrl = '';
        if (team.google_slides_url) {
          const match = team.google_slides_url.match(/\/presentation\/d\/([a-zA-Z0-9-_]+)/);
          embedUrl = match && match[1] 
            ? `https://docs.google.com/presentation/d/${match[1]}/embed?start=false&loop=false`
            : team.google_slides_url;
        } else if (team.ppt_submission) {
          const fileUrl = team.ppt_submission.file_url || supabase.storage.from('SIH-Presentation').getPublicUrl(team.ppt_submission.file_path).data.publicUrl;
          embedUrl = team.ppt_submission.file_name.toLowerCase().endsWith('.pdf')
            ? fileUrl
            : `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;
        }
        return (
          <Modal
            isOpen={isPreviewOpen}
            onClose={() => setIsPreviewOpen(false)}
            title={`Presentation Viewer — Team ${team.team_id}`}
            maxWidth="4xl"
          >
            <div className="space-y-4">
              <div className="w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950 min-h-[500px]">
                {embedUrl ? (
                  <iframe
                    src={embedUrl}
                    className="w-full h-[500px] border-0"
                    allowFullScreen
                  />
                ) : (
                  <div className="h-[500px] flex items-center justify-center text-xs text-slate-400">
                    Unable to load presentation preview url.
                  </div>
                )}
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

      {/* Admin Edit Team Modal */}
      {isEditModalOpen && team && (
        <AdminEditTeamModal
          team={team}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={() => setIsEditModalOpen(false)}
        />
      )}

      {/* Admin Delete Team Modal */}
      {isDeleteModalOpen && team && (
        <AdminDeleteTeamModal
          team={team}
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onSuccess={() => {
            setIsDeleteModalOpen(false);
            router.push('/admin/teams');
          }}
        />
      )}

    </div>
  );
}
