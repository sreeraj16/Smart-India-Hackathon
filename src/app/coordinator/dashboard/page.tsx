'use client';

import React, { useState, useEffect, useRef } from 'react';
import { HackathonStateManager } from '@/lib/store/stateManager';
import { Team, UserProfile, PPTSubmission } from '@/lib/types';
import { createClient } from '@/utils/supabase/client';
import { exportCoordinatorTeamsToExcel } from '@/lib/export/exportUtils';
import { 
  Search, 
  Tv, 
  Clock, 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle, 
  Volume2, 
  VolumeX, 
  ExternalLink, 
  Maximize2,
  FileCheck,
  AlertTriangle,
  PlayCircle,
  FileSpreadsheet,
  Download
} from 'lucide-react';


export default function CoordinatorDashboard() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [panelFilter, setPanelFilter] = useState<string>('all');

  // Fullscreen presentation states
  const [isPresentationFullScreen, setIsPresentationFullScreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);

  // Compute displayed teams for the data table
  const getDisplayedTeams = () => {
    let list = teams;
    if (panelFilter !== 'all') {
      list = list.filter(t => (t.panel || 'Panel 1') === panelFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t =>
        t.team_id.toLowerCase().includes(q) ||
        t.team_name.toLowerCase().includes(q) ||
        t.team_lead_name.toLowerCase().includes(q) ||
        t.members?.some(m => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)) ||
        (t.panel && t.panel.toLowerCase().includes(q))
      );
    }
    return list;
  };

  const handleDownloadExcel = () => {
    const listToExport = getDisplayedTeams();
    exportCoordinatorTeamsToExcel(listToExport);
  };


  useEffect(() => {
    if (!isPresentationFullScreen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setCurrentPage(prev => prev + 1);
      } else if (e.key === 'ArrowLeft') {
        setCurrentPage(prev => Math.max(1, prev - 1));
      } else if (e.key === 'Escape') {
        setIsPresentationFullScreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPresentationFullScreen]);

  // Stats Counters
  const [totalPanelTeams, setTotalPanelTeams] = useState(0);
  const [completedPanelTeams, setCompletedPanelTeams] = useState(0);
  const [pendingPanelTeams, setPendingPanelTeams] = useState(0);

  // Timer States
  const [minutesInput, setMinutesInput] = useState('4');
  const [secondsInput, setSecondsInput] = useState('00');
  const [timeLeft, setTimeLeft] = useState(240); // in seconds
  const [timerActive, setTimerActive] = useState(false);
  const [timerSessionStart, setTimerSessionStart] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Buzzer States
  const [buzzerEnabled, setBuzzerEnabled] = useState(true);
  const [isBuzzerSounding, setIsBuzzerSounding] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const user = HackathonStateManager.getCurrentUser();
    setCurrentUser(user);

    // Initial load
    loadData();
  }, []);

  const loadData = async () => {
    // 1. Fetch teams
    const { data: dbTeams, error } = await supabase
      .from('teams')
      .select(`
        *,
        members:team_members(*),
        selected_problem_statements:team_problem_statements(
          problem_id,
          problem_statements(problem_title, description, domain, category)
        )
      `);

    // 2. Fetch ppt submissions
    const { data: dbPPTs } = await supabase
      .from('ppt_submissions')
      .select('*');

    let loadedTeams: Team[] = [];
    if (dbTeams && !error) {
      // Map formatting to match stateManager structure
      loadedTeams = dbTeams.map((t: any) => {
        const formattedPS = (t.selected_problem_statements || []).map((mapping: any) => ({
          problem_id: mapping.problem_id,
          problem_title: mapping.problem_statements?.problem_title || 'Unknown title',
          description: mapping.problem_statements?.description || '',
          domain: mapping.problem_statements?.domain || 'General',
          category: mapping.problem_statements?.category || 'Software'
        }));

        const ppt = dbPPTs?.find((p: any) => p.team_id === t.team_id);
        const ppt_submission: PPTSubmission | null = ppt ? {
          ppt_id: ppt.id || `ppt-${t.team_id}`,
          team_id: t.team_id,
          file_name: ppt.file_name,
          file_path: ppt.file_path,
          file_url: ppt.file_url || `https://jftragfdpepzpybzleat.supabase.co/storage/v1/object/public/SIH-Presentation/${ppt.file_path}`,
          status: ppt.status || 'Uploaded',
          uploaded_at: ppt.uploaded_at
        } : null;

        return {
          team_id: t.team_id,
          team_name: t.team_name,
          team_lead_id: t.team_lead_id || '',
          team_lead_name: t.members?.find((m: any) => m.is_lead)?.name || 'Unknown',
          team_lead_email: t.members?.find((m: any) => m.is_lead)?.email || '',
          team_lead_phone: t.members?.find((m: any) => m.is_lead)?.phone || '',
          department: t.members?.find((m: any) => m.is_lead)?.department || 'CSE',
          year: t.members?.find((m: any) => m.is_lead)?.year || 'E3',
          college: 'RGUKT Nuzvid',
          registration_status: t.registration_status || 'registered',
          members: t.members || [],
          selected_problem_statements: formattedPS,
          ppt_submission,
          panel: t.panel || 'Panel 1',
          presentation_completed: !!t.presentation_completed,
          completed_by: t.completed_by || null,
          completed_at: t.completed_at || null,
          google_slides_url: t.google_slides_url || null,
          created_at: t.created_at
        };
      });

      // Synchronize in local StateManager too
      loadedTeams.forEach(t => {
        const localT = HackathonStateManager.getTeamById(t.team_id);
        if (!localT) {
          HackathonStateManager.registerTeam(t);
        } else {
          // Sync completion status changes
          localT.panel = t.panel;
          localT.presentation_completed = t.presentation_completed;
          localT.completed_by = t.completed_by;
          localT.completed_at = t.completed_at;
          localT.ppt_submission = t.ppt_submission;
        }
      });
    } else {
      // Fallback to local storage if DB is not populated/reachable
      loadedTeams = HackathonStateManager.getTeams();
    }

    setTeams(loadedTeams);
    calculateStats(loadedTeams);
  };

  const calculateStats = (allTeams: Team[]) => {
    const user = HackathonStateManager.getCurrentUser();
    const activePanel = user?.panel || 'Panel 1';

    const panelTeams = allTeams.filter(t => (t.panel || 'Panel 1') === activePanel);
    const completed = panelTeams.filter(t => t.presentation_completed).length;
    const pending = panelTeams.length - completed;

    setTotalPanelTeams(panelTeams.length);
    setCompletedPanelTeams(completed);
    setPendingPanelTeams(pending);
  };

  // Global search filtering
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const query = searchQuery.toLowerCase();
    const matches = teams.filter(t => 
      t.team_id.toLowerCase().includes(query) ||
      t.team_name.toLowerCase().includes(query) ||
      t.team_lead_name.toLowerCase().includes(query) ||
      t.team_lead_email.toLowerCase().includes(query) ||
      t.members.some(m => 
        m.name.toLowerCase().includes(query) || 
        m.email.toLowerCase().includes(query) ||
        m.phone.toLowerCase().includes(query)
      ) ||
      (t.panel && t.panel.toLowerCase().includes(query)) ||
      (t.department && t.department.toLowerCase().includes(query)) ||
      (t.year && t.year.toLowerCase().includes(query))
    );
    setSearchResults(matches);
  }, [searchQuery, teams]);

  // Audio Synthesiser Buzzer Sound (Loops continuously until stopped)
  const startBuzzerSound = () => {
    if (!buzzerEnabled) return;
    try {
      stopBuzzerSound(); // clean up old sound references
      setIsBuzzerSounding(true);

      const triggerBeeps = () => {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        const playBeep = (startTime: number, duration: number) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(987.77, startTime); // B5 note (987.77Hz) for a clean digital beep
          
          gain.gain.setValueAtTime(0, startTime);
          gain.gain.linearRampToValueAtTime(0.25, startTime + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

          osc.connect(gain);
          gain.connect(audioCtx.destination);

          osc.start(startTime);
          osc.stop(startTime + duration);
        };

        // Clean, sharp double beep alarm: "Beep-Beep"
        playBeep(audioCtx.currentTime, 0.12);
        playBeep(audioCtx.currentTime + 0.18, 0.15);

        (window as any).activeChimeContexts = (window as any).activeChimeContexts || [];
        (window as any).activeChimeContexts.push(audioCtx);
      };

      triggerBeeps();
      const intervalId = setInterval(triggerBeeps, 1000); // Pulse every 1 second
      (window as any).activeBuzzerInterval = intervalId;
    } catch (e) {
      console.error('Audio synthesiser failed:', e);
    }
  };

  const stopBuzzerSound = () => {
    try {
      if ((window as any).activeBuzzerInterval) {
        clearInterval((window as any).activeBuzzerInterval);
        (window as any).activeBuzzerInterval = null;
      }
      if ((window as any).activeChimeContexts) {
        (window as any).activeChimeContexts.forEach((ctx: any) => {
          try { ctx.close(); } catch {}
        });
        (window as any).activeChimeContexts = [];
      }
      setIsBuzzerSounding(false);
    } catch (e) {
      console.error('Stop synthesiser failed:', e);
    }
  };

  // Timer ticks handler
  useEffect(() => {
    if (timerActive) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setTimerActive(false);
            startBuzzerSound();
            return 0;
          }
          setElapsedSeconds(e => e + 1);
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive]);

  const handleStartTimer = () => {
    if (!timerActive) {
      if (!timerSessionStart) {
        setTimerSessionStart(new Date().toISOString());
        setElapsedSeconds(0);
      }
      setTimerActive(true);
    }
  };

  const handlePauseTimer = () => {
    setTimerActive(false);
  };

  const handleRestartTimer = () => {
    setTimerActive(false);
    stopBuzzerSound();
    const min = parseInt(minutesInput, 10) || 4;
    const sec = parseInt(secondsInput, 10) || 0;
    setTimeLeft(min * 60 + sec);
    setTimerSessionStart(null);
    setElapsedSeconds(0);
  };

  const handleApplyCustomTime = () => {
    setTimerActive(false);
    stopBuzzerSound();
    const min = parseInt(minutesInput, 10) || 4;
    const sec = parseInt(secondsInput, 10) || 0;
    setTimeLeft(min * 60 + sec);
  };

  // Select team & load resources
  const selectTeamForPresentation = (team: Team) => {
    setSelectedTeam(team);
    stopBuzzerSound();
    // Default timer input fields
    setMinutesInput('4');
    setSecondsInput('00');
    setTimeLeft(240);
    setTimerActive(false);
    setTimerSessionStart(null);
    setElapsedSeconds(0);
    setSearchQuery('');
  };

  const handleMarkAsCompleted = async () => {
    if (!selectedTeam) return;

    const confirmResult = window.confirm(
      `Are you sure you want to mark "${selectedTeam.team_name}" (${selectedTeam.team_id}) presentation as completed?`
    );

    if (!confirmResult) return;

    const completedTime = new Date().toISOString();
    const coordinatorPanel = currentUser?.panel || 'Panel 1';

    try {
      // 1. Update status in Supabase Teams table
      const { error: teamError } = await supabase
        .from('teams')
        .update({
          presentation_completed: true,
          completed_by: coordinatorPanel,
          completed_at: completedTime
        })
        .eq('team_id', selectedTeam.team_id);

      if (teamError) throw teamError;

      // 2. Insert metrics to presentation_sessions if possible
      try {
        await supabase
          .from('presentation_sessions')
          .insert({
            team_id: selectedTeam.team_id,
            assigned_duration: (parseInt(minutesInput, 10) || 4) * 60,
            start_time: timerSessionStart || completedTime,
            end_time: completedTime,
            status: 'completed',
            buzzer_triggered: isBuzzerSounding
          });
      } catch (err) {
        console.warn('Logging session failed (missing schema columns or altered table):', err);
      }

      // Update state local references
      const updatedTeams = teams.map(t => {
        if (t.team_id === selectedTeam.team_id) {
          return {
            ...t,
            presentation_completed: true,
            completed_by: coordinatorPanel,
            completed_at: completedTime
          };
        }
        return t;
      });

      setTeams(updatedTeams);
      calculateStats(updatedTeams);
      setSelectedTeam({
        ...selectedTeam,
        presentation_completed: true,
        completed_by: coordinatorPanel,
        completed_at: completedTime
      });

      stopBuzzerSound();
      alert('Presentation completion recorded successfully!');
    } catch (err: any) {
      console.error('Update presentation status failed:', err);
      alert(`Database update error: ${err.message || String(err)}`);
    }
  };

  const formatTimerDigits = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Embedded presentation generator link
  const getEmbedUrl = (team: Team) => {
    if (team.google_slides_url) {
      const url = team.google_slides_url;
      const match = url.match(/\/presentation\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        return `https://docs.google.com/presentation/d/${match[1]}/embed?start=false&loop=false`;
      }
      return url;
    }
    if (team.ppt_submission?.file_url) {
      const url = team.ppt_submission.file_url;
      // If it's a PDF, render natively
      if (url.toLowerCase().endsWith('.pdf')) {
        return url;
      }
      // If PowerPoint file, use Office live embed viewer
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
    }
    // Fallback Mock URL or empty
    return '';
  };

  const getFullscreenEmbedUrl = (team: Team) => {
    if (team.google_slides_url) {
      const url = team.google_slides_url;
      const match = url.match(/\/presentation\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        return `https://docs.google.com/presentation/d/${match[1]}/embed?start=false&loop=false`;
      }
      return url;
    }
    if (team.ppt_submission?.file_url) {
      const url = team.ppt_submission.file_url;
      if (url.toLowerCase().endsWith('.pdf')) {
        return `${url}#page=${currentPage}`;
      }
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}&wdStartOn=${currentPage}`;
    }
    return '';
  };

  return (
    <>
      <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* Welcome Banner */}
      <div className="bg-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden border border-indigo-950">
        <div className="z-10">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Presentation Control Room</h1>
          <p className="text-xs sm:text-sm text-indigo-200 mt-1 font-semibold">
            Manage live slides, custom time limits, and confirm presentation status for {currentUser?.panel || 'Panel 1'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 z-10">
          <button
            onClick={handleDownloadExcel}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs px-4 py-2.5 rounded-2xl shadow-lg transition-all flex items-center gap-2 border border-emerald-400/30 cursor-pointer"
            title="Download Excel File (.xlsx)"
          >
            <Download className="w-4 h-4" /> Download Excel
          </button>
          <div className="bg-white/10 px-4 py-2 rounded-2xl border border-white/20 backdrop-blur text-right">
            <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">Active Node</div>
            <div className="text-base font-extrabold">{currentUser?.panel || 'Panel 1'}</div>
          </div>
        </div>

      </div>

      {/* Progress Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase">Total Panel Teams</div>
            <div className="text-3xl font-extrabold text-slate-900 mt-1">{totalPanelTeams}</div>
          </div>
          <Tv className="w-8 h-8 text-indigo-500 bg-indigo-50 p-1.5 rounded-xl" />
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase">Completed</div>
            <div className="text-3xl font-extrabold text-emerald-600 mt-1">{completedPanelTeams}</div>
          </div>
          <CheckCircle className="w-8 h-8 text-emerald-500 bg-emerald-50 p-1.5 rounded-xl" />
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase">Pending</div>
            <div className="text-3xl font-extrabold text-rose-600 mt-1">{pendingPanelTeams}</div>
          </div>
          <Clock className="w-8 h-8 text-rose-500 bg-rose-50 p-1.5 rounded-xl" />
        </div>
      </div>

      {/* Roster Global Search */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3 relative z-30">
        <h2 className="text-md font-bold text-slate-900">Search Live Presentation Teams</h2>
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Team ID, Team Name, Member name, Email, Phone, Dept..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
          />
        </div>

        {/* Query Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute left-6 right-6 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-80 overflow-y-auto z-40 divide-y divide-slate-100">
            {searchResults.map((t) => (
              <button
                key={t.team_id}
                onClick={() => selectTeamForPresentation(t)}
                className="w-full px-5 py-4 text-left hover:bg-indigo-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 transition-all cursor-pointer"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">{t.team_id}</span>
                    <span className="font-bold text-slate-900">{t.team_name}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 font-semibold">
                    Lead: {t.team_lead_name} • {t.department} • {t.year} • {t.panel || 'Panel 1'}
                  </div>
                </div>
                <div>
                  {t.presentation_completed ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Completed by {t.completed_by || 'Coordinator'}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Pending
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Coordinator Roster Data Table & Excel Export */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" /> Coordinator Team Roster Data
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-semibold">
              View team details, problem statement selections, presentation links, and panel assignments.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Panel Filter Dropdown */}
            <div className="relative flex-1 sm:flex-initial">
              <select
                value={panelFilter}
                onChange={(e) => setPanelFilter(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="all">All Panels ({teams.length} Teams)</option>
                <option value={currentUser?.panel || 'Panel 1'}>My Panel ({currentUser?.panel || 'Panel 1'})</option>
                <option value="Panel 1">Panel 1</option>
                <option value="Panel 2">Panel 2</option>
                <option value="Panel 3">Panel 3</option>
                <option value="Panel 4">Panel 4</option>
              </select>
            </div>

            {/* Download Excel Button */}
            <button
              onClick={handleDownloadExcel}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer shrink-0"
              title="Download Excel File (.xlsx)"
            >
              <Download className="w-4 h-4" /> Download Excel
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-2xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-bold">
                <th className="p-3 text-center border-b border-slate-800">S.No</th>
                <th className="p-3 border-b border-slate-800">Team ID</th>
                <th className="p-3 border-b border-slate-800">Team Name</th>
                <th className="p-3 border-b border-slate-800">Team Lead Name</th>
                <th className="p-3 border-b border-slate-800">PS ID 1</th>
                <th className="p-3 border-b border-slate-800">Presentation Link 1</th>
                <th className="p-3 border-b border-slate-800">PS ID 2</th>
                <th className="p-3 border-b border-slate-800">Presentation Link 2</th>
                <th className="p-3 border-b border-slate-800">Panel</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {getDisplayedTeams().map((t, idx) => {
                const lead = t.members?.find(m => m.is_lead) || t.members?.[0];
                const leadName = t.team_lead_name || lead?.name || 'Not Available';

                const psList = t.selected_problem_statements || [];
                const ps1 = psList[0];
                const ps2 = psList[1];
                const hasSecondPS = psList.length > 1;

                const link1 = t.google_slides_url || t.ppt_submission?.file_url || null;

                return (
                  <tr key={t.team_id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                    
                    <td className="p-3 font-mono font-extrabold text-indigo-700 whitespace-nowrap">
                      {t.team_id || 'Not Available'}
                    </td>
                    
                    <td className="p-3 font-bold text-slate-900 whitespace-nowrap">
                      {t.team_name || 'Not Available'}
                    </td>
                    
                    <td className="p-3 text-slate-800 whitespace-nowrap">
                      {leadName}
                    </td>
                    
                    <td className="p-3 whitespace-nowrap">
                      {ps1?.problem_id ? (
                        <span className="font-extrabold text-[11px] text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded">
                          {ps1.problem_id}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-semibold">Not Available</span>
                      )}
                    </td>
                    
                    <td className="p-3">
                      {link1 ? (
                        <a
                          href={link1}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1.5 hover:underline max-w-xs truncate"
                          title={link1}
                        >
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{link1}</span>
                        </a>
                      ) : (
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                          Not Submitted
                        </span>
                      )}
                    </td>
                    
                    <td className="p-3 whitespace-nowrap">
                      {hasSecondPS ? (
                        ps2?.problem_id ? (
                          <span className="font-extrabold text-[11px] text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">
                            {ps2.problem_id}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-semibold">Not Available</span>
                        )
                      ) : (
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full">
                          Not Applicable
                        </span>
                      )}
                    </td>
                    
                    <td className="p-3">
                      {hasSecondPS ? (
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                          Not Submitted
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full">
                          Not Applicable
                        </span>
                      )}
                    </td>
                    
                    <td className="p-3 whitespace-nowrap font-extrabold text-slate-700">
                      {t.panel || 'Not Available'}
                    </td>
                  </tr>
                );
              })}

              {getDisplayedTeams().length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 font-bold">
                    No team records found matching current selection criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>


      {selectedTeam ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: PPT View Box */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">{selectedTeam.team_id}</div>
                  <h2 className="text-lg font-bold text-slate-900">{selectedTeam.team_name}</h2>
                </div>
                <div className="flex items-center gap-2">
                  {selectedTeam.google_slides_url ? (
                    <button
                      onClick={() => {
                        window.open(selectedTeam.google_slides_url || '', '_blank');
                      }}
                      className="px-3.5 py-2 text-indigo-700 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 font-bold text-xs"
                      title="Open Google Slides"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Open Google Slides
                    </button>
                  ) : selectedTeam.ppt_submission?.file_url ? (
                    <button
                      onClick={() => {
                        window.open(selectedTeam.ppt_submission?.file_url || '', '_blank');
                      }}
                      className="px-3.5 py-2 text-slate-700 bg-slate-100 border border-slate-200 hover:bg-slate-200 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 font-bold text-xs"
                      title="Open Legacy PPT"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Open Legacy PPT
                    </button>
                  ) : null}

                  {(selectedTeam.google_slides_url || selectedTeam.ppt_submission?.file_url) ? (
                    <button
                      onClick={() => {
                        setIsPresentationFullScreen(true);
                        setCurrentPage(1);
                        setZoomLevel(100);
                        document.documentElement.requestFullscreen?.().catch(() => {});
                      }}
                      className="px-3 py-2 text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-all cursor-pointer flex items-center gap-1 font-bold text-[11px]"
                      title="Present Fullscreen"
                    >
                      <Maximize2 className="w-3.5 h-3.5" /> Present Fullscreen
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Presentation Embedded View */}
              {(selectedTeam.google_slides_url || selectedTeam.ppt_submission?.file_url) ? (
                <div className="relative aspect-video w-full bg-slate-950 rounded-xl overflow-hidden shadow-inner border border-slate-200">
                  <iframe
                    src={getEmbedUrl(selectedTeam)}
                    className="w-full h-full border-0"
                    allowFullScreen
                    title={`${selectedTeam.team_name} Presentation Deck`}
                  />
                </div>
              ) : (
                <div className="aspect-video w-full bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center p-6 text-center space-y-3">
                  <AlertTriangle className="w-10 h-10 text-rose-500 animate-pulse" />
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">No Presentation Slides Submitted</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                      This team has not provided their Google Slides link or legacy presentation file. Direct them to their Dashboard presentation settings.
                    </p>
                  </div>
                </div>
              )}

              {/* Team Info Details */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 md:grid-cols-3 gap-4 text-xs font-semibold">
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase">Team Lead</span>
                  <span className="text-slate-800">{selectedTeam.team_lead_name}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase">Department</span>
                  <span className="text-slate-800">{selectedTeam.department}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase">Problem Statement</span>
                  <span className="text-slate-800 truncate block">
                    {selectedTeam.selected_problem_statements?.[0]?.problem_title || 'General / Hardware'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Timer & Controls */}
          <div className="space-y-6">
            
            {/* Countdown widget */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm text-center space-y-6 relative overflow-hidden">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Live Event Timer</div>
              
              <div className="text-6xl font-extrabold tracking-widest text-slate-950 font-mono">
                {formatTimerDigits(timeLeft)}
              </div>

              {/* Manual Time Input */}
              <div className="flex items-center justify-center gap-2">
                <span className="text-xs font-bold text-slate-500">Duration:</span>
                <input
                  type="text"
                  maxLength={2}
                  disabled={timerActive}
                  value={minutesInput}
                  onChange={(e) => setMinutesInput(e.target.value)}
                  className="w-10 text-center py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="MM"
                />
                <span className="font-bold">:</span>
                <input
                  type="text"
                  maxLength={2}
                  disabled={timerActive}
                  value={secondsInput}
                  onChange={(e) => setSecondsInput(e.target.value)}
                  className="w-10 text-center py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="SS"
                />
                <button
                  type="button"
                  disabled={timerActive}
                  onClick={handleApplyCustomTime}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[10px] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  Apply
                </button>
              </div>

              {/* Action controls */}
              <div className="flex flex-wrap justify-center gap-3">
                {timerActive ? (
                  <button
                    onClick={handlePauseTimer}
                    className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Pause className="w-4 h-4" /> Pause
                  </button>
                ) : (
                  <button
                    onClick={handleStartTimer}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Play className="w-4 h-4" /> {timeLeft === 0 ? 'Start' : 'Resume'}
                  </button>
                )}

                <button
                  onClick={handleRestartTimer}
                  className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" /> Restart
                </button>
              </div>

              {/* Loop Buzzer & Sound controls */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                  <span>Looping Buzzer Sound</span>
                  <button
                    onClick={() => setBuzzerEnabled(!buzzerEnabled)}
                    className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] ${
                      buzzerEnabled 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {buzzerEnabled ? (
                      <>
                        <Volume2 className="w-3.5 h-3.5" /> Enabled
                      </>
                    ) : (
                      <>
                        <VolumeX className="w-3.5 h-3.5" /> Disabled
                      </>
                    )}
                  </button>
                </div>

                {isBuzzerSounding && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 space-y-2 text-center">
                    <div className="text-xs font-extrabold text-rose-700 animate-pulse">⏰ TIME UP - BUZZER ACTIVE!</div>
                    <button
                      onClick={stopBuzzerSound}
                      className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-sm"
                    >
                      Stop Buzzer Sound
                    </button>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={startBuzzerSound}
                    className="flex-1 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-[10px] rounded-lg transition-all"
                  >
                    Test Buzzer Chime
                  </button>
                  <button
                    type="button"
                    onClick={stopBuzzerSound}
                    className="py-2 px-3 border border-rose-200 hover:bg-rose-50 text-rose-700 font-bold text-[10px] rounded-lg transition-all"
                  >
                    Mute
                  </button>
                </div>
              </div>
            </div>

            {/* Complete Status Form */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-2">
                Presentation Tracking Status
              </h3>
              
              {selectedTeam.presentation_completed ? (
                <div className="space-y-3">
                  <div className="bg-emerald-50 text-emerald-700 text-xs p-4 rounded-xl border border-emerald-200 font-bold flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <div>
                      <div>Presentation Status: Completed</div>
                      <div className="text-[10px] font-normal text-emerald-600 mt-1">
                        Completed by: {selectedTeam.completed_by || 'Coordinator'}<br/>
                        Time: {selectedTeam.completed_at ? new Date(selectedTeam.completed_at).toLocaleString() : 'N/A'}
                      </div>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500 font-bold text-center">
                    Accidental resubmissions are disabled.
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-rose-50 text-rose-700 text-xs p-4 rounded-xl border border-rose-200 font-bold flex items-center gap-2">
                    <Clock className="w-4 h-4 shrink-0" />
                    Presentation Status: Pending Completion
                  </div>
                  <button
                    onClick={handleMarkAsCompleted}
                    className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Mark Team Presentation Completed
                  </button>
                </div>
              )}
            </div>

          </div>

        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Tv className="w-5 h-5 text-indigo-600" /> Active Roster Directory (Teams with Presentation Slides)
            </h2>
            <p className="text-xs text-slate-500">
              Below is a list of registered teams that have submitted their presentation. Click any team to display their details, load the timer, and present their slides.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
              {teams.filter(t => t.google_slides_url || t.ppt_submission?.file_url).map(t => (
                <button
                  key={t.team_id}
                  onClick={() => selectTeamForPresentation(t)}
                  className="p-4 text-left border border-slate-200 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50/20 transition-all space-y-2 cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                        {t.team_id}
                      </span>
                      {t.presentation_completed ? (
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          Completed
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                          Pending
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-900 text-xs mt-1.5 truncate">{t.team_name}</h3>
                    <p className="text-[10px] text-slate-500 mt-1 font-semibold truncate">Lead: {t.team_lead_name}</p>
                    <p className="text-[9px] text-indigo-600 font-extrabold truncate">{t.selected_problem_statements?.[0]?.problem_title || 'General'}</p>
                  </div>
                  <div className="pt-2 mt-2 border-t border-slate-100 flex items-center gap-1 text-[9px] font-bold text-indigo-700">
                    <PlayCircle className="w-3.5 h-3.5 text-indigo-600" /> Start Presentation
                  </div>
                </button>
              ))}
              {teams.filter(t => t.google_slides_url || t.ppt_submission?.file_url).length === 0 && (
                <div className="col-span-full py-8 text-center text-xs text-slate-400 font-bold">
                  No teams have configured their Google Slides link or uploaded their PPT yet.
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 shadow-sm space-y-4">
            <Tv className="w-16 h-16 text-slate-300 mx-auto animate-bounce" />
            <div>
              <h2 className="text-xl font-extrabold text-slate-950">No active presentation loaded</h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Search for a Team ID in the selector bar above to display their PPT slides and start the presentation timer.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>

    {/* Fullscreen PPT Presentation Viewer */}
    {isPresentationFullScreen && selectedTeam && selectedTeam.ppt_submission?.file_url && (
      <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col select-none">
        {/* Top Controls Bar */}
        <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4 text-white">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black uppercase bg-indigo-950 text-indigo-400 border border-indigo-800 px-2.5 py-0.5 rounded-full">
              {selectedTeam.team_id}
            </span>
            <span className="font-extrabold text-sm truncate max-w-xs">{selectedTeam.team_name}</span>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-6">
            {/* Navigation Controls */}
            <div className="flex items-center gap-2 bg-slate-800 p-1.5 rounded-xl border border-slate-700">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer text-xs font-bold"
                title="Previous Slide"
              >
                ◀ Prev
              </button>
              <span className="text-xs font-mono font-bold px-2 text-indigo-300">
                Slide/Page:{' '}
                <input
                  type="number"
                  min={1}
                  value={currentPage}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val > 0) setCurrentPage(val);
                  }}
                  className="w-12 bg-slate-950 border border-slate-750 text-center text-white py-0.5 px-1 rounded font-bold text-xs"
                />
              </span>
              <button
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer text-xs font-bold"
                title="Next Slide"
              >
                Next ▶
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-2 bg-slate-800 p-1.5 rounded-xl border border-slate-700 text-xs">
              <button
                onClick={() => setZoomLevel(prev => Math.max(50, prev - 10))}
                className="px-2 py-1 bg-slate-750 hover:bg-slate-700 rounded font-black cursor-pointer"
                title="Zoom Out"
              >
                A-
              </button>
              <span className="font-mono text-indigo-300 font-bold w-12 text-center">{zoomLevel}%</span>
              <button
                onClick={() => setZoomLevel(prev => Math.min(200, prev + 10))}
                className="px-2 py-1 bg-slate-750 hover:bg-slate-700 rounded font-black cursor-pointer"
                title="Zoom In"
              >
                A+
              </button>
              <button
                onClick={() => setZoomLevel(100)}
                className="px-2 py-1 bg-slate-750 hover:bg-slate-700 rounded font-bold text-[10px] cursor-pointer"
              >
                Reset
              </button>
            </div>

            {/* Download/Open */}
            <button
              onClick={() => window.open(selectedTeam.ppt_submission?.file_url, '_blank')}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-700"
            >
              Download / Open
            </button>
          </div>

          {/* Exit Controls */}
          <button
            onClick={() => {
              setIsPresentationFullScreen(false);
              if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
              }
            }}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            Exit Presentation (Esc)
          </button>
        </div>

        {/* Main Slide Panel Area */}
        <div className="flex-1 w-full overflow-auto bg-slate-950 flex items-center justify-center p-4">
          <div 
            className="relative shadow-2xl transition-all duration-200 border border-slate-850 bg-slate-900 flex-shrink-0"
            style={{ 
              width: '100%', 
              height: '100%', 
              maxWidth: '1280px', 
              maxHeight: '720px', 
              aspectRatio: '16/9',
              transform: `scale(${zoomLevel / 100})`, 
              transformOrigin: 'center center' 
            }}
          >
            <iframe
              src={getFullscreenEmbedUrl(selectedTeam)}
              className="w-full h-full border-0 rounded-lg"
              allowFullScreen
              title={`${selectedTeam.team_name} PPT Fullscreen`}
            />
          </div>
        </div>
      </div>
    )}
    </>
  );
}
