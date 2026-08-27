'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { HackathonStateManager } from '@/lib/store/stateManager';
import { Team, JuryEvaluation } from '@/lib/types';
import Link from 'next/link';
import { Modal } from '@/components/ui/Modal';
import { ArrowLeft, Award, FileText, CheckCircle2, AlertCircle, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

export default function JuryEvaluatePage() {
  const params = useParams();
  const router = useRouter();
  const teamId = (params?.id || params?.teamId) as string;

  const [team, setTeam] = useState<Team | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // 5 Evaluation Criteria (Max 20 Marks Each)
  const [innovationScore, setInnovationScore] = useState<number>(15);
  const [relevanceScore, setRelevanceScore] = useState<number>(15);
  const [technicalScore, setTechnicalScore] = useState<number>(15);
  const [presentationScore, setPresentationScore] = useState<number>(15);
  const [qaScore, setQaScore] = useState<number>(15);

  // Criterion Comments
  const [comments, setComments] = useState<string>('');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [successSubmitted, setSuccessSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (teamId) {
      const loadedTeam = HackathonStateManager.getTeamById(teamId);
      setTeam(loadedTeam || null);

      const currentUser = HackathonStateManager.getCurrentUser();
      const currentJuryId = currentUser?.jury_id || 'jury-1';

      // Fetch existing evaluation from Supabase
      const fetchEvaluation = async () => {
        try {
          const { data, error } = await supabase
            .from('jury_evaluations')
            .select('*')
            .eq('jury_id', currentJuryId)
            .eq('team_id', teamId)
            .maybeSingle();

          if (error) throw error;

          if (data) {
            setInnovationScore(data.innovation_score);
            setRelevanceScore(data.relevance_score);
            setTechnicalScore(data.technical_score);
            setPresentationScore(data.presentation_score);
            setQaScore(data.qa_score);
            setComments(data.comments || '');
          }
        } catch (err: any) {
          console.error('Error fetching existing evaluation:', err);
        }
      };

      fetchEvaluation();
    }
  }, [teamId]);

  if (!team) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center py-12 px-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-xl font-extrabold text-slate-900">Team Not Found</h2>
          <p className="text-xs text-slate-500">The requested team ID does not exist or has not been registered yet.</p>
          <Link href="/jury/dashboard" className="inline-block px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow transition-all">
            Return to Jury Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const totalScore = Math.min(
    100,
    (innovationScore || 0) +
    (relevanceScore || 0) +
    (technicalScore || 0) +
    (presentationScore || 0) +
    (qaScore || 0)
  );

  const handleScoreInput = (
    setter: React.Dispatch<React.SetStateAction<number>>,
    val: string
  ) => {
    const parsed = parseInt(val, 10);
    if (isNaN(parsed)) {
      setter(0);
    } else if (parsed < 0) {
      setter(0);
    } else if (parsed > 20) {
      setter(20);
    } else {
      setter(parsed);
    }
  };

  const handleSubmitEvaluation = async () => {
    const currentUser = HackathonStateManager.getCurrentUser();
    const juryId = currentUser?.jury_id || 'jury-1';
    const juryName = currentUser?.name || 'Dr. V. S. R. Murthy';

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const { error } = await supabase
        .from('jury_evaluations')
        .upsert({
          jury_id: juryId,
          jury_name: juryName,
          team_id: team.team_id,
          innovation_score: innovationScore,
          relevance_score: relevanceScore,
          technical_score: technicalScore,
          presentation_score: presentationScore,
          qa_score: qaScore,
          total_score: totalScore,
          comments: comments,
          submitted_at: new Date().toISOString()
        }, { onConflict: 'jury_id,team_id' });

      if (error) throw error;

      // Update local storage representation
      HackathonStateManager.submitEvaluation({
        jury_id: juryId,
        jury_name: juryName,
        team_id: team.team_id,
        innovation_score: innovationScore,
        relevance_score: relevanceScore,
        technical_score: technicalScore,
        presentation_score: presentationScore,
        qa_score: qaScore,
        total_score: totalScore,
        comments: comments
      });

      setIsSubmitModalOpen(false);
      setSuccessSubmitted(true);
      await HackathonStateManager.checkTeamEvaluationCompletion(team.team_id);
    } catch (err: any) {
      console.error('Error saving evaluation:', err);
      setErrorMsg(err.message || 'Failed to submit evaluation to the database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCriterionBlock = (
    title: string,
    score: number,
    setter: React.Dispatch<React.SetStateAction<number>>
  ) => (
    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <label className="text-xs font-bold text-slate-900">{title} (Max: 20)</label>
        
        {/* Quick Score Buttons (§22) */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400 font-semibold mr-1">Quick Select:</span>
          {[5, 10, 15, 20].map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => setter(val)}
              className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                score === val
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {val}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <span className="text-xs font-semibold text-slate-500">Custom Score:</span>
        <input
          type="number"
          min="0"
          max="20"
          value={score}
          onChange={(e) => handleScoreInput(setter, e.target.value)}
          className="w-20 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-extrabold text-slate-900 text-center focus:ring-2 focus:ring-emerald-500"
        />
        <span className="text-xs text-slate-400 font-bold">/ 20</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/jury/dashboard')}
          className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Assigned Roster
        </button>
        <span className="text-xs font-extrabold text-brand-700 bg-brand-50 border border-brand-100 px-3 py-1 rounded-full">
          {team.team_id}
        </span>
      </div>

      {/* Team Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Evaluation Form</span>
          <h1 className="text-2xl font-extrabold text-slate-900">{team.team_name}</h1>
          <p className="text-xs text-slate-500 mt-1">
            PS: <strong className="text-slate-800">{team.selected_problem_statements[0]?.problem_id}</strong> — {team.selected_problem_statements[0]?.problem_title}
          </p>
        </div>

        {team.ppt_submission ? (
          <button
            onClick={() => setIsPreviewOpen(true)}
            className="px-4 py-2.5 bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold text-xs rounded-xl border border-brand-200 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Eye className="w-4 h-4 text-brand-600" /> Open PPT Presentation Preview
          </button>
        ) : (
          <span className="text-xs text-amber-700 font-semibold bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
            No PPT Uploaded
          </span>
        )}
      </div>

      {errorMsg && (
        <div className="bg-rose-50 text-rose-700 text-xs p-4 rounded-xl border border-rose-200 font-bold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-600" /> {errorMsg}
        </div>
      )}

      {successSubmitted && (
        <div className="bg-emerald-50 text-emerald-800 text-xs p-4 rounded-xl border border-emerald-200 font-bold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Evaluation Submitted Successfully to Admin Coordinators!
        </div>
      )}

      {/* Evaluation Rubric Form (§21) */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
        
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-600" /> 100-Mark Scoring Rubric
          </h2>

          <div className="text-right">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Calculated Total Score</div>
            <div className="text-2xl font-extrabold text-emerald-600">{totalScore} / 100</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderCriterionBlock("1. Innovation & Novelty (Idea / Approach)", innovationScore, setInnovationScore)}
          {renderCriterionBlock("2. Relevance to Problem Statement (PPT Design & Focus)", relevanceScore, setRelevanceScore)}
          {renderCriterionBlock("3. Technical Feasibility & Project Impact", technicalScore, setTechnicalScore)}
          {renderCriterionBlock("4. Presentation Skills (Pitching)", presentationScore, setPresentationScore)}
          <div className="md:col-span-2">
            {renderCriterionBlock("5. Q&A Responses", qaScore, setQaScore)}
          </div>
        </div>

        {/* Comments Field (§23) */}
        <div className="pt-2">
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Jury Comments & Constructive Remarks (Optional)</label>
          <textarea
            rows={3}
            placeholder="Add detailed feedback regarding technical feasibility, pitch delivery, or hardware calibration..."
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100">
          <button
            onClick={() => setIsSubmitModalOpen(true)}
            className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition-all hover:scale-105 flex items-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" /> Review & Submit Evaluation
          </button>
        </div>

      </div>

      {/* Review Submission Modal (§25) */}
      {isSubmitModalOpen && (
        <Modal
          isOpen={isSubmitModalOpen}
          onClose={() => setIsSubmitModalOpen(false)}
          title="Confirm Evaluation Submission"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600">Please review your allocated scores before final submission:</p>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between"><span>Innovation & Novelty:</span> <strong className="text-slate-900">{innovationScore} / 20</strong></div>
              <div className="flex justify-between"><span>Relevance to PS:</span> <strong className="text-slate-900">{relevanceScore} / 20</strong></div>
              <div className="flex justify-between"><span>Technical Feasibility:</span> <strong className="text-slate-900">{technicalScore} / 20</strong></div>
              <div className="flex justify-between"><span>Presentation Skills:</span> <strong className="text-slate-900">{presentationScore} / 20</strong></div>
              <div className="flex justify-between"><span>Q&A Responses:</span> <strong className="text-slate-900">{qaScore} / 20</strong></div>
              <div className="flex justify-between pt-2 border-t border-slate-200 font-extrabold text-sm text-emerald-700">
                <span>TOTAL SCORE:</span>
                <span>{totalScore} / 100</span>
              </div>
            </div>

            {comments && (
              <div className="italic text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                "{comments}"
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3">
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
              >
                Back to Editing
              </button>
              <button
                onClick={handleSubmitEvaluation}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow"
              >
                Confirm & Submit Evaluation
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* In-App PPT Viewer Modal */}
      {isPreviewOpen && team.ppt_submission && (() => {
        const fileUrl = team.ppt_submission.file_url || supabase.storage.from('SIH-Presentation').getPublicUrl(team.ppt_submission.file_path).data.publicUrl;
        return (
          <Modal
            isOpen={isPreviewOpen}
            onClose={() => setIsPreviewOpen(false)}
            title={`Presentation Deck — ${team.team_id}`}
            maxWidth="4xl"
          >
            <div className="space-y-4">
              <div className="w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950 min-h-[500px]">
                <iframe
                  src={
                    team.ppt_submission.file_name.toLowerCase().endsWith('.pdf')
                      ? fileUrl
                      : `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`
                  }
                  className="w-full h-[500px] border-0"
                  allowFullScreen
                />
              </div>
              <div className="flex justify-end">
                <button onClick={() => setIsPreviewOpen(false)} className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl">
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
