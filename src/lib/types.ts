export type UserRole = 'team_lead' | 'jury' | 'coordinator' | 'admin';

export interface UserProfile {
  user_id: string;
  name: string;
  email: string;
  role: UserRole;
  team_id?: string | null;
  jury_id?: string | null;
  panel?: string | null;
  created_at: string;
}

export interface TeamMember {
  member_id?: string;
  team_id?: string;
  name: string;
  id_number: string;
  email: string;
  phone: string;
  department: string;
  year: string;
  is_lead?: boolean;
  gender?: string;
}

export interface ProblemStatement {
  problem_id: string;
  problem_title: string;
  description: string;
  domain: string;
  category: 'Software' | 'Hardware';
}

export interface Team {
  team_id: string;
  team_name: string;
  team_lead_id: string;
  team_lead_name: string;
  team_lead_email: string;
  team_lead_phone: string;
  department: string;
  year: string;
  college: string;
  registration_status: 'pending' | 'registered' | 'disqualified';
  members: TeamMember[];
  selected_problem_statements: ProblemStatement[];
  ppt_submission?: PPTSubmission | null;
  panel?: string;
  presentation_completed?: boolean;
  completed_by?: string;
  completed_at?: string;
  google_slides_url?: string | null;
  created_at: string;
}

export interface PPTSubmission {
  ppt_id: string;
  team_id: string;
  file_name: string;
  file_path: string;
  file_url?: string;
  file_size?: string;
  status: 'Pending' | 'Uploaded' | 'Verified';
  uploaded_at: string;
}

export interface PresentationSession {
  session_id: string;
  team_id: string;
  assigned_duration: number; // in seconds (e.g. 240)
  start_time: string | null;
  end_time: string | null;
  status: 'scheduled' | 'ongoing' | 'paused' | 'completed';
  buzzer_triggered: boolean;
  admin_id?: string;
}

export interface JuryEvaluation {
  evaluation_id: string;
  jury_id: string;
  jury_name?: string;
  team_id: string;
  innovation_score: number;
  relevance_score: number;
  technical_score: number;
  presentation_score: number;
  qa_score: number;
  total_score: number;
  comments: string;
  submitted_at: string;
}

export interface FinalResult {
  team_id: string;
  rank: number;
  score: number;
  selected: boolean;
  admin_override: boolean;
  override_reason?: string;
  updated_at: string;
}

export interface AuditLog {
  log_id: string;
  admin_id: string;
  admin_name: string;
  team_id: string;
  action: string;
  previous_value: string;
  new_value: string;
  reason: string;
  timestamp: string;
}
