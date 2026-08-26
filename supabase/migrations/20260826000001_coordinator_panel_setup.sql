-- Add coordinator tracking columns to public.teams table
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS panel VARCHAR(50) DEFAULT 'Panel 1';
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS presentation_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS completed_by VARCHAR(50);
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Create faculty_members table to list eligible evaluators
CREATE TABLE IF NOT EXISTS public.faculty_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS policies for faculty_members
ALTER TABLE public.faculty_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read of faculty_members" ON public.faculty_members;
DROP POLICY IF EXISTS "Allow public write of faculty_members" ON public.faculty_members;

CREATE POLICY "Allow public read of faculty_members" ON public.faculty_members FOR SELECT TO public USING (true);
CREATE POLICY "Allow public write of faculty_members" ON public.faculty_members FOR ALL TO public USING (true) WITH CHECK (true);

-- Seed initial faculty names if not already present
INSERT INTO public.faculty_members (name) 
VALUES 
    ('Dr. Faculty One'),
    ('Dr. Faculty Two'),
    ('Dr. Faculty Three'),
    ('Dr. Faculty Four')
ON CONFLICT (name) DO NOTHING;
