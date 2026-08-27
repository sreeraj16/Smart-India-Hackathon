'use client';

import React, { useState, useEffect } from 'react';
import { HackathonStateManager } from '@/lib/store/stateManager';
import { Team } from '@/lib/types';
import { FileCheck, ExternalLink, Link2, CheckCircle2, AlertCircle, Save, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

export default function PresentationPage() {
  const [team, setTeam] = useState<Team | null>(null);
  const [saving, setSaving] = useState(false);
  const [slidesUrl, setSlidesUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const user = HackathonStateManager.getCurrentUser();
    const loadedTeam = HackathonStateManager.getTeamById(user?.team_id || 'SIH-2026-1001');
    setTeam(loadedTeam || null);
    if (loadedTeam?.google_slides_url) {
      setSlidesUrl(loadedTeam.google_slides_url);
    }
  }, []);

  const validateGoogleSlidesLink = (url: string): boolean => {
    return url.trim().toLowerCase().startsWith('https://docs.google.com/presentation/');
  };

  const handleSaveLink = async () => {
    if (!team) return;
    setErrorMsg('');
    setSuccessMsg('');

    const cleanUrl = slidesUrl.trim();

    if (!cleanUrl) {
      setErrorMsg('Please enter a Google Slides URL.');
      return;
    }

    if (!validateGoogleSlidesLink(cleanUrl)) {
      setErrorMsg('Invalid URL! The link must be a valid Google Slides URL starting with "https://docs.google.com/presentation/".');
      return;
    }

    setSaving(true);
    try {
      // 1. Ensure the team row exists in the Supabase database
      const { data: existingTeam } = await supabase
        .from('teams')
        .select('team_id')
        .eq('team_id', team.team_id)
        .maybeSingle();

      if (!existingTeam) {
        // Auto-sync team metadata to Supabase
        await supabase
          .from('teams')
          .insert({
            team_id: team.team_id,
            team_name: team.team_name,
            registration_status: team.registration_status || 'registered',
            google_slides_url: cleanUrl
          });

        if (team.members && team.members.length > 0) {
          const memberInserts = team.members.map(m => ({
            team_id: team.team_id,
            name: m.name,
            roll_number: m.id_number,
            email: m.email,
            phone: m.phone,
            department: m.department,
            year: m.year,
            is_lead: !!m.is_lead
          }));
          await supabase.from('team_members').insert(memberInserts);
        }

        if (team.selected_problem_statements && team.selected_problem_statements.length > 0) {
          await supabase.from('problem_statements').upsert(
            team.selected_problem_statements.map(ps => ({
              problem_id: ps.problem_id,
              problem_title: ps.problem_title,
              description: ps.description || ps.problem_title,
              domain: ps.domain || 'General',
              category: ps.category || 'Software'
            }))
          );

          const mappingInserts = team.selected_problem_statements.map((ps, idx) => ({
            team_id: team.team_id,
            problem_id: ps.problem_id,
            selection_order: idx + 1
          }));
          await supabase.from('team_problem_statements').insert(mappingInserts);
        }
      } else {
        // Update link
        const { error } = await supabase
          .from('teams')
          .update({ google_slides_url: cleanUrl })
          .eq('team_id', team.team_id);

        if (error) throw error;
      }

      // Update state manager and local state
      const updatedTeam = { ...team, google_slides_url: cleanUrl };
      HackathonStateManager.updateTeam(updatedTeam);
      setTeam(updatedTeam);
      setSuccessMsg('Google Slides presentation link updated successfully!');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred while saving the link.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200">
        <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <FileCheck className="w-6 h-6 text-brand-600" /> Google Slides Presentation Link
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Provide your team's Google Slides presentation URL. Ensure that your slideshow sharing settings are configured correctly so coordinators and the jury panel can view it during screening.
        </p>
      </div>

      {/* Permissions Instruction Notice */}
      <div className="bg-amber-50 rounded-2xl p-6 border border-amber-200 shadow-sm space-y-2">
        <h3 className="text-xs font-black text-amber-900 uppercase tracking-wide flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600" /> Sharing Permissions Check Required
        </h3>
        <p className="text-xs text-amber-800 leading-relaxed font-medium">
          Make sure your Google Slides sharing settings are set to <strong>"Anyone with the link can view"</strong> (Viewer). If the slideshow requires specific domain access, coordinators and jury evaluators will not be able to load or review your presentation.
        </p>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 text-rose-700 text-xs p-4 rounded-xl border border-rose-200 font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 text-emerald-700 text-xs p-4 rounded-xl border border-emerald-200 font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {successMsg}
        </div>
      )}

      {/* URL Link Input Box */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
        
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700">Paste your Google Slides presentation URL</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link2 className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="url"
                placeholder="https://docs.google.com/presentation/d/.../edit?usp=sharing"
                value={slidesUrl}
                onChange={(e) => setSlidesUrl(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
              />
            </div>
            
            <button
              onClick={handleSaveLink}
              disabled={saving}
              className="px-5 py-3 bg-brand-650 hover:bg-brand-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 text-xs cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Link'}
            </button>
          </div>
        </div>

        {team?.google_slides_url && (
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200">
              <CheckCircle2 className="w-4 h-4" /> Presentation Link Configured
            </div>
            
            <button
              onClick={() => window.open(team.google_slides_url || '', '_blank')}
              className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" /> Open Presentation
            </button>
          </div>
        )}

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

      {/* Fallback Legacy Upload Details */}
      {team?.ppt_submission && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4" /> Legacy PowerPoint Upload Backup
          </div>
          <p className="text-[11px] text-slate-500 leading-normal">
            A PowerPoint upload was found from a previous submission. If you are migrating to Google Slides, please provide your link above; your legacy PowerPoint file is preserved below as an operational fallback.
          </p>
          <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="truncate flex-1">
              <div className="text-xs font-bold text-slate-700 truncate">{team.ppt_submission.file_name}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{team.ppt_submission.file_size} • Uploaded: {new Date(team.ppt_submission.uploaded_at).toLocaleDateString()}</div>
            </div>
            <button
              onClick={() => window.open(team.ppt_submission?.file_url || '', '_blank')}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-750 font-bold text-xs rounded-lg transition-colors cursor-pointer border border-slate-200"
            >
              Open Backup File
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
