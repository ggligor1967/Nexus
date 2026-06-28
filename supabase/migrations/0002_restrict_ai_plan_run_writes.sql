-- SEC-003: AI plan run writes must go through trusted server/service-role code.
-- Authenticated users may still read runs for their own projects, but direct
-- client INSERT/UPDATE is denied by RLS because no write policies remain.

DROP POLICY IF EXISTS "Users can insert runs for own projects" ON public.ai_plan_runs;
DROP POLICY IF EXISTS "Users can update runs for own projects" ON public.ai_plan_runs;
