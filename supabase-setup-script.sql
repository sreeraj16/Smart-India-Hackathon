-- ==========================================
-- SIH INTERNAL HACKATHON 2026 DB FIXES
-- Copy and paste this script directly into the Supabase SQL Editor
-- ==========================================

-- 1. Alter jury_id column type to VARCHAR(100) to support coordinator entries
ALTER TABLE public.jury_evaluations ALTER COLUMN jury_id TYPE VARCHAR(100);

-- 2. Drop the foreign key constraint on public.jury_evaluations.jury_id to profiles.user_id if it exists
-- This prevents constraint errors when submitting coordinator-entered jury marks
ALTER TABLE public.jury_evaluations DROP CONSTRAINT IF EXISTS jury_evaluations_jury_id_fkey;

-- 3. Ensure team_id is VARCHAR(100)
ALTER TABLE public.jury_evaluations ALTER COLUMN team_id TYPE VARCHAR(100);

-- 4. Recreate the team_id foreign key constraint pointing to public.teams
ALTER TABLE public.jury_evaluations DROP CONSTRAINT IF EXISTS jury_evaluations_team_id_fkey;
ALTER TABLE public.jury_evaluations ADD CONSTRAINT jury_evaluations_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(team_id) ON DELETE CASCADE;

-- 5. Create faculty_members table if not exists
CREATE TABLE IF NOT EXISTS public.faculty_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Enable RLS on faculty_members
ALTER TABLE public.faculty_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read of faculty_members" ON public.faculty_members;
DROP POLICY IF EXISTS "Allow public write of faculty_members" ON public.faculty_members;

CREATE POLICY "Allow public read of faculty_members" ON public.faculty_members FOR SELECT TO public USING (true);
CREATE POLICY "Allow public write of faculty_members" ON public.faculty_members FOR ALL TO public USING (true) WITH CHECK (true);

-- 7. Seed faculty names dynamically from registered jury profiles
INSERT INTO public.faculty_members (name) 
SELECT name FROM public.profiles 
WHERE role = 'jury'
ON CONFLICT (name) DO NOTHING;

-- 8. Add RLS policies for remaining tables to ensure public read/write/update access
ALTER TABLE public.ppt_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read of ppt_submissions" ON public.ppt_submissions;
DROP POLICY IF EXISTS "Allow public write of ppt_submissions" ON public.ppt_submissions;
CREATE POLICY "Allow public read of ppt_submissions" ON public.ppt_submissions FOR SELECT TO public USING (true);
CREATE POLICY "Allow public write of ppt_submissions" ON public.ppt_submissions FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE public.presentation_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read of presentation_sessions" ON public.presentation_sessions;
DROP POLICY IF EXISTS "Allow public write of presentation_sessions" ON public.presentation_sessions;
CREATE POLICY "Allow public read of presentation_sessions" ON public.presentation_sessions FOR SELECT TO public USING (true);
CREATE POLICY "Allow public write of presentation_sessions" ON public.presentation_sessions FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE public.jury_evaluations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read of jury_evaluations" ON public.jury_evaluations;
DROP POLICY IF EXISTS "Allow public write of jury_evaluations" ON public.jury_evaluations;
CREATE POLICY "Allow public read of jury_evaluations" ON public.jury_evaluations FOR SELECT TO public USING (true);
CREATE POLICY "Allow public write of jury_evaluations" ON public.jury_evaluations FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE public.final_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read of final_results" ON public.final_results;
DROP POLICY IF EXISTS "Allow public write of final_results" ON public.final_results;
CREATE POLICY "Allow public read of final_results" ON public.final_results FOR SELECT TO public USING (true);
CREATE POLICY "Allow public write of final_results" ON public.final_results FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read of audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow public write of audit_logs" ON public.audit_logs;
CREATE POLICY "Allow public read of audit_logs" ON public.audit_logs FOR SELECT TO public USING (true);
CREATE POLICY "Allow public write of audit_logs" ON public.audit_logs FOR ALL TO public USING (true) WITH CHECK (true);

-- Also ensure profiles has public read/write/update access for OAuth/signup sync
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read of profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow public write of profiles" ON public.profiles;
CREATE POLICY "Allow public read of profiles" ON public.profiles FOR SELECT TO public USING (true);
CREATE POLICY "Allow public write of profiles" ON public.profiles FOR ALL TO public USING (true) WITH CHECK (true);

