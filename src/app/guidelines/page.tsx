'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, UserCheck, Heart, Home, AlertCircle, Award, FileText, ArrowRight } from 'lucide-react';

export default function GuidelinesPage() {
  const [agreed, setAgreed] = useState(true);
  const router = useRouter();

  return (
    <div className="py-16 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Title Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-brand-100 text-brand-700 px-3 py-1 rounded-full text-xs font-semibold mb-3">
            <ShieldCheck className="w-4 h-4" /> SIH Internal Hackathon 2026
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Team Registration Rules
          </h1>
          <p className="text-slate-600 text-sm mt-2 max-w-xl mx-auto">
            Please read and verify all rules and requirements for your team registration carefully before proceeding.
          </p>
        </div>

        <div className="space-y-6">
          
          {/* Rules List Container */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 divide-y divide-slate-100">
            
            {/* Rule 1 */}
            <div className="py-4 flex gap-4 items-start">
              <span className="p-2 bg-brand-50 text-brand-600 rounded-xl shrink-0">
                <UserCheck className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Team Size Requirement</h3>
                <p className="text-slate-600 text-xs mt-1">Each team must consist of exactly 6 student members, including the designated Team Leader.</p>
              </div>
            </div>

            {/* Rule 2 */}
            <div className="py-4 flex gap-4 items-start">
              <span className="p-2 bg-rose-50 text-rose-600 rounded-xl shrink-0">
                <Heart className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Gender Inclusivity Rule</h3>
                <p className="text-slate-600 text-xs mt-1">At least 1 female student must be part of every team (Mandatory validation).</p>
              </div>
            </div>

            {/* Rule 3 */}
            <div className="py-4 flex gap-4 items-start">
              <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
                <Home className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Institutional Affiliation</h3>
                <p className="text-slate-600 text-xs mt-1">All team members must belong to the same college/institute. Inter-college teams are strictly not allowed.</p>
              </div>
            </div>

            {/* Rule 4 */}
            <div className="py-4 flex gap-4 items-start">
              <span className="p-2 bg-amber-50 text-amber-600 rounded-xl shrink-0">
                <AlertCircle className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Single Participation Limit</h3>
                <p className="text-slate-600 text-xs mt-1">Each student can be part of only one team. Duplicate registrations will lead to disqualification.</p>
              </div>
            </div>

            {/* Rule 5 */}
            <div className="py-4 flex gap-4 items-start">
              <span className="p-2 bg-teal-50 text-teal-600 rounded-xl shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Designated Team Leader</h3>
                <p className="text-slate-600 text-xs mt-1">Every team must have a designated Team Leader responsible for credentials and slide uploads.</p>
              </div>
            </div>

            {/* Rule 6 */}
            <div className="py-4 flex gap-4 items-start">
              <span className="p-2 bg-purple-50 text-purple-600 rounded-xl shrink-0">
                <Award className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Unique Team Identifier</h3>
                <p className="text-slate-600 text-xs mt-1">The team name must be completely unique and must end exactly with the suffix <code>_RGUKTN</code>.</p>
              </div>
            </div>

            {/* Rule 7 */}
            <div className="py-4 flex gap-4 items-start">
              <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
                <FileText className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Project Categories</h3>
                <p className="text-slate-600 text-xs mt-1">Teams may participate in either the Software or Hardware category.</p>
                <ul className="text-slate-500 text-[11px] mt-1 list-disc list-inside leading-snug">
                  <li><strong>Software:</strong> Teams should possess appropriate programming & technical development skills.</li>
                  <li><strong>Hardware:</strong> Multidisciplinary teams are encouraged (Mechanical, Electronics, Product Design, Programming, etc.).</li>
                </ul>
              </div>
            </div>

            {/* Rule 8 */}
            <div className="py-4 flex gap-4 items-start">
              <span className="p-2 bg-sky-50 text-sky-600 rounded-xl shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">SIH Nomination Eligibility</h3>
                <p className="text-slate-600 text-xs mt-1">Only teams that participate in and are selected through the Internal Hackathon will be eligible for subsequent official SIH nomination.</p>
              </div>
            </div>

            {/* Rule 9 */}
            <div className="py-4 flex gap-4 items-start">
              <span className="p-2 bg-pink-50 text-pink-600 rounded-xl shrink-0">
                <UserCheck className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Accurate Registration Details</h3>
                <p className="text-slate-600 text-xs mt-1">Team members must provide accurate details required for registration, including name, gender, college email ID (@rguktn.ac.in), and mobile number.</p>
              </div>
            </div>

            {/* Rule 10 */}
            <div className="py-4 flex gap-4 items-start">
              <span className="p-2 bg-cyan-50 text-cyan-600 rounded-xl shrink-0">
                <FileText className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Problem Statement & Innovation Idea</h3>
                <p className="text-slate-600 text-xs mt-1">The team should register with a clear problem statement / innovation idea copy-pasted directly from sih.gov.in for evaluation during the Internal Hackathon.</p>
              </div>
            </div>

          </div>

          {/* Agreement Gate */}
          <div className="bg-brand-50 border border-brand-200 rounded-3xl p-6 sm:p-8 shadow-sm">
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

            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-brand-200/60 pt-4">
              <div className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-4 py-2 rounded-xl">
                Notice: Team Registration is permanently closed for new entries.
              </div>
              <Link
                href="/register"
                className="px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                View Registration Status <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
