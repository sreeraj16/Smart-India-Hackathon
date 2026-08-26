'use client';

import React, { useState, useEffect, useRef } from 'react';
import { HackathonStateManager } from '@/lib/store/stateManager';
import { Team, PresentationSession } from '@/lib/types';
import { playBuzzerSound } from '@/components/ui/BuzzerSound';
import { Clock, Play, Pause, RotateCcw, Volume2, VolumeX, Maximize2, ShieldAlert, CheckCircle2, FileText } from 'lucide-react';

export default function AdminPresentationControlPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('SIH-2026-1001');
  const [assignedDurationSeconds, setAssignedDurationSeconds] = useState<number>(240); // 4 mins
  const [customMinutesInput, setCustomMinutesInput] = useState<string>('4');

  const [session, setSession] = useState<PresentationSession | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(240);
  const [buzzerEnabled, setBuzzerEnabled] = useState<boolean>(true);
  const [isTimeUp, setIsTimeUp] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const loadedTeams = HackathonStateManager.getTeams();
    setTeams(loadedTeams);
    if (loadedTeams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(loadedTeams[0].team_id);
    }
  }, []);

  useEffect(() => {
    if (!selectedTeamId) return;
    const sess = HackathonStateManager.getSessionForTeam(selectedTeamId);
    setSession(sess);
    setAssignedDurationSeconds(sess.assigned_duration);
    
    // Calculate remaining seconds
    if (sess.status === 'ongoing' && sess.start_time) {
      const elapsed = Math.floor((Date.now() - new Date(sess.start_time).getTime()) / 1000);
      const rem = Math.max(0, sess.assigned_duration - elapsed);
      setTimeLeft(rem);
      if (rem === 0) setIsTimeUp(true);
    } else {
      setTimeLeft(sess.assigned_duration);
      setIsTimeUp(sess.status === 'completed');
    }
  }, [selectedTeamId]);

  // Timer Ticker Loop
  useEffect(() => {
    if (session?.status === 'ongoing') {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current as NodeJS.Timeout);
            setIsTimeUp(true);
            
            if (buzzerEnabled) playBuzzerSound();

            const completedSession: PresentationSession = {
              ...session,
              status: 'completed',
              end_time: new Date().toISOString(),
              buzzer_triggered: true
            };
            HackathonStateManager.updateSession(completedSession);
            setSession(completedSession);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session?.status, buzzerEnabled]);

  const activeTeam = teams.find(t => t.team_id === selectedTeamId);

  const handleStart = () => {
    if (!session) return;
    setIsTimeUp(false);
    const updated: PresentationSession = {
      ...session,
      assigned_duration: assignedDurationSeconds,
      start_time: new Date().toISOString(),
      status: 'ongoing'
    };
    HackathonStateManager.updateSession(updated);
    setSession(updated);
  };

  const handlePause = () => {
    if (!session) return;
    const updated: PresentationSession = {
      ...session,
      status: 'paused'
    };
    HackathonStateManager.updateSession(updated);
    setSession(updated);
  };

  const handleResume = () => {
    if (!session) return;
    const updated: PresentationSession = {
      ...session,
      status: 'ongoing'
    };
    HackathonStateManager.updateSession(updated);
    setSession(updated);
  };

  const handleRestart = () => {
    setIsTimeUp(false);
    setTimeLeft(assignedDurationSeconds);
    if (!session) return;
    const updated: PresentationSession = {
      ...session,
      assigned_duration: assignedDurationSeconds,
      start_time: null,
      status: 'scheduled',
      buzzer_triggered: false
    };
    HackathonStateManager.updateSession(updated);
    setSession(updated);
  };

  const handleEnd = () => {
    setIsTimeUp(true);
    setTimeLeft(0);
    if (buzzerEnabled) playBuzzerSound();
    if (!session) return;
    const updated: PresentationSession = {
      ...session,
      status: 'completed',
      end_time: new Date().toISOString(),
      buzzer_triggered: true
    };
    HackathonStateManager.updateSession(updated);
    setSession(updated);
  };

  const handleDurationChange = (seconds: number) => {
    setAssignedDurationSeconds(seconds);
    setTimeLeft(seconds);
    if (session) {
      const updated = { ...session, assigned_duration: seconds };
      HackathonStateManager.updateSession(updated);
      setSession(updated);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Color Coding: Green -> Yellow (<60s) -> Red (<30s)
  const getTimerColorClass = () => {
    if (isTimeUp) return 'text-rose-600 animate-pulse';
    if (timeLeft <= 30) return 'text-rose-600 animate-timer-warning';
    if (timeLeft <= 60) return 'text-amber-500';
    return 'text-emerald-500';
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">Live Presentation Control</div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-purple-600" /> Presentation Timer & Audio Buzzer
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Server-synchronized countdown clock broadcast via Supabase Realtime to Admin and Jury consoles.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => playBuzzerSound()}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5"
            title="Test Audio Buzzer"
          >
            <Volume2 className="w-4 h-4 text-purple-600" /> Test Buzzer
          </button>

          <button
            onClick={() => setBuzzerEnabled(!buzzerEnabled)}
            className={`px-3.5 py-2 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors ${
              buzzerEnabled ? 'bg-purple-100 text-purple-800' : 'bg-slate-200 text-slate-500'
            }`}
          >
            {buzzerEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            Buzzer {buzzerEnabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>
      </div>

      {/* Select Team & Duration Configuration Bar */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Select Presenting Team ID</label>
          <select
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-brand-700"
          >
            {teams.map(t => (
              <option key={t.team_id} value={t.team_id}>
                {t.team_id} — {t.team_name} ({t.selected_problem_statements[0]?.problem_id || 'N/A'})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Configure Presentation Duration</label>
          <div className="flex flex-wrap gap-2">
            {[
              { label: '2 Mins', secs: 120 },
              { label: '3 Mins', secs: 180 },
              { label: '4 Mins (Default)', secs: 240 },
              { label: '5 Mins', secs: 300 },
            ].map((dur) => (
              <button
                key={dur.secs}
                onClick={() => handleDurationChange(dur.secs)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  assignedDurationSeconds === dur.secs
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {dur.label}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Synchronized Realtime Presentation Mode Screen */}
      <div className="bg-slate-950 rounded-3xl p-8 sm:p-12 text-white border border-slate-800 shadow-2xl space-y-8">
        
        {/* Top Info Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-6">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-400 bg-indigo-950/80 px-3 py-1 rounded-full border border-indigo-800/80">
              {activeTeam?.team_id || 'SIH-2026-1001'}
            </span>
            <h2 className="text-2xl font-extrabold text-white mt-2">{activeTeam?.team_name}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              PS: {activeTeam?.selected_problem_statements[0]?.problem_title || 'Traffic Management System'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
              session?.status === 'ongoing' ? 'bg-emerald-950 text-emerald-400 border-emerald-800' :
              session?.status === 'paused' ? 'bg-amber-950 text-amber-400 border-amber-800' :
              session?.status === 'completed' ? 'bg-rose-950 text-rose-400 border-rose-800' :
              'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              Session: {session?.status}
            </span>
          </div>
        </div>

        {/* Large Timer Countdown */}
        <div className="text-center py-6">
          {isTimeUp && (
            <div className="mb-4 inline-flex items-center gap-2 bg-rose-600 text-white px-6 py-2 rounded-full font-black text-lg tracking-widest animate-bounce shadow-lg">
              <ShieldAlert className="w-6 h-6" /> TIME UP
            </div>
          )}

          <div className={`text-7xl sm:text-9xl font-black font-mono tracking-wider ${getTimerColorClass()}`}>
            {formatTime(timeLeft)}
          </div>
          
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-widest mt-4">
            Assigned Duration: {assignedDurationSeconds / 60} Minutes
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4 border-t border-slate-800">
          
          {session?.status !== 'ongoing' && (
            <button
              onClick={session?.status === 'paused' ? handleResume : handleStart}
              className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-2xl shadow-lg transition-all hover:scale-105 flex items-center gap-2 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" /> {session?.status === 'paused' ? 'Resume Session' : 'Start Presentation'}
            </button>
          )}

          {session?.status === 'ongoing' && (
            <button
              onClick={handlePause}
              className="px-8 py-3.5 bg-amber-600 hover:bg-amber-500 text-white font-black text-sm rounded-2xl shadow-lg transition-all hover:scale-105 flex items-center gap-2 cursor-pointer"
            >
              <Pause className="w-5 h-5 fill-current" /> Pause Timer
            </button>
          )}

          <button
            onClick={handleRestart}
            className="px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-2xl transition-all flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" /> Reset Timer
          </button>

          <button
            onClick={handleEnd}
            disabled={session?.status === 'completed'}
            className="px-6 py-3.5 bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs rounded-2xl transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            End Presentation Session
          </button>

        </div>

      </div>

    </div>
  );
}
