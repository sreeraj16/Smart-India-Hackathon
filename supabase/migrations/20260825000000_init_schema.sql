-- Smart India Hackathon (SIH) Internal Hackathon 2026 Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (Mirrors auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('team_lead', 'jury', 'admin')),
    team_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Teams Table
CREATE TABLE IF NOT EXISTS teams (
    team_id VARCHAR(100) PRIMARY KEY,
    team_name VARCHAR(255) NOT NULL,
    team_lead_id UUID REFERENCES profiles(user_id),
    registration_status VARCHAR(50) DEFAULT 'registered' CHECK (registration_status IN ('pending', 'registered', 'disqualified')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Team Members Table
CREATE TABLE IF NOT EXISTS team_members (
    member_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id VARCHAR(100) REFERENCES teams(team_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    roll_number VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    department VARCHAR(100) NOT NULL,
    year VARCHAR(20) NOT NULL,
    is_lead BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Problem Statements Table
CREATE TABLE IF NOT EXISTS problem_statements (
    problem_id VARCHAR(50) PRIMARY KEY,
    problem_title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    domain VARCHAR(100) NOT NULL,
    category VARCHAR(50) DEFAULT 'Software' CHECK (category IN ('Software', 'Hardware'))
);

-- 5. Team Problem Statements Mapping (max 2 per team)
CREATE TABLE IF NOT EXISTS team_problem_statements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id VARCHAR(100) REFERENCES teams(team_id) ON DELETE CASCADE,
    problem_id VARCHAR(50) REFERENCES problem_statements(problem_id) ON DELETE CASCADE,
    selection_order INT CHECK (selection_order IN (1, 2)),
    UNIQUE(team_id, selection_order),
    UNIQUE(team_id, problem_id)
);

-- 6. PPT Submissions Table
CREATE TABLE IF NOT EXISTS ppt_submissions (
    ppt_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id VARCHAR(100) UNIQUE REFERENCES teams(team_id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'Uploaded' CHECK (status IN ('Pending', 'Uploaded', 'Verified')),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Presentation Sessions Table (Realtime Timer)
CREATE TABLE IF NOT EXISTS presentation_sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id VARCHAR(100) UNIQUE REFERENCES teams(team_id) ON DELETE CASCADE,
    assigned_duration INT DEFAULT 240, -- seconds (default 4 minutes)
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'ongoing', 'paused', 'completed')),
    buzzer_triggered BOOLEAN DEFAULT FALSE,
    admin_id UUID REFERENCES profiles(user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Jury Evaluations Table
CREATE TABLE IF NOT EXISTS jury_evaluations (
    evaluation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jury_id UUID REFERENCES profiles(user_id),
    team_id VARCHAR(100) REFERENCES teams(team_id) ON DELETE CASCADE,
    innovation_score INT CHECK (innovation_score BETWEEN 0 AND 20),
    relevance_score INT CHECK (relevance_score BETWEEN 0 AND 20),
    technical_score INT CHECK (technical_score BETWEEN 0 AND 20),
    presentation_score INT CHECK (presentation_score BETWEEN 0 AND 20),
    qa_score INT CHECK (qa_score BETWEEN 0 AND 20),
    total_score INT CHECK (total_score BETWEEN 0 AND 100),
    comments TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(jury_id, team_id)
);

-- 9. Final Results Table
CREATE TABLE IF NOT EXISTS final_results (
    team_id VARCHAR(100) PRIMARY KEY REFERENCES teams(team_id) ON DELETE CASCADE,
    rank INT,
    score NUMERIC(5,2),
    selected BOOLEAN DEFAULT FALSE,
    admin_override BOOLEAN DEFAULT FALSE,
    override_reason TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES profiles(user_id),
    team_id VARCHAR(100) REFERENCES teams(team_id),
    action VARCHAR(255) NOT NULL,
    previous_value TEXT,
    new_value TEXT,
    reason TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE problem_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_problem_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppt_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE presentation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE jury_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE final_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Public read access for Problem Statements
CREATE POLICY "Public problem statements access" ON problem_statements FOR SELECT USING (true);

-- Team Lead Policies
CREATE POLICY "Team leads read own profile" ON profiles FOR SELECT USING (auth.uid() = user_id OR role = 'admin');
CREATE POLICY "Team leads view own team" ON teams FOR SELECT USING (auth.uid() = team_lead_id OR role IN ('admin', 'jury'));

-- Enable Supabase Realtime for Presentation Sessions
ALTER PUBLICATION supabase_realtime ADD TABLE presentation_sessions;
