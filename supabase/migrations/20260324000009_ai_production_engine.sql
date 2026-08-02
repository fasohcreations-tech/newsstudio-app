-- =============================================================================
-- MediaOS Module 2 – AI Production Engine Foundation
-- Migration: 20260324000009_ai_production_engine
--
-- Workflow + task tracking for Story → production pipelines.
-- Mock execution only — no external AI providers in this sprint.
-- =============================================================================

CREATE TYPE public.ai_workflow_status AS ENUM (
  'queued',
  'running',
  'waiting_for_approval',
  'completed',
  'failed',
  'cancelled'
);

CREATE TYPE public.ai_workflow_task_type AS ENUM (
  'research',
  'headline_suggestion',
  'summary',
  'script_generation',
  'translation',
  'voice_over',
  'timeline_draft',
  'thumbnail_suggestion',
  'poster_suggestion',
  'seo_metadata',
  'social_media_package'
);

CREATE TYPE public.ai_workflow_task_status AS ENUM (
  'queued',
  'running',
  'waiting_for_approval',
  'completed',
  'failed',
  'cancelled',
  'rejected'
);

CREATE TYPE public.ai_production_stage AS ENUM (
  'research',
  'editorial',
  'script',
  'translation',
  'voice',
  'timeline',
  'graphics',
  'publishing'
);

-- -----------------------------------------------------------------------------
-- ai_workflows
-- -----------------------------------------------------------------------------

CREATE TABLE public.ai_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES public.stories (id) ON DELETE CASCADE,
  status public.ai_workflow_status NOT NULL DEFAULT 'queued',
  current_stage public.ai_production_stage,
  estimated_seconds INTEGER NOT NULL DEFAULT 0 CHECK (estimated_seconds >= 0),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  updated_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT ai_workflows_metadata_object CHECK (jsonb_typeof(metadata) = 'object')
);

COMMENT ON TABLE public.ai_workflows IS
  'AI Production Engine workflow instances bound to a Story. Mock runners only in Module 2.';

CREATE INDEX idx_ai_workflows_organization_id ON public.ai_workflows (organization_id);
CREATE INDEX idx_ai_workflows_story_id ON public.ai_workflows (story_id)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_ai_workflows_status ON public.ai_workflows (status)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_ai_workflows_created_at ON public.ai_workflows (created_at DESC);

CREATE TRIGGER trg_ai_workflows_updated_at
  BEFORE UPDATE ON public.ai_workflows
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.ai_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_workflows_select_member"
  ON public.ai_workflows FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "ai_workflows_insert_member"
  ON public.ai_workflows FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_member(organization_id)
    AND created_by = auth.uid()
  );

CREATE POLICY "ai_workflows_update_member"
  ON public.ai_workflows FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "ai_workflows_no_hard_delete"
  ON public.ai_workflows FOR DELETE TO authenticated
  USING (false);

GRANT SELECT, INSERT, UPDATE ON public.ai_workflows TO authenticated;

-- -----------------------------------------------------------------------------
-- ai_workflow_tasks
-- -----------------------------------------------------------------------------

CREATE TABLE public.ai_workflow_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES public.ai_workflows (id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES public.stories (id) ON DELETE CASCADE,
  task_type public.ai_workflow_task_type NOT NULL,
  stage public.ai_production_stage NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status public.ai_workflow_task_status NOT NULL DEFAULT 'queued',
  provider TEXT,
  model TEXT,
  ai_job_id UUID REFERENCES public.ai_jobs (id) ON DELETE SET NULL,
  input JSONB NOT NULL DEFAULT '{}'::jsonb,
  output JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_version INTEGER NOT NULL DEFAULT 1 CHECK (output_version >= 1),
  estimated_seconds INTEGER NOT NULL DEFAULT 0 CHECK (estimated_seconds >= 0),
  error TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  rejected_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  rejection_reason TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  updated_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT ai_workflow_tasks_input_object CHECK (jsonb_typeof(input) = 'object'),
  CONSTRAINT ai_workflow_tasks_output_object CHECK (jsonb_typeof(output) = 'object')
);

COMMENT ON TABLE public.ai_workflow_tasks IS
  'Editable AI Production tasks. Outputs require Approve before the pipeline continues.';

CREATE INDEX idx_ai_workflow_tasks_organization_id ON public.ai_workflow_tasks (organization_id);
CREATE INDEX idx_ai_workflow_tasks_workflow_id ON public.ai_workflow_tasks (workflow_id)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_ai_workflow_tasks_story_id ON public.ai_workflow_tasks (story_id)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_ai_workflow_tasks_status ON public.ai_workflow_tasks (status)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_ai_workflow_tasks_sort ON public.ai_workflow_tasks (workflow_id, sort_order);

CREATE TRIGGER trg_ai_workflow_tasks_updated_at
  BEFORE UPDATE ON public.ai_workflow_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.ai_workflow_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_workflow_tasks_select_member"
  ON public.ai_workflow_tasks FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "ai_workflow_tasks_insert_member"
  ON public.ai_workflow_tasks FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_member(organization_id)
    AND created_by = auth.uid()
  );

CREATE POLICY "ai_workflow_tasks_update_member"
  ON public.ai_workflow_tasks FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "ai_workflow_tasks_no_hard_delete"
  ON public.ai_workflow_tasks FOR DELETE TO authenticated
  USING (false);

GRANT SELECT, INSERT, UPDATE ON public.ai_workflow_tasks TO authenticated;
