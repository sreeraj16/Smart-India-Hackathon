-- Add google_slides_url column to public.teams table
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS google_slides_url VARCHAR(500);

-- Reload schema cache in PostgREST
NOTIFY pgrst, 'reload schema';
