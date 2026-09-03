'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { ShieldCheck, AlertTriangle, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { FieldDiff } from '@/app/api/team/edit/route';

interface EditDiffConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  diffs: FieldDiff[];
  isSubmitting: boolean;
}

export function EditDiffConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  diffs,
  isSubmitting
}: EditDiffConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Registration Edits"
      maxWidth="2xl"
    >
      <div className="space-y-5">
        
        {/* Safety Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed font-medium">
            <strong className="font-extrabold block text-amber-950 mb-0.5">
              Data Preservation Guarantee
            </strong>
            Are you sure you want to update these registration details? Only the changed information will be updated. Your existing team data will remain safe and unchanged unless specifically edited.
          </div>
        </div>

        {/* Diff Table */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-brand-600" /> Summary of Changes ({diffs.length} Field{diffs.length === 1 ? '' : 's'} Modified)
          </h4>

          {diffs.length === 0 ? (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 text-center font-medium">
              No fields were modified.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/80 sticky top-0 border-b border-slate-200 text-slate-700 font-bold">
                  <tr>
                    <th className="py-2.5 px-3">Field Name</th>
                    <th className="py-2.5 px-3">Previous Value</th>
                    <th className="py-2.5 px-3">New Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {diffs.map((diff, index) => (
                    <tr key={index} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-bold text-slate-800 break-words max-w-[150px]">
                        {diff.field}
                      </td>
                      <td className="py-2.5 px-3 text-rose-600 font-medium line-through break-words max-w-[180px]">
                        {diff.oldValue || <span className="no-underline italic text-slate-400">(Empty)</span>}
                      </td>
                      <td className="py-2.5 px-3 text-emerald-700 font-bold break-words max-w-[180px]">
                        {diff.newValue}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-end gap-2.5 pt-4 border-t border-slate-100">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel / Keep Editing
          </button>

          <button
            type="button"
            disabled={isSubmitting || diffs.length === 0}
            onClick={onConfirm}
            className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow transition-all hover:scale-105 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:hover:scale-100"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving Changes...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" /> Confirm & Save Edits
              </>
            )}
          </button>
        </div>

      </div>
    </Modal>
  );
}
