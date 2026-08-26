-- Alter jury_id type to VARCHAR(100) to support arbitrary non-UUID identifiers (like 'jury-1')
ALTER TABLE public.jury_evaluations ALTER COLUMN jury_id TYPE VARCHAR(100);
