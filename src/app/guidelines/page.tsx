'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Clock, Award, AlertTriangle, ArrowRight } from 'lucide-react';

export default function GuidelinesPage() {
  const [agreed, setAgreed] = useState(true);
  const router = useRouter();

  const handleContinue = () => {
    router.push('/register');
  };

  return (
    <div className="py-12 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Title Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-brand-100 text-brand-700 px-3 py-1 rounded-full text-xs font-semibold mb-3">
            <ShieldCheck className="w-4 h-4" /> Official Guidelines & Evaluation Rubric
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Participant Rules & Regulations — SIH 2026
          </h1>
          <p className="text-slate-600 text-sm mt-2">
            RGUKT Nuzvid Internal Hackathon Rules. Please review thoroughly before proceeding to team registration.
          </p>
        </div>

        <div className="space-y-8">
          
          {/* General Operational Guidelines */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-brand-600" /> Reporting & Presentation Schedule
            </h2>
            <ul className="space-y-3 text-sm text-slate-700 list-disc list-inside leading-relaxed">
              <li><strong>Reporting:</strong> All registered teams must report at least <strong>20 minutes prior</strong> to their allotted slot.</li>
              <li><strong>Presentation file:</strong> Teams must verify with venue coordinators that their presentation file (PPT/PPTX/PDF) is uploaded and ready before their slot.</li>
              <li><strong>Presentation & Q&A:</strong> Exactly <strong>4 minutes presentation/pitch</strong> + <strong>4 minutes Q&A</strong> per team.</li>
              <li><strong>Time limit:</strong> Exceeding the allotted presentation time is noted by the automated timer system and can lead to disqualification.</li>
              <li><strong>Attendance:</strong> The Team Leader must ensure team attendance is marked with venue coordinators before or after presenting.</li>
              <li><strong>Verification:</strong> The Jury panel verifies Team Name, Members, and Problem Statement against the official registered roster before each slot; a team not on the list, or not present on time, is disqualified immediately.</li>
            </ul>
          </div>

          {/* Evaluation Rubric Table */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-600" /> Evaluation Metrics (Total 100 Marks)
            </h2>
            <p className="text-slate-600 text-xs mb-4">
              Jury members evaluate each team strictly across five criteria, capped at 20 marks each:
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-900 font-bold">
                    <th className="py-3 px-4">Evaluation Criteria</th>
                    <th className="py-3 px-4 text-right">Max Marks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr>
                    <td className="py-3.5 px-4 font-medium">1. Innovation & Novelty (Idea / Approach)</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 text-right">20 Marks</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-4 font-medium">2. Relevance to Problem Statement (PPT Design & Focus)</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 text-right">20 Marks</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-4 font-medium">3. Technical Feasibility & Project Impact</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 text-right">20 Marks</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-4 font-medium">4. Presentation Skills (Pitching)</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 text-right">20 Marks</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-4 font-medium">5. Q&A Responses</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 text-right">20 Marks</td>
                  </tr>
                  <tr className="bg-brand-50/60 font-extrabold text-brand-900">
                    <td className="py-4 px-4 text-base">TOTAL SCORE</td>
                    <td className="py-4 px-4 text-base text-right text-brand-700">100 MARKS</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Code of Conduct */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" /> Code of Conduct
            </h2>
            <ul className="space-y-2.5 text-sm text-slate-700 list-disc list-inside">
              <li>Do not argue with Jury Members; their decision is final and binding.</li>
              <li>Maintain strict decorum and silence at the venue; do not disturb ongoing class sessions nearby.</li>
              <li>Only registered team members and chosen problem statements are permitted; mismatches cause immediate disqualification.</li>
              <li>Cooperate with student coordinators, jury members, and volunteers at all times.</li>
            </ul>
          </div>

          {/* Agreement Gate */}
          <div className="bg-brand-50 border border-brand-200 rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-start gap-4">
              <input
                type="checkbox"
                id="guidelines-agree"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 w-5 h-5 text-brand-600 border-slate-300 rounded focus:ring-brand-500 cursor-pointer"
              />
              <label htmlFor="guidelines-agree" className="text-sm font-semibold text-slate-800 cursor-pointer leading-snug">
                I have read and agree to all the guidelines, evaluation rules, and code of conduct of the SIH Internal Hackathon 2026.
              </label>
            </div>

            <div className="mt-6 flex justify-end">
              <Link
                href="/register"
                className="px-8 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm rounded-xl shadow-md transition-all hover:scale-105 flex items-center gap-2 cursor-pointer"
              >
                Continue to Registration <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
