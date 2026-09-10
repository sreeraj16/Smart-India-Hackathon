'use client';

import React, { useState, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { HackathonStateManager } from '@/lib/store/stateManager';
import { parseTop50Excel, downloadTop50SampleTemplate, ParsedTop50Team } from '@/lib/utils/top50ImportUtils';
import { Upload, FileSpreadsheet, Download, CheckCircle2, AlertCircle, Loader2, Users, Layers, Trash2 } from 'lucide-react';

interface Top50UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminEmail?: string;
  onSuccess?: (count: number) => void;
}

export default function Top50UploadModal({
  isOpen,
  onClose,
  adminEmail = 'vasuch9959@rguktn.ac.in',
  onSuccess
}: Top50UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parsedTeams, setParsedTeams] = useState<ParsedTop50Team[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [replaceExisting, setReplaceExisting] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setFile(null);
    setParsing(false);
    setSaving(false);
    setParsedTeams([]);
    setErrorMsg('');
    setSuccessMsg('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setErrorMsg('');
    setSuccessMsg('');
    setFile(selectedFile);
    setParsing(true);

    try {
      const teams = await parseTop50Excel(selectedFile);
      setParsedTeams(teams);
    } catch (err: any) {
      console.error('Excel parse error:', err);
      setErrorMsg(err.message || 'Failed to read spreadsheet. Please check the format.');
      setParsedTeams([]);
    } finally {
      setParsing(false);
    }
  };

  const handleConfirmUpload = async () => {
    if (parsedTeams.length === 0) {
      setErrorMsg('No teams detected in spreadsheet to import.');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      const result = await HackathonStateManager.importTop50TeamsFromExcel(
        parsedTeams,
        replaceExisting,
        adminEmail
      );

      if (result.success) {
        setSuccessMsg(`Successfully imported ${result.count} selected teams! Results are now live on the home page.`);
        if (onSuccess) onSuccess(result.count);
        setTimeout(() => {
          handleClose();
        }, 1200);
      } else {
        setErrorMsg(result.error || 'Failed to save imported teams.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Upload Top 50 Selected Teams Excel"
      maxWidth="4xl"
    >
      <div className="space-y-6">
        
        {/* Admin Header Banner */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-200/70 px-2.5 py-0.5 rounded-full">
              Admin Portal • vasuch9959@rguktn.ac.in
            </span>
            <h4 className="text-sm font-extrabold text-slate-900 mt-1">
              Publish Official Selection List
            </h4>
            <p className="text-xs text-slate-600 mt-0.5">
              Upload an Excel (.xlsx / .xls) or CSV sheet. Teams will be displayed without ranking on the home page.
            </p>
          </div>
          <button
            type="button"
            onClick={downloadTop50SampleTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-900 bg-white border border-amber-300 hover:bg-amber-100 rounded-xl shadow-sm transition-all shrink-0 self-start sm:self-auto cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-amber-700" />
            Download Sample Template
          </button>
        </div>

        {/* Upload Dropzone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 hover:border-brand-500 bg-slate-50/70 hover:bg-brand-50/30 rounded-2xl p-6 text-center cursor-pointer transition-all"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center mx-auto mb-3 text-brand-600">
            {parsing ? (
              <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
            ) : (
              <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
            )}
          </div>
          <div className="text-sm font-bold text-slate-800">
            {file ? file.name : 'Click to select Excel spreadsheet (.xlsx, .xls, .csv)'}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Accepts sheets containing Team Name, Team Lead Name, PS ID, Problem Title, Category, etc.
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs font-medium">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-emerald-800 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Parsed Teams Preview */}
        {parsedTeams.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-brand-600" />
                Detected <span className="text-brand-600 font-extrabold">{parsedTeams.length} Teams</span> in File
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={replaceExisting}
                  onChange={e => setReplaceExisting(e.target.checked)}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                Replace previous selection list
              </label>
            </div>

            <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl overflow-hidden shadow-inner">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Team Name</th>
                    <th className="py-2.5 px-3">Team Lead</th>
                    <th className="py-2.5 px-3">Problem Statement</th>
                    <th className="py-2.5 px-3">Category</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {parsedTeams.map((t, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                      <td className="py-2 px-3 font-bold text-slate-900">{t.team_name}</td>
                      <td className="py-2 px-3 text-slate-700 font-medium">{t.team_lead_name || '—'}</td>
                      <td className="py-2 px-3 text-slate-600">
                        <span className="font-semibold text-brand-700 mr-1">{t.problem_id}</span>
                        {t.problem_title}
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {t.category || 'Software'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmUpload}
            disabled={saving || parsedTeams.length === 0}
            className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                Publishing Results...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 text-white" />
                Confirm & Publish {parsedTeams.length > 0 ? `(${parsedTeams.length} Teams)` : ''}
              </>
            )}
          </button>
        </div>

      </div>
    </Modal>
  );
}
