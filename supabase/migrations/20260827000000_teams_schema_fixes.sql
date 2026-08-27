-- Database schema fixes for Teams table
-- Adds panel assignment and presentation completion columns to teams if they do not exist

ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS panel VARCHAR(50) DEFAULT 'Panel 1';
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS presentation_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS completed_by VARCHAR(50);
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Reload schema cache in PostgREST
NOTIFY pgrst, 'reload schema';
