'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { HackathonStateManager } from '@/lib/store/stateManager';
import { ProblemStatement } from '@/lib/types';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Search, Filter, Cpu, Layers, Info, CheckCircle2, Plus } from 'lucide-react';

export default function ProblemStatementsPage() {
  const [statements, setStatements] = useState<ProblemStatement[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedPS, setSelectedPS] = useState<ProblemStatement | null>(null);

  useEffect(() => {
    const loadStatements = () => {
      setStatements(HackathonStateManager.getProblemStatements());
    };
    loadStatements();

    window.addEventListener('sih_teams_updated', loadStatements);
    return () => window.removeEventListener('sih_teams_updated', loadStatements);
  }, []);

  const filteredStatements = statements.filter(ps => {
    const matchesSearch = ps.problem_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          ps.problem_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          ps.domain.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'All' || ps.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="py-12 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Title Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200 text-brand-800 px-3 py-1 rounded-full text-xs font-semibold mb-3">
            <Layers className="w-4 h-4 text-brand-600" /> Live Team Submitted Directory
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Problem Statements
          </h1>
          <p className="text-slate-600 text-sm mt-2">
            Dynamic repository displaying custom Problem Statements entered directly by Team Leads during registration and managed via their dashboards.
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Search Box */}
          <div className="relative w-full sm:w-96">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by ID, title, or domain..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {['All', 'Software', 'Hardware'].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat} {cat === 'All' ? `(${statements.length})` : `(${statements.filter(s => s.category === cat).length})`}
              </button>
            ))}
          </div>

        </div>

        {/* Grid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredStatements.map((ps) => (
            <div
              key={ps.problem_id}
              className="bg-white border border-slate-200 hover:border-brand-300 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-extrabold text-brand-700 text-sm bg-brand-50 border border-brand-100 px-3 py-1 rounded-lg">
                    {ps.problem_id}
                  </span>
                  <Badge variant={ps.category === 'Software' ? 'blue' : 'purple'}>
                    {ps.category}
                  </Badge>
                </div>

                <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-brand-600 transition-colors leading-snug">
                  {ps.problem_title}
                </h3>

                <p className="text-xs font-semibold text-slate-500 mb-4 flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5 text-brand-600" /> {ps.domain}
                </p>

                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed mb-6">
                  {ps.description}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => setSelectedPS(ps)}
                  className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                >
                  <Info className="w-4 h-4" /> View Details
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredStatements.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-lg mx-auto p-8 space-y-4">
            <div className="w-14 h-14 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mx-auto">
              <Layers className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">No Problem Statements Submitted Yet</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Problem Statements are entered directly by Team Leads during team registration. Once a team registers and inputs their custom Problem Statement ID and Description, it will automatically appear here in real time!
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/guidelines"
                className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow transition-all hover:scale-105"
              >
                <Plus className="w-4 h-4" /> Register Team & Enter Problem Statement
              </Link>
            </div>
          </div>
        )}

      </div>

      {/* Details Modal */}
      {selectedPS && (
        <Modal
          isOpen={!!selectedPS}
          onClose={() => setSelectedPS(null)}
          title={`Problem Statement Details — ${selectedPS.problem_id}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-brand-700 uppercase tracking-wider">{selectedPS.domain}</span>
              <Badge variant={selectedPS.category === 'Software' ? 'blue' : 'purple'}>{selectedPS.category}</Badge>
            </div>

            <h3 className="text-xl font-bold text-slate-900 leading-snug">{selectedPS.problem_title}</h3>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">Description</h4>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{selectedPS.description}</p>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setSelectedPS(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
