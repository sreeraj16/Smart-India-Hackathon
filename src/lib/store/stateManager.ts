import { Team, ProblemStatement, PresentationSession, JuryEvaluation, AuditLog, UserProfile, PPTSubmission } from '../types';
import { INITIAL_PROBLEM_STATEMENTS, INITIAL_TEAMS, INITIAL_EVALUATIONS, INITIAL_AUDIT_LOGS } from './hackathonStore';

const STORAGE_KEYS = {
  TEAMS: 'sih_2026_teams',
  PROBLEMS: 'sih_2026_problems',
  EVALUATIONS: 'sih_2026_evaluations',
  SESSIONS: 'sih_2026_sessions',
  AUDIT_LOGS: 'sih_2026_audit_logs',
  TOP50_OVERRIDES: 'sih_2026_top50_overrides',
  CURRENT_USER: 'sih_2026_current_user',
};

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
    if (!this.isBrowser()) return INITIAL_TEAMS;
    const stored = localStorage.getItem(STORAGE_KEYS.TEAMS);
    if (!stored) {
      localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(INITIAL_TEAMS));
      return INITIAL_TEAMS;
    }
    try {
      const parsed = JSON.parse(stored);
      // Clean old mock teams from localStorage
      if (Array.isArray(parsed) && parsed.some((t: any) => String(t.team_id).startsWith('SIH-2026-') || String(t.team_id) === 'mock-team-1')) {
        localStorage.removeItem(STORAGE_KEYS.TEAMS);
        return [];
      }
      return parsed;
    } catch {
      return INITIAL_TEAMS;
    }
  }

  static getTeamById(teamId: string): Team | undefined {
    const teams = this.getTeams();
    return teams.find(t => t.team_id.toLowerCase() === teamId.toLowerCase());
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
    }
  }

  // --- MANUAL TOP 50 OVERRIDES ---
  static getTop50Overrides(): Record<string, { selected: boolean; reason: string }> {
    if (!this.isBrowser()) return {};
    const stored = localStorage.getItem(STORAGE_KEYS.TOP50_OVERRIDES);
    if (!stored) return {};
    try {
      return JSON.parse(stored);
    } catch {
      return {};
    }
  }

  static setTop50Override(teamId: string, selected: boolean, reason: string, adminName: string = 'Admin'): void {
    const overrides = this.getTop50Overrides();
    const prevStatus = overrides[teamId]?.selected ? 'Selected' : 'Not Selected';
    overrides[teamId] = { selected, reason };
    
    if (this.isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.TOP50_OVERRIDES, JSON.stringify(overrides));
      window.dispatchEvent(new Event('sih_results_updated'));
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
}
