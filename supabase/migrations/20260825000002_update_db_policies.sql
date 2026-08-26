-- 1. Policies for public.teams
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read of teams" ON public.teams;
DROP POLICY IF EXISTS "Allow public insert of teams" ON public.teams;
DROP POLICY IF EXISTS "Allow public update of teams" ON public.teams;

CREATE POLICY "Allow public read of teams" ON public.teams FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert of teams" ON public.teams FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update of teams" ON public.teams FOR UPDATE TO public USING (true);

-- 2. Policies for public.team_members
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read of team_members" ON public.team_members;
DROP POLICY IF EXISTS "Allow public insert of team_members" ON public.team_members;
DROP POLICY IF EXISTS "Allow public update of team_members" ON public.team_members;

CREATE POLICY "Allow public read of team_members" ON public.team_members FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert of team_members" ON public.team_members FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update of team_members" ON public.team_members FOR UPDATE TO public USING (true);

-- 3. Policies for public.problem_statements
ALTER TABLE public.problem_statements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read of problem_statements" ON public.problem_statements;
DROP POLICY IF EXISTS "Allow public insert of problem_statements" ON public.problem_statements;
DROP POLICY IF EXISTS "Allow public update of problem_statements" ON public.problem_statements;

CREATE POLICY "Allow public read of problem_statements" ON public.problem_statements FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert of problem_statements" ON public.problem_statements FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update of problem_statements" ON public.problem_statements FOR UPDATE TO public USING (true);

-- 4. Policies for public.team_problem_statements
ALTER TABLE public.team_problem_statements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read of team_problem_statements" ON public.team_problem_statements;
DROP POLICY IF EXISTS "Allow public insert of team_problem_statements" ON public.team_problem_statements;
DROP POLICY IF EXISTS "Allow public update of team_problem_statements" ON public.team_problem_statements;

CREATE POLICY "Allow public read of team_problem_statements" ON public.team_problem_statements FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert of team_problem_statements" ON public.team_problem_statements FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update of team_problem_statements" ON public.team_problem_statements FOR UPDATE TO public USING (true);
