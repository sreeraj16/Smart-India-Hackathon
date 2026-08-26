'use client';

import React, { useState, useEffect } from 'react';
import { HackathonStateManager } from '@/lib/store/stateManager';
import { Team, PPTSubmission } from '@/lib/types';
import { FileCheck, Upload, Eye, RefreshCw, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

export default function PresentationPage() {
  const [team, setTeam] = useState<Team | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const user = HackathonStateManager.getCurrentUser();
    const loadedTeam = HackathonStateManager.getTeamById(user?.team_id || 'SIH-2026-1001');
    setTeam(loadedTeam || null);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setErrorMsg('');
    setSuccessMsg('');

    if (!file) return;

    const validTypes = [
      'application/pdf',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];

    if (!validTypes.includes(file.type) && !file.name.match(/\.(pdf|ppt|pptx)$/i)) {
      setErrorMsg('Invalid file type! Please upload a PPT, PPTX, or PDF presentation file.');
      setSelectedFile(null);
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setErrorMsg('File size exceeds maximum allowed limit of 20 MB.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !team) return;

    setUploading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // Sanitize the filename to prevent invalid key errors on Supabase storage (replaces spaces, parentheses, en-dashes, etc. with underscores)
      const cleanFileName = selectedFile.name
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .replace(/_+/g, '_');
      const filePath = `${team.team_id}/${cleanFileName}`;

      // 1. Upload file to Supabase Storage bucket 'SIH-Presentation'
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('SIH-Presentation')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Storage upload error: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('SIH-Presentation')
        .getPublicUrl(filePath);

      const fileUrl = urlData?.publicUrl || '';

      const submission: PPTSubmission = {
        ppt_id: `ppt-${Date.now()}`,
        team_id: team.team_id,
        file_name: selectedFile.name,
        file_path: filePath,
        file_url: fileUrl,
        file_size: `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`,
        status: 'Uploaded',
        uploaded_at: new Date().toISOString()
      };

      // 2. Ensure the team exists in the Supabase database (auto-sync for teams registered before DB integration)
      const { data: existingTeam } = await supabase
        .from('teams')
        .select('team_id')
        .eq('team_id', team.team_id)
        .maybeSingle();

      if (!existingTeam) {
        const { error: teamSyncError } = await supabase
          .from('teams')
          .insert({
            team_id: team.team_id,
            team_name: team.team_name,
            registration_status: team.registration_status || 'registered'
          });

        if (teamSyncError) {
          throw new Error(`Team auto-sync error: ${teamSyncError.message}`);
        }

        // Auto-sync members
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

        // Auto-sync selected problem statements
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
      }

      // 3. Insert/Upsert into Supabase Database 'ppt_submissions' table
      const { error: dbError } = await supabase
        .from('ppt_submissions')
        .upsert({
          team_id: team.team_id,
          file_name: selectedFile.name,
          file_path: filePath,
          status: 'Uploaded',
          uploaded_at: submission.uploaded_at
        }, { onConflict: 'team_id' });

      if (dbError) {
        throw new Error(`Database record save error: ${dbError.message}`);
      }

      HackathonStateManager.addPPTSubmission(team.team_id, submission);
      setTeam({ ...team, ppt_submission: submission });
      setSuccessMsg('Presentation file uploaded successfully to Supabase Storage!');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred during file upload.');
    } finally {
      setUploading(false);
      setSelectedFile(null);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200">
        <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <FileCheck className="w-6 h-6 text-brand-600" /> PPT / Presentation Upload
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Prepare your presentation deck in your preferred offline tool (PowerPoint, Keynote, Canva) and upload the final .PPT, .PPTX, or .PDF file before your presentation session.
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

      {/* Upload Box */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
        
        {team?.ppt_submission ? (
          /* Existing Submission Details */
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> File Verified & Uploaded
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Uploaded: {new Date(team.ppt_submission.uploaded_at).toLocaleString()}
              </span>
            </div>

            <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200">
              <div className="w-12 h-12 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold">
                <FileText className="w-6 h-6" />
              </div>
              <div className="flex-1 truncate">
                <div className="text-sm font-bold text-slate-900 truncate">{team.ppt_submission.file_name}</div>
                <div className="text-xs text-slate-500">{team.ppt_submission.file_size || '3.4 MB'} • Supabase Bucket: `SIH-Presentation`</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={() => {
                  if (team.ppt_submission?.file_url) {
                    window.open(team.ppt_submission.file_url, '_blank');
                  } else {
                    alert(`Opening preview for ${team.ppt_submission?.file_name}`);
                  }
                }}
                className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-4 h-4" /> View File Preview
              </button>

              <label className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer">
                <RefreshCw className="w-4 h-4" /> Replace File
                <input type="file" accept=".pdf,.ppt,.pptx" onChange={handleFileChange} className="hidden" />
              </label>
            </div>
          </div>
        ) : (
          /* Initial Upload Drag Drop Area */
          <div className="border-2 border-dashed border-slate-300 hover:border-brand-500 bg-slate-50/50 rounded-2xl p-8 text-center transition-all">
            <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900 mb-1">Upload Presentation File</h3>
            <p className="text-xs text-slate-500 mb-4">Supported formats: .PPT, .PPTX, .PDF (Max file size: 20 MB)</p>

            <label className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-5 py-3 rounded-xl shadow transition-all cursor-pointer">
              Choose File
              <input type="file" accept=".pdf,.ppt,.pptx" onChange={handleFileChange} className="hidden" />
            </label>

            {selectedFile && (
              <div className="mt-4 text-xs font-bold text-brand-700 bg-brand-50 p-3 rounded-xl border border-brand-200 max-w-sm mx-auto">
                Selected: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(1)} MB)
              </div>
            )}
          </div>
        )}

        {selectedFile && (
          <div className="flex justify-end pt-2">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {uploading ? 'Uploading to Supabase Storage...' : 'Upload Presentation Deck'}
            </button>
          </div>
        )}

      </div>

    </div>
  );
}
