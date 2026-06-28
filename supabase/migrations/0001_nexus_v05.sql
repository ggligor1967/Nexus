CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Public user profile synchronized with Supabase Auth.
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  preferred_language TEXT CHECK (preferred_language IN ('en', 'ro', 'bilingual')) DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('draft', 'generated', 'revised', 'exported')) DEFAULT 'draft',
  language TEXT CHECK (language IN ('en', 'ro', 'bilingual')) DEFAULT 'en',
  platform TEXT[] DEFAULT '{}',
  build_ready_acknowledged BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.concept_inputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  raw_concept TEXT NOT NULL,
  target_users TEXT,
  platform TEXT[] NOT NULL DEFAULT '{}',
  output_type TEXT CHECK (
    output_type IN ('mvp_plan', 'technical_plan', 'ux_flow', 'ethical_review', 'full_prd')
  ) DEFAULT 'full_prd',
  risk_domain TEXT CHECK (
    risk_domain IN ('general', 'health', 'finance', 'children', 'education', 'surveillance', 'legal', 'ai_safety')
  ) DEFAULT 'general',
  constraints JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_plan_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  concept_input_id UUID NOT NULL REFERENCES public.concept_inputs(id) ON DELETE CASCADE,
  model_name TEXT NOT NULL,
  status TEXT CHECK (status IN ('queued', 'running', 'completed', 'failed')) DEFAULT 'queued',
  raw_output TEXT,
  plan_json JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.exported_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  ai_plan_run_id UUID NOT NULL REFERENCES public.ai_plan_runs(id) ON DELETE CASCADE,
  format TEXT CHECK (format IN ('markdown', 'pdf')) NOT NULL,
  content TEXT,
  file_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  ai_plan_run_id UUID REFERENCES public.ai_plan_runs(id),
  revision_note TEXT,
  previous_snapshot JSONB,
  new_snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_concept_inputs_project_id ON public.concept_inputs(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_plan_runs_project_id ON public.ai_plan_runs(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_plan_runs_concept_input_id ON public.ai_plan_runs(concept_input_id);
CREATE INDEX IF NOT EXISTS idx_exported_plans_project_id ON public.exported_plans(project_id);

GRANT USAGE ON SCHEMA public TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Sync auth.users to public.users.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'name')
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      display_name = COALESCE(EXCLUDED.display_name, public.users.display_name),
      updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT OR UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concept_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_plan_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exported_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revisions ENABLE ROW LEVEL SECURITY;

-- Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile"
ON public.users FOR SELECT
TO authenticated
USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
ON public.users FOR UPDATE
TO authenticated
USING ((select auth.uid()) = id)
WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own profile fallback" ON public.users;
CREATE POLICY "Users can insert own profile fallback"
ON public.users FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = id);

-- Projects
DROP POLICY IF EXISTS "Users can select own projects" ON public.projects;
CREATE POLICY "Users can select own projects"
ON public.projects FOR SELECT
TO authenticated
USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;
CREATE POLICY "Users can insert own projects"
ON public.projects FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
CREATE POLICY "Users can update own projects"
ON public.projects FOR UPDATE
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;
CREATE POLICY "Users can delete own projects"
ON public.projects FOR DELETE
TO authenticated
USING ((select auth.uid()) = user_id);

-- Child table ownership helper: project must belong to current auth user.
-- concept_inputs
DROP POLICY IF EXISTS "Users can select concept inputs for own projects" ON public.concept_inputs;
CREATE POLICY "Users can select concept inputs for own projects"
ON public.concept_inputs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = concept_inputs.project_id
      AND p.user_id = (select auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can insert concept inputs for own projects" ON public.concept_inputs;
CREATE POLICY "Users can insert concept inputs for own projects"
ON public.concept_inputs FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = concept_inputs.project_id
      AND p.user_id = (select auth.uid())
  )
);

-- ai_plan_runs
DROP POLICY IF EXISTS "Users can select runs for own projects" ON public.ai_plan_runs;
CREATE POLICY "Users can select runs for own projects"
ON public.ai_plan_runs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = ai_plan_runs.project_id
      AND p.user_id = (select auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can insert runs for own projects" ON public.ai_plan_runs;
CREATE POLICY "Users can insert runs for own projects"
ON public.ai_plan_runs FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = ai_plan_runs.project_id
      AND p.user_id = (select auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can update runs for own projects" ON public.ai_plan_runs;
CREATE POLICY "Users can update runs for own projects"
ON public.ai_plan_runs FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = ai_plan_runs.project_id
      AND p.user_id = (select auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = ai_plan_runs.project_id
      AND p.user_id = (select auth.uid())
  )
);

-- exported_plans
DROP POLICY IF EXISTS "Users can select exports for own projects" ON public.exported_plans;
CREATE POLICY "Users can select exports for own projects"
ON public.exported_plans FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = exported_plans.project_id
      AND p.user_id = (select auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can insert exports for own projects" ON public.exported_plans;
CREATE POLICY "Users can insert exports for own projects"
ON public.exported_plans FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = exported_plans.project_id
      AND p.user_id = (select auth.uid())
  )
);

-- revisions
DROP POLICY IF EXISTS "Users can select revisions for own projects" ON public.revisions;
CREATE POLICY "Users can select revisions for own projects"
ON public.revisions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = revisions.project_id
      AND p.user_id = (select auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can insert revisions for own projects" ON public.revisions;
CREATE POLICY "Users can insert revisions for own projects"
ON public.revisions FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = revisions.project_id
      AND p.user_id = (select auth.uid())
  )
);
