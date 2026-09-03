-- Migration: Add gender column to team_members table if not exists
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS gender VARCHAR(10) DEFAULT 'M';
NOTIFY pgrst, 'reload schema';
