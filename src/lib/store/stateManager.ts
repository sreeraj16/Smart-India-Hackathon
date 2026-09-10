import { Team, ProblemStatement, PresentationSession, JuryEvaluation, AuditLog, UserProfile, PPTSubmission } from '../types';
import { INITIAL_PROBLEM_STATEMENTS, INITIAL_TEAMS, INITIAL_EVALUATIONS, INITIAL_AUDIT_LOGS } from './hackathonStore';
import { ParsedTop50Team } from '../utils/top50ImportUtils';

const STORAGE_KEYS = {
  TEAMS: 'sih_2026_teams',
  PROBLEMS: 'sih_2026_problems',
  EVALUATIONS: 'sih_2026_evaluations',
  SESSIONS: 'sih_2026_sessions',
  AUDIT_LOGS: 'sih_2026_audit_logs',
  TOP50_OVERRIDES: 'sih_2026_top50_overrides',
  CURRENT_USER: 'sih_2026_current_user',
};

const CONFIRMED_DUPLICATE_IDS = new Set([
  'SI_Hackers_RGUKTN_SIH26158_031',
  'Innovexia_RGUKTN_PS-100_063',
  'INNOVEXIA_RGUKTN_SIH26100_108',
  'Hexaminds_RGUKTN_SIH25038_040',
  'Hexaminds_RGUKTN_SIH26009_152',
  'BinaryNinjas_RGUKTN_SIH26003_105',
  'BinaryNinjas_RGUKTN_SIH26003_155',
  'Tejas_RGUKTN_SIH26120_134',
  'NOVUS_RGUKTN_SIH26044_188',
  'NOVUS_RGUKTN_SIH26044_197',
  'Brainstormers_RGUKTN_SIH26039_182'
]);

export class HackathonStateManager {
  private static isBrowser(): boolean {
    return typeof window !== 'undefined';
  }

  // --- PROBLEM STATEMENTS (Dynamic collection from teams) ---
  static getProblemStatements(): ProblemStatement[] {
    const teams = this.getTeams();
    const map = new Map<string, ProblemStatement>();

    teams.forEach(t => {
      if (t.selected_problem_statements && Array.isArray(t.selected_problem_statements)) {
        t.selected_problem_statements.forEach(ps => {
          if (ps && ps.problem_id && !map.has(ps.problem_id)) {
            map.set(ps.problem_id, ps);
          }
        });
      }
    });

    return Array.from(map.values());
  }

  // --- TEAMS ---
  static getTeams(): Team[] {
    if (!this.isBrowser()) return INITIAL_TEAMS.filter(t => !CONFIRMED_DUPLICATE_IDS.has(t.team_id));
    const stored = localStorage.getItem(STORAGE_KEYS.TEAMS);
    if (!stored) {
      localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(INITIAL_TEAMS));
      return INITIAL_TEAMS.filter(t => !CONFIRMED_DUPLICATE_IDS.has(t.team_id));
    }
    try {
      const parsed = JSON.parse(stored);
      // Clean old mock teams from localStorage
      if (Array.isArray(parsed) && parsed.some((t: any) => String(t.team_id) === 'mock-team-1')) {
        localStorage.removeItem(STORAGE_KEYS.TEAMS);
        return [];
      }
      return (parsed || []).filter((t: Team) => !CONFIRMED_DUPLICATE_IDS.has(t.team_id));
    } catch {
      return INITIAL_TEAMS.filter(t => !CONFIRMED_DUPLICATE_IDS.has(t.team_id));
    }
  }

  static deleteTeam(teamId: string): void {
    const currentUser = this.getCurrentUser();
    const isAuthorizedAdmin = ['vasuch9959@rguktn.ac.in', 'n220615@rguktn.ac.in'].includes(currentUser?.email?.trim().toLowerCase() || '');
    if (!isAuthorizedAdmin) {
      console.error('Unauthorized team deletion attempt.');
      return;
    }
    const teams = this.getTeams().filter(t => t.team_id !== teamId);
    if (this.isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(teams));
      window.dispatchEvent(new Event('sih_teams_updated'));

      import('@/lib/supabase/client').then(({ supabase }) => {
        supabase.from('team_members').delete().eq('team_id', teamId).then(() => {});
        supabase.from('team_problem_statements').delete().eq('team_id', teamId).then(() => {});
        supabase.from('ppt_submissions').delete().eq('team_id', teamId).then(() => {});
        supabase.from('jury_evaluations').delete().eq('team_id', teamId).then(() => {});
        supabase.from('presentation_sessions').delete().eq('team_id', teamId).then(() => {});
        supabase.from('audit_logs').delete().eq('team_id', teamId).then(() => {});
        supabase.from('final_results').delete().eq('team_id', teamId).then(() => {});
        supabase.from('teams').delete().eq('team_id', teamId).then(({ error }) => {
          if (error) console.error('Failed to delete team from Supabase:', error);
        });
      });
    }
  }

  static getTeamById(teamId: string): Team | undefined {
    if (!teamId) return undefined;
    const teams = this.getTeams();
    return teams.find(t => t.team_id.toLowerCase() === teamId.toLowerCase());
  }

  static getTeamForUser(user: UserProfile | null): Team | undefined {
    if (!user) return undefined;
    const teams = this.getTeams();
    
    if (user.team_id) {
      const matchedById = teams.find(t => t.team_id.toLowerCase() === user.team_id?.toLowerCase());
      if (matchedById) return matchedById;
    }

    if (user.email) {
      const userEmail = user.email.trim().toLowerCase();
      const matchedByEmail = teams.find(t => {
        const leadEmail = (t.team_lead_email || '').trim().toLowerCase();
        if (leadEmail && leadEmail === userEmail) return true;
        if (t.members && Array.isArray(t.members)) {
          return t.members.some(m => (m.email || '').trim().toLowerCase() === userEmail);
        }
        return false;
      });

      if (matchedByEmail) {
        if (user.team_id !== matchedByEmail.team_id) {
          user.team_id = matchedByEmail.team_id;
          this.setCurrentUser(user);
        }
        return matchedByEmail;
      }
    }

    return undefined;
  }

  static async getTeamForUserAsync(user: UserProfile | null): Promise<Team | undefined> {
    if (!user) return undefined;

    let team = this.getTeamForUser(user);
    if (team) return team;

    await this.syncFromSupabase();
    team = this.getTeamForUser(user);
    if (team) return team;

    if (user.email) {
      try {
        const { supabase } = await import('@/lib/supabase/client');
        const userEmail = user.email.trim();

        const { data: memberMatches } = await supabase
          .from('team_members')
          .select('team_id')
          .ilike('email', userEmail)
          .limit(1);

        if (memberMatches && memberMatches.length > 0) {
          const foundTeamId = memberMatches[0].team_id;
          user.team_id = foundTeamId;
          this.setCurrentUser(user);
          await this.syncFromSupabase();
          return this.getTeamById(foundTeamId);
        }
      } catch (err) {
        console.error('Failed direct Supabase team lookup:', err);
      }
    }

    return undefined;
  }

  static registerTeam(newTeamData: Omit<Team, 'created_at'>): Team {
    const teams = this.getTeams();
    const newTeam: Team = {
      ...newTeamData,
      created_at: new Date().toISOString()
    };
    teams.push(newTeam);
    if (this.isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(teams));
      window.dispatchEvent(new Event('sih_teams_updated'));
    }
    return newTeam;
  }

  static updateTeam(updatedTeam: Team): void {
    const teams = this.getTeams();
    const idx = teams.findIndex(t => t.team_id === updatedTeam.team_id);
    if (idx !== -1) {
      teams[idx] = updatedTeam;
      if (this.isBrowser()) {
        localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(teams));
        window.dispatchEvent(new Event('sih_teams_updated'));
      }
    }

    // Sync to Supabase in the background
    if (this.isBrowser()) {
      import('@/lib/supabase/client').then(({ supabase }) => {
        supabase.from('teams').update({
          team_name: updatedTeam.team_name,
          registration_status: updatedTeam.registration_status,
          panel: updatedTeam.panel,
          presentation_completed: updatedTeam.presentation_completed,
          completed_by: updatedTeam.completed_by,
          completed_at: updatedTeam.completed_at,
          google_slides_url: updatedTeam.google_slides_url,
          google_slides_url_2: updatedTeam.google_slides_url_2
        }).eq('team_id', updatedTeam.team_id).then(({ error }) => {
          if (error) console.error('Failed to sync team update to Supabase:', error);
        });

        if (updatedTeam.selected_problem_statements && updatedTeam.selected_problem_statements.length > 0) {
          // Upsert problem statements first
          supabase.from('problem_statements').upsert(
            updatedTeam.selected_problem_statements.map(ps => ({
              problem_id: ps.problem_id,
              problem_title: ps.problem_title,
              description: ps.description || ps.problem_title,
              domain: ps.domain || 'General',
              category: ps.category || 'Software'
            }))
          ).then(({ error: psErr }) => {
            if (psErr) {
              console.error('Failed to upsert PS to Supabase:', psErr);
              return;
            }

            // Clean old mappings and insert new ones
            supabase.from('team_problem_statements').delete().eq('team_id', updatedTeam.team_id).then(() => {
              const mappingInserts = updatedTeam.selected_problem_statements.map((ps, idx) => ({
                team_id: updatedTeam.team_id,
                problem_id: ps.problem_id,
                selection_order: idx + 1
              }));
              supabase.from('team_problem_statements').insert(mappingInserts).then(({ error: mapErr }) => {
                if (mapErr) console.error('Failed to insert PS mappings to Supabase:', mapErr);
              });
            });
          });
        }
      });
    }
  }

  static editTeamRegistration(updatedTeam: Team): void {
    const teams = this.getTeams();
    const idx = teams.findIndex(t => t.team_id === updatedTeam.team_id);
    if (idx !== -1) {
      teams[idx] = updatedTeam;
      if (this.isBrowser()) {
        localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(teams));
        window.dispatchEvent(new Event('sih_teams_updated'));
      }
    }
    // Re-sync full data from Supabase to guarantee complete field alignment
    this.syncFromSupabase();
  }


  static addPPTSubmission(teamId: string, submission: PPTSubmission): void {
    const teams = this.getTeams();
    const team = teams.find(t => t.team_id === teamId);
    if (team) {
      team.ppt_submission = submission;
      this.updateTeam(team);
    }
  }

  // --- EVALUATIONS ---
  static getEvaluations(): JuryEvaluation[] {
    if (!this.isBrowser()) return INITIAL_EVALUATIONS;
    const stored = localStorage.getItem(STORAGE_KEYS.EVALUATIONS);
    if (!stored) {
      localStorage.setItem(STORAGE_KEYS.EVALUATIONS, JSON.stringify(INITIAL_EVALUATIONS));
      return INITIAL_EVALUATIONS;
    }
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.some((e: any) => String(e.team_id).startsWith('SIH-2026-') || String(e.jury_id).includes('jury-'))) {
        localStorage.removeItem(STORAGE_KEYS.EVALUATIONS);
        return [];
      }
      return parsed;
    } catch {
      return INITIAL_EVALUATIONS;
    }
  }

  static submitEvaluation(evalData: Omit<JuryEvaluation, 'evaluation_id' | 'submitted_at'>): JuryEvaluation {
    const evals = this.getEvaluations();
    // remove existing eval by same jury for same team if any
    const filtered = evals.filter(e => !(e.jury_id === evalData.jury_id && e.team_id === evalData.team_id));
    
    const newEval: JuryEvaluation = {
      ...evalData,
      evaluation_id: `eval-${Date.now()}`,
      submitted_at: new Date().toISOString()
    };

    filtered.push(newEval);
    if (this.isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.EVALUATIONS, JSON.stringify(filtered));
      window.dispatchEvent(new Event('sih_evaluations_updated'));

      // Sync to Supabase in the background
      import('@/lib/supabase/client').then(({ supabase }) => {
        supabase.from('jury_evaluations').upsert({
          jury_id: evalData.jury_id,
          team_id: evalData.team_id,
          innovation_score: evalData.innovation_score,
          relevance_score: evalData.relevance_score,
          technical_score: evalData.technical_score,
          presentation_score: evalData.presentation_score,
          qa_score: evalData.qa_score,
          total_score: evalData.total_score,
          comments: evalData.comments,
          submitted_at: newEval.submitted_at
        }, { onConflict: 'jury_id,team_id' }).then(({ error }) => {
          if (error) console.error('Failed to sync evaluation to Supabase:', error);
        });
      });
    }
    return newEval;
  }

  static getTeamAverageScore(teamId: string): number {
    const evals = this.getEvaluations().filter(e => e.team_id === teamId);
    if (evals.length === 0) return 0;
    const sum = evals.reduce((acc, curr) => acc + curr.total_score, 0);
    return Math.round((sum / evals.length) * 100) / 100;
  }

  // --- PRESENTATION SESSIONS & TIMER ---
  static getSessions(): Record<string, PresentationSession> {
    if (!this.isBrowser()) return {};
    const stored = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    if (!stored) return {};
    try {
      return JSON.parse(stored);
    } catch {
      return {};
    }
  }

  static getSessionForTeam(teamId: string): PresentationSession {
    const sessions = this.getSessions();
    if (sessions[teamId]) return sessions[teamId];
    const defaultSession: PresentationSession = {
      session_id: `session-${teamId}`,
      team_id: teamId,
      assigned_duration: 240, // 4 mins
      start_time: null,
      end_time: null,
      status: 'scheduled',
      buzzer_triggered: false
    };
    return defaultSession;
  }

  static updateSession(session: PresentationSession): void {
    const sessions = this.getSessions();
    sessions[session.team_id] = session;
    if (this.isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
      window.dispatchEvent(new Event('sih_session_updated'));

      // Sync to Supabase in the background
      import('@/lib/supabase/client').then(({ supabase }) => {
        supabase.from('presentation_sessions').upsert({
          team_id: session.team_id,
          assigned_duration: session.assigned_duration,
          start_time: session.start_time,
          end_time: session.end_time,
          status: session.status,
          buzzer_triggered: session.buzzer_triggered
        }, { onConflict: 'team_id' }).then(({ error }) => {
          if (error) console.error('Failed to sync session update to Supabase:', error);
        });
      });
    }
  }

  // --- AUDIT LOGS ---
  static getAuditLogs(): AuditLog[] {
    if (!this.isBrowser()) return INITIAL_AUDIT_LOGS;
    const stored = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    if (!stored) {
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(INITIAL_AUDIT_LOGS));
      return INITIAL_AUDIT_LOGS;
    }
    try {
      return JSON.parse(stored);
    } catch {
      return INITIAL_AUDIT_LOGS;
    }
  }

  static addAuditLog(log: Omit<AuditLog, 'log_id' | 'timestamp'>): void {
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      ...log,
      log_id: `log-${Date.now()}`,
      timestamp: new Date().toISOString()
    };
    logs.unshift(newLog);
    if (this.isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs));
      window.dispatchEvent(new Event('sih_audit_updated'));

      // Sync to Supabase in the background
      import('@/lib/supabase/client').then(({ supabase }) => {
        const payload: any = {
          team_id: log.team_id,
          action: log.action,
          previous_value: log.previous_value,
          new_value: log.new_value,
          reason: log.reason,
          timestamp: newLog.timestamp
        };
        if (log.admin_id && !log.admin_id.startsWith('admin-')) {
          payload.admin_id = log.admin_id;
        }
        supabase.from('audit_logs').insert(payload).then(({ error }) => {
          if (error) console.error('Failed to sync audit log to Supabase:', error);
        });
      });
    }
  }

  // --- MANUAL TOP 50 OVERRIDES ---
  static getTop50Overrides(): Record<string, {
    selected: boolean;
    reason?: string;
    team_name?: string;
    team_lead_name?: string;
    problem_id?: string;
    problem_title?: string;
    category?: 'Software' | 'Hardware';
    index?: number;
  }> {
    if (!this.isBrowser()) return {};
    const stored = localStorage.getItem(STORAGE_KEYS.TOP50_OVERRIDES);
    if (!stored) return {};
    try {
      return JSON.parse(stored);
    } catch {
      return {};
    }
  }

  // --- SELECTED TEAMS ---
  static getSelectedTeams(): Team[] {
    const teams = this.getTeams();
    const overrides = this.getTop50Overrides();

    // Check if there are explicit selections in overrides / final_results
    const hasExplicitSelections = Object.values(overrides).some(o => o.selected === true);

    if (hasExplicitSelections) {
      const selectedList: Team[] = [];

      for (const [teamId, ov] of Object.entries(overrides)) {
        if (!ov.selected) continue;
        const existing = teams.find(t => t.team_id === teamId);
        if (existing) {
          selectedList.push({
            ...existing,
            team_name: ov.team_name || existing.team_name,
            team_lead_name: ov.team_lead_name || existing.team_lead_name,
            selected_problem_statements: ov.problem_id ? [{
              problem_id: ov.problem_id,
              problem_title: ov.problem_title || 'Selected Problem Statement',
              description: ov.problem_title || '',
              category: ov.category || existing.selected_problem_statements?.[0]?.category || 'Software',
              domain: existing.selected_problem_statements?.[0]?.domain || 'General'
            }] : (existing.selected_problem_statements && existing.selected_problem_statements.length > 0 ? [existing.selected_problem_statements[0]] : [])
          });
        } else if (ov.team_name) {
          selectedList.push({
            team_id: teamId,
            team_name: ov.team_name,
            team_lead_id: `lead-${teamId}`,
            team_lead_name: ov.team_lead_name || 'Team Lead',
            team_lead_email: '',
            team_lead_phone: '',
            department: '',
            year: '',
            college: 'RGUKT Nuzvid',
            registration_status: 'registered',
            members: [{
              name: ov.team_lead_name || 'Team Lead',
              id_number: '',
              email: '',
              phone: '',
              department: '',
              year: '',
              is_lead: true
            }],
            selected_problem_statements: ov.problem_id ? [{
              problem_id: ov.problem_id,
              problem_title: ov.problem_title || 'Selected Problem Statement',
              description: ov.problem_title || '',
              category: ov.category || 'Software',
              domain: 'General'
            }] : [],
            created_at: new Date().toISOString()
          });
        }
      }

      // Preserve original spreadsheet order if index is present
      if (selectedList.some(t => overrides[t.team_id]?.index !== undefined)) {
        selectedList.sort((a, b) => (overrides[a.team_id]?.index ?? 999) - (overrides[b.team_id]?.index ?? 999));
      }

      return selectedList;
    }

    // Fallback: If evaluation scores exist, take evaluated teams with scores > 0
    const scoredTeams = teams
      .map(t => ({
        team: t,
        score: this.getTeamAverageScore(t.team_id)
      }))
      .filter(item => item.score > 0);

    if (scoredTeams.length > 0) {
      return scoredTeams.map(item => item.team);
    }

    return [];
  }

  static setTop50Override(teamId: string, selected: boolean, reason: string, adminName: string = 'Admin'): void {
    const currentUser = this.getCurrentUser();
    const isAuthorizedAdmin = ['vasuch9959@rguktn.ac.in', 'n220615@rguktn.ac.in'].includes(currentUser?.email?.trim().toLowerCase() || '');
    if (!isAuthorizedAdmin) {
      console.error('Unauthorized top50 override attempt.');
      return;
    }
    const overrides = this.getTop50Overrides();
    const prevStatus = overrides[teamId]?.selected ? 'Selected' : 'Not Selected';
    overrides[teamId] = { selected, reason };
    
    if (this.isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.TOP50_OVERRIDES, JSON.stringify(overrides));
      window.dispatchEvent(new Event('sih_results_updated'));
      
      // Also update in final_results table in Supabase
      import('@/lib/supabase/client').then(({ supabase }) => {
        supabase.from('final_results').upsert({
          team_id: teamId,
          selected: selected,
          admin_override: true,
          override_reason: reason,
          updated_at: new Date().toISOString()
        }, { onConflict: 'team_id' }).then(({ error }) => {
          if (error) console.error('Failed to sync final results override to Supabase:', error);
        });
      });
    }

    this.addAuditLog({
      admin_id: 'admin-1',
      admin_name: adminName,
      team_id: teamId,
      action: selected ? 'Manually Added to Top 50' : 'Manually Removed from Top 50',
      previous_value: prevStatus,
      new_value: selected ? 'Selected' : 'Not Selected',
      reason: reason
    });
  }

  static async importTop50TeamsFromExcel(
    parsedTeams: ParsedTop50Team[],
    replaceExisting: boolean = true,
    adminEmail?: string
  ): Promise<{ success: boolean; count: number; error?: string }> {
    const currentUser = this.getCurrentUser();
    const effectiveEmail = (adminEmail || currentUser?.email || '').trim().toLowerCase();
    const isAuthorizedAdmin = ['vasuch9959@rguktn.ac.in', 'n220615@rguktn.ac.in'].includes(effectiveEmail);

    if (!isAuthorizedAdmin) {
      return {
        success: false,
        count: 0,
        error: 'Unauthorized: Only vasuch9959@rguktn.ac.in or authorized admin can import Top 50 results.'
      };
    }

    if (!parsedTeams || parsedTeams.length === 0) {
      return { success: false, count: 0, error: 'No team data provided to import.' };
    }

    const currentTeams = [...this.getTeams()];
    const currentOverrides: ReturnType<typeof HackathonStateManager.getTop50Overrides> = replaceExisting
      ? {}
      : { ...this.getTop50Overrides() };

    const matchedIds: string[] = [];
    const newTeamsToInsert: Team[] = [];

    const cleanStr = (s?: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    for (let i = 0; i < parsedTeams.length; i++) {
      const p = parsedTeams[i];
      const rawName = (p.team_name || '').trim();
      const rawLead = (p.team_lead_name || '').trim();
      const normalizedName = rawName.toLowerCase();
      const normalizedId = (p.team_id || '').trim().toLowerCase();

      // 1. Exact ID or Name Match
      let matchedTeam = currentTeams.find(t => 
        (normalizedId && t.team_id.toLowerCase() === normalizedId) ||
        (t.team_name.trim().toLowerCase() === normalizedName)
      );

      // 2. Cleaned Alphanumeric Name Match (ignoring punctuation, spaces, rguktn suffixes)
      if (!matchedTeam) {
        matchedTeam = currentTeams.find(t => cleanStr(t.team_name) === cleanStr(rawName));
      }

      // 3. Fallback: Match by Team Lead Name
      if (!matchedTeam && rawLead) {
        matchedTeam = currentTeams.find(t => {
          if (cleanStr(t.team_lead_name) === cleanStr(rawLead)) return true;
          return t.members && t.members.some(m => cleanStr(m.name) === cleanStr(rawLead));
        });
      }

      let targetTeamId = matchedTeam?.team_id;

      if (matchedTeam) {
        if (p.problem_id && (!matchedTeam.selected_problem_statements || matchedTeam.selected_problem_statements.length === 0)) {
          matchedTeam.selected_problem_statements = [{
            problem_id: p.problem_id,
            problem_title: p.problem_title || 'Selected Problem Statement',
            description: p.problem_title || '',
            category: p.category || 'Software',
            domain: p.domain || 'General'
          }];
        }
        if (p.team_lead_name && !matchedTeam.team_lead_name) {
          matchedTeam.team_lead_name = p.team_lead_name;
        }
      } else {
        targetTeamId = p.team_id || `${p.team_name.replace(/[^a-zA-Z0-9]/g, '_')}_TOP50_${Date.now()}_${i}`;
        const newTeam: Team = {
          team_id: targetTeamId,
          team_name: p.team_name,
          team_lead_id: `lead-${targetTeamId}`,
          team_lead_name: p.team_lead_name || 'Team Lead',
          team_lead_email: p.team_lead_email || '',
          team_lead_phone: p.team_lead_phone || '',
          department: p.department || 'CSE',
          year: p.year || 'E3',
          college: 'RGUKT Nuzvid',
          registration_status: 'registered',
          members: [
            {
              name: p.team_lead_name || 'Team Lead',
              id_number: '',
              email: p.team_lead_email || '',
              phone: p.team_lead_phone || '',
              department: p.department || 'CSE',
              year: p.year || 'E3',
              is_lead: true
            }
          ],
          selected_problem_statements: p.problem_id ? [
            {
              problem_id: p.problem_id,
              problem_title: p.problem_title || 'Selected Problem Statement',
              description: p.problem_title || '',
              category: p.category || 'Software',
              domain: p.domain || 'General'
            }
          ] : [],
          created_at: new Date().toISOString()
        };
        currentTeams.push(newTeam);
        newTeamsToInsert.push(newTeam);
      }

      if (targetTeamId) {
        const meta = {
          selected: true,
          reason: `Uploaded via Top 50 Excel by ${effectiveEmail}`,
          team_name: rawName,
          team_lead_name: rawLead,
          problem_id: p.problem_id,
          problem_title: p.problem_title,
          category: p.category,
          index: i + 1
        };
        currentOverrides[targetTeamId] = meta;
        matchedIds.push(targetTeamId);
      }
    }

    if (this.isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(currentTeams));
      localStorage.setItem(STORAGE_KEYS.TOP50_OVERRIDES, JSON.stringify(currentOverrides));

      window.dispatchEvent(new Event('sih_teams_updated'));
      window.dispatchEvent(new Event('sih_results_updated'));

      // Sync into Supabase in background
      try {
        const { supabase } = await import('@/lib/supabase/client');

        // Ensure any newly generated teams exist in public.teams table to satisfy foreign key constraints
        if (newTeamsToInsert.length > 0) {
          const dbTeams = newTeamsToInsert.map(t => ({
            team_id: t.team_id,
            team_name: t.team_name,
            registration_status: 'registered',
            created_at: new Date().toISOString()
          }));
          await supabase.from('teams').upsert(dbTeams, { onConflict: 'team_id' });
        }

        const rows = matchedIds.map(id => ({
          team_id: id,
          selected: true,
          admin_override: true,
          override_reason: JSON.stringify(currentOverrides[id]),
          updated_at: new Date().toISOString()
        }));

        if (rows.length > 0) {
          const { error: upsertErr } = await supabase.from('final_results').upsert(rows, { onConflict: 'team_id' });
          if (upsertErr) {
            console.error('Could not sync final_results to Supabase:', upsertErr);
          } else {
            console.log(`Successfully synced ${rows.length} results to Supabase final_results`);
          }
        }
      } catch (err) {
        console.warn('Could not sync final_results to Supabase:', err);
      }
    }

    this.addAuditLog({
      admin_id: 'admin-vasu',
      admin_name: effectiveEmail === 'vasuch9959@rguktn.ac.in' ? 'Vasu (Admin)' : 'Admin',
      team_id: 'ALL',
      action: 'Bulk Uploaded Top 50 Excel Results',
      previous_value: `${Object.keys(this.getTop50Overrides()).length} teams`,
      new_value: `${matchedIds.length} teams selected`,
      reason: 'Uploaded official Top 50 spreadsheet'
    });

    return { success: true, count: matchedIds.length };
  }

  static async clearTop50Overrides(adminEmail?: string): Promise<boolean> {
    const currentUser = this.getCurrentUser();
    const effectiveEmail = (adminEmail || currentUser?.email || '').trim().toLowerCase();
    const isAuthorizedAdmin = ['vasuch9959@rguktn.ac.in', 'n220615@rguktn.ac.in'].includes(effectiveEmail);

    if (!isAuthorizedAdmin) return false;

    if (this.isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.TOP50_OVERRIDES, JSON.stringify({}));
      window.dispatchEvent(new Event('sih_results_updated'));

      try {
        const { supabase } = await import('@/lib/supabase/client');
        await supabase.from('final_results').delete().neq('team_id', 'dummy_safeguard');
      } catch (e) {
        console.warn('Error clearing Supabase final results:', e);
      }
    }
    return true;
  }

  // --- CURRENT USER AUTH SESSION ---
  static getCurrentUser(): UserProfile | null {
    if (!this.isBrowser()) return null;
    const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }

  static setCurrentUser(user: UserProfile | null): void {
    if (!this.isBrowser()) return;
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
    window.dispatchEvent(new Event('sih_auth_changed'));
  }

  // --- DYNAMIC DATA SYNC FROM SUPABASE ---
  static async syncFromSupabase(): Promise<void> {
    if (!this.isBrowser()) return;
    try {
      const { supabase } = await import('@/lib/supabase/client');

      // 1. Fetch Teams
      const { data: dbTeams, error: teamsErr } = await supabase.from('teams').select('*');
      if (teamsErr) throw teamsErr;

      const validDbTeams = (dbTeams || []).filter(t => !CONFIRMED_DUPLICATE_IDS.has(t.team_id));

      // 2. Fetch Members
      const { data: dbMembers } = await supabase.from('team_members').select('*');

      // 3. Fetch PS Mappings & Problem Statements
      const { data: dbMappings } = await supabase
        .from('team_problem_statements')
        .select('*, problem_statements(*)');

      // 4. Fetch PPT Submissions
      const { data: dbPpts } = await supabase.from('ppt_submissions').select('*');

      // Construct frontend Team objects
      const teams: Team[] = validDbTeams.map(t => {
        const members = (dbMembers || [])
          .filter(m => m.team_id === t.team_id)
          .map(m => ({
            member_id: m.member_id,
            team_id: m.team_id,
            name: m.name,
            id_number: m.roll_number,
            email: m.email,
            phone: m.phone,
            department: m.department,
            year: m.year,
            is_lead: !!m.is_lead,
            gender: m.gender || 'M'
          }))
          .sort((a, b) => {
            if (a.is_lead && !b.is_lead) return -1;
            if (!a.is_lead && b.is_lead) return 1;
            return (a.member_id || '').localeCompare(b.member_id || '');
          });

        const leadMember = members.find(m => m.is_lead) || members[0];

        const selectedPS = (dbMappings || [])
          .filter(m => m.team_id === t.team_id)
          .sort((a, b) => (a.selection_order || 1) - (b.selection_order || 1))
          .map(m => m.problem_statements)
          .filter(Boolean);

        const pptRecord = (dbPpts || []).find(p => p.team_id === t.team_id);
        const ppt_submission = pptRecord ? {
          ppt_id: pptRecord.ppt_id,
          team_id: pptRecord.team_id,
          file_name: pptRecord.file_name,
          file_path: pptRecord.file_path,
          file_url: supabase.storage.from('SIH-Presentation').getPublicUrl(pptRecord.file_path).data.publicUrl,
          status: pptRecord.status,
          uploaded_at: pptRecord.uploaded_at
        } : null;

        return {
          team_id: t.team_id,
          team_name: t.team_name,
          team_lead_id: t.team_lead_id || (leadMember ? `lead-${leadMember.member_id}` : ''),
          team_lead_name: leadMember ? leadMember.name : '',
          team_lead_email: leadMember ? leadMember.email : '',
          team_lead_phone: leadMember ? leadMember.phone : '',
          department: leadMember ? leadMember.department : '',
          year: leadMember ? leadMember.year : '',
          college: 'RGUKT Nuzvid',
          registration_status: t.registration_status || 'registered',
          panel: t.panel || 'Panel 1',
          presentation_completed: !!t.presentation_completed,
          completed_by: t.completed_by || undefined,
          completed_at: t.completed_at || undefined,
          google_slides_url: t.google_slides_url || undefined,
          google_slides_url_2: t.google_slides_url_2 || undefined,
          created_at: t.created_at || new Date().toISOString(),
          members,
          selected_problem_statements: selectedPS,
          ppt_submission
        };
      });

      localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(teams));

      // 5. Fetch and Sync Evaluations
      const { data: dbEvals } = await supabase.from('jury_evaluations').select('*');
      const evaluations: JuryEvaluation[] = (dbEvals || []).map(e => ({
        evaluation_id: e.evaluation_id,
        jury_id: e.jury_id,
        team_id: e.team_id,
        innovation_score: e.innovation_score || 0,
        relevance_score: e.relevance_score || 0,
        technical_score: e.technical_score || 0,
        presentation_score: e.presentation_score || 0,
        qa_score: e.qa_score || 0,
        total_score: e.total_score || 0,
        comments: e.comments || '',
        submitted_at: e.submitted_at
      }));
      localStorage.setItem(STORAGE_KEYS.EVALUATIONS, JSON.stringify(evaluations));

      // 6. Fetch and Sync Sessions
      const { data: dbSessions } = await supabase.from('presentation_sessions').select('*');
      const sessions: Record<string, PresentationSession> = {};
      (dbSessions || []).forEach(s => {
        sessions[s.team_id] = {
          session_id: s.session_id,
          team_id: s.team_id,
          assigned_duration: s.assigned_duration || 240,
          start_time: s.start_time,
          end_time: s.end_time,
          status: s.status || 'scheduled',
          buzzer_triggered: !!s.buzzer_triggered,
          admin_id: s.admin_id
        };
      });
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));

      // 7. Fetch and Sync Audit Logs
      const { data: dbLogs } = await supabase.from('audit_logs').select('*');
      const auditLogs: AuditLog[] = (dbLogs || []).map(l => ({
        log_id: l.log_id,
        admin_id: l.admin_id || 'admin-1',
        admin_name: 'Admin',
        team_id: l.team_id,
        action: l.action,
        previous_value: l.previous_value || '',
        new_value: l.new_value || '',
        reason: l.reason || '',
        timestamp: l.timestamp
      }));
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(auditLogs));

      // Fetch final results manually overridden
      const { data: dbResults, error: resultsError } = await supabase.from('final_results').select('*');
      if (!resultsError && dbResults) {
        const overrides: Record<string, {
          selected: boolean;
          reason?: string;
          team_name?: string;
          team_lead_name?: string;
          problem_id?: string;
          problem_title?: string;
          category?: 'Software' | 'Hardware';
          index?: number;
        }> = {};
        dbResults.forEach(r => {
          if (r.admin_override || r.selected !== undefined) {
            let meta: any = {};
            try {
              if (r.override_reason && r.override_reason.trim().startsWith('{')) {
                meta = JSON.parse(r.override_reason);
              }
            } catch {}
            overrides[r.team_id] = {
              selected: !!r.selected,
              reason: meta.reason || r.override_reason || '',
              team_name: meta.team_name,
              team_lead_name: meta.team_lead_name,
              problem_id: meta.problem_id,
              problem_title: meta.problem_title,
              category: meta.category,
              index: meta.index
            };
          }
        });
        localStorage.setItem(STORAGE_KEYS.TOP50_OVERRIDES, JSON.stringify(overrides));
      }

      // If logged in, update current user's team_id if it matched or changed
      const currentUser = this.getCurrentUser();
      if (currentUser && (currentUser.role === 'team_lead' || !currentUser.team_id)) {
        const userEmail = (currentUser.email || '').trim().toLowerCase();
        if (userEmail) {
          const matchedTeam = teams.find(t =>
            (t.team_lead_email || '').trim().toLowerCase() === userEmail ||
            (t.members && t.members.some(m => (m.email || '').trim().toLowerCase() === userEmail))
          );
          if (matchedTeam && currentUser.team_id !== matchedTeam.team_id) {
            currentUser.team_id = matchedTeam.team_id;
            if (this.isBrowser()) {
              localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
            }
          }
        }
      }

      // Dispatch change events to update react listeners after currentUser is updated
      window.dispatchEvent(new Event('sih_teams_updated'));
      window.dispatchEvent(new Event('sih_evaluations_updated'));
      window.dispatchEvent(new Event('sih_session_updated'));
      window.dispatchEvent(new Event('sih_audit_updated'));
      window.dispatchEvent(new Event('sih_results_updated'));
      window.dispatchEvent(new Event('sih_auth_changed'));
    } catch (err) {
      console.error('Failed to sync state from Supabase:', err);
    }
  }

  static async checkTeamEvaluationCompletion(teamId: string): Promise<void> {
    if (!this.isBrowser()) return;
    const { createClient } = await import('@/utils/supabase/client');
    const supabase = createClient();
    
    // 1. Fetch team panel details
    const { data: teamData } = await supabase
      .from('teams')
      .select('panel')
      .eq('team_id', teamId)
      .maybeSingle();
      
    if (!teamData) return;
    const panelName = teamData.panel || 'Panel 1';

    // 2. Fetch all juries in that panel
    const { data: juries } = await supabase
      .from('profiles')
      .select('user_id, jury_id')
      .eq('role', 'jury')
      .eq('panel', panelName);

    const expectedJuryIds = (juries || [])
      .map(j => j.jury_id || j.user_id)
      .filter(Boolean);

    // 3. Fetch submitted evaluations for this team
    const { data: evals } = await supabase
      .from('jury_evaluations')
      .select('jury_id')
      .eq('team_id', teamId);

    const submittedJuryIds = (evals || []).map(e => e.jury_id);

    // 4. Determine completion: must have expected juries and all expected juries must have submitted
    const isCompleted = expectedJuryIds.length > 0 && expectedJuryIds.every(id => submittedJuryIds.includes(id));
    const completedAt = isCompleted ? new Date().toISOString() : null;

    // 5. Update team completed_at in Supabase
    await supabase
      .from('teams')
      .update({ completed_at: completedAt })
      .eq('team_id', teamId);

    // 6. Update local storage representation
    const teams = this.getTeams();
    const tIdx = teams.findIndex(t => t.team_id === teamId);
    if (tIdx > -1) {
      teams[tIdx].completed_at = completedAt || undefined;
      localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(teams));
      window.dispatchEvent(new Event('sih_teams_updated'));
    }
  }
}

