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
