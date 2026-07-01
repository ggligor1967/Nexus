-- v0.7: revision rows are server-written audit events.
-- Authenticated users may read revisions for their own projects, but direct
-- client INSERT/UPDATE is denied; writes go through service-role server code.
-- Mirrors SEC-003 (migration 0002) for ai_plan_runs.
DROP POLICY IF EXISTS "Users can insert revisions for own projects" ON public.revisions;
DROP POLICY IF EXISTS "Users can update revisions for own projects" ON public.revisions;
-- Note: migration 0001 never created an UPDATE policy on revisions, so the
-- second DROP is a harmless no-op kept for symmetry. SELECT-own is intentionally retained.
