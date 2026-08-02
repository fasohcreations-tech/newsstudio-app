-- =============================================================================
-- MediaOS Feature 004.5 – Core Content Architecture
-- Migration: 20260324000007_core_content_architecture
--
-- Story-centric content model linking future AI, render, and publish pipelines.
-- Does NOT implement AI / render / publish execution — schema + RLS only.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------

CREATE TYPE public.content_object_type AS ENUM (
  'script',
  'article',
  'video_package',
  'graphic',
  'voiceover',
  'timeline',
  'clip',
  'package',
  'other'
);

CREATE TYPE public.content_object_status AS ENUM (
  'draft',
  'in_progress',
  'ready',
  'published',
  'archived',
  'failed'
);

CREATE TYPE public.output_platform AS ENUM (
  'youtube',
  'facebook',
  'instagram',
  'website',
  'telegram',
  'broadcast',
  'shorts',
  'reels'
);

CREATE TYPE public.output_package_status AS ENUM (
  'draft',
  'ready',
  'published',
  'failed'
);

CREATE TYPE public.ai_job_status AS ENUM (
  'queued',
  'running',
  'succeeded',
  'failed',
  'cancelled'
);

CREATE TYPE public.render_job_status AS ENUM (
  'queued',
  'running',
  'succeeded',
  'failed',
  'cancelled'
);

CREATE TYPE public.publish_job_status AS ENUM (
  'queued',
  'scheduled',
  'publishing',
  'published',
  'failed',
  'cancelled'
);

-- -----------------------------------------------------------------------------
-- content_objects
-- Canonical work products derived from a Story (script package, graphic, etc.)
-- -----------------------------------------------------------------------------

CREATE TABLE public.content_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES public.stories (id) ON DELETE CASCADE,
  type public.content_object_type NOT NULL DEFAULT 'other',
  title TEXT NOT NULL,
  status public.content_object_status NOT NULL DEFAULT 'draft',
  language TEXT NOT NULL DEFAULT 'en',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  updated_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT content_objects_title_not_blank CHECK (char_length(trim(title)) > 0),
  CONSTRAINT content_objects_language_not_blank CHECK (char_length(trim(language)) > 0),
  CONSTRAINT content_objects_metadata_object CHECK (jsonb_typeof(metadata) = 'object')
);

COMMENT ON TABLE public.content_objects IS
  'Story-scoped content units. Future modules attach AI/render/publish jobs to these rows.';

CREATE INDEX idx_content_objects_organization_id ON public.content_objects (organization_id);
CREATE INDEX idx_content_objects_story_id ON public.content_objects (story_id)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_content_objects_type ON public.content_objects (type) WHERE deleted_at IS NULL;
CREATE INDEX idx_content_objects_status ON public.content_objects (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_content_objects_updated_at ON public.content_objects (updated_at DESC);
CREATE INDEX idx_content_objects_deleted_at ON public.content_objects (deleted_at);
CREATE INDEX idx_content_objects_metadata ON public.content_objects USING gin (metadata);

CREATE TRIGGER trg_content_objects_updated_at
  BEFORE UPDATE ON public.content_objects
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.content_objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_objects_select_member"
  ON public.content_objects FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "content_objects_insert_member"
  ON public.content_objects FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_member(organization_id)
    AND created_by = auth.uid()
  );

CREATE POLICY "content_objects_update_member"
  ON public.content_objects FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "content_objects_no_hard_delete"
  ON public.content_objects FOR DELETE TO authenticated
  USING (false);

GRANT SELECT, INSERT, UPDATE ON public.content_objects TO authenticated;

-- -----------------------------------------------------------------------------
-- output_packages
-- Platform-specific delivery packages produced from a content object
-- -----------------------------------------------------------------------------

CREATE TABLE public.output_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES public.stories (id) ON DELETE CASCADE,
  content_object_id UUID NOT NULL REFERENCES public.content_objects (id) ON DELETE CASCADE,
  platform public.output_platform NOT NULL,
  status public.output_package_status NOT NULL DEFAULT 'draft',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  updated_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT output_packages_metadata_object CHECK (jsonb_typeof(metadata) = 'object')
);

COMMENT ON TABLE public.output_packages IS
  'Per-platform packaging of a content object (YouTube, Reels, website, broadcast, etc.).';

CREATE INDEX idx_output_packages_organization_id ON public.output_packages (organization_id);
CREATE INDEX idx_output_packages_story_id ON public.output_packages (story_id)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_output_packages_content_object_id ON public.output_packages (content_object_id)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_output_packages_platform ON public.output_packages (platform)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_output_packages_status ON public.output_packages (status)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_output_packages_updated_at ON public.output_packages (updated_at DESC);
CREATE INDEX idx_output_packages_metadata ON public.output_packages USING gin (metadata);

CREATE TRIGGER trg_output_packages_updated_at
  BEFORE UPDATE ON public.output_packages
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.output_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "output_packages_select_member"
  ON public.output_packages FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "output_packages_insert_member"
  ON public.output_packages FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_member(organization_id)
    AND created_by = auth.uid()
  );

CREATE POLICY "output_packages_update_member"
  ON public.output_packages FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "output_packages_no_hard_delete"
  ON public.output_packages FOR DELETE TO authenticated
  USING (false);

GRANT SELECT, INSERT, UPDATE ON public.output_packages TO authenticated;

-- -----------------------------------------------------------------------------
-- ai_jobs
-- Queued / completed AI provider jobs (architecture only — no execution)
-- -----------------------------------------------------------------------------

CREATE TABLE public.ai_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES public.stories (id) ON DELETE CASCADE,
  content_object_id UUID REFERENCES public.content_objects (id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  model TEXT,
  job_type TEXT NOT NULL,
  status public.ai_job_status NOT NULL DEFAULT 'queued',
  request JSONB NOT NULL DEFAULT '{}'::jsonb,
  response JSONB,
  tokens_used INTEGER CHECK (tokens_used IS NULL OR tokens_used >= 0),
  cost NUMERIC(12, 6) CHECK (cost IS NULL OR cost >= 0),
  processing_time_ms INTEGER CHECK (processing_time_ms IS NULL OR processing_time_ms >= 0),
  error TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  updated_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT ai_jobs_provider_not_blank CHECK (char_length(trim(provider)) > 0),
  CONSTRAINT ai_jobs_job_type_not_blank CHECK (char_length(trim(job_type)) > 0),
  CONSTRAINT ai_jobs_request_object CHECK (jsonb_typeof(request) = 'object')
);

COMMENT ON TABLE public.ai_jobs IS
  'AI job ledger for Story Workspace. Execution pipelines land here in later features.';

COMMENT ON COLUMN public.ai_jobs.processing_time_ms IS
  'Processing duration in milliseconds (spec field: processing_time).';
CREATE INDEX idx_ai_jobs_organization_id ON public.ai_jobs (organization_id);
CREATE INDEX idx_ai_jobs_story_id ON public.ai_jobs (story_id);
CREATE INDEX idx_ai_jobs_content_object_id ON public.ai_jobs (content_object_id);
CREATE INDEX idx_ai_jobs_status ON public.ai_jobs (status);
CREATE INDEX idx_ai_jobs_job_type ON public.ai_jobs (job_type);
CREATE INDEX idx_ai_jobs_created_at ON public.ai_jobs (created_at DESC);

CREATE TRIGGER trg_ai_jobs_updated_at
  BEFORE UPDATE ON public.ai_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.ai_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_jobs_select_member"
  ON public.ai_jobs FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "ai_jobs_insert_member"
  ON public.ai_jobs FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_member(organization_id)
    AND created_by = auth.uid()
  );

CREATE POLICY "ai_jobs_update_member"
  ON public.ai_jobs FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "ai_jobs_no_hard_delete"
  ON public.ai_jobs FOR DELETE TO authenticated
  USING (false);

GRANT SELECT, INSERT, UPDATE ON public.ai_jobs TO authenticated;

-- -----------------------------------------------------------------------------
-- render_jobs
-- Media render / encode jobs (architecture only — no execution)
-- -----------------------------------------------------------------------------

CREATE TABLE public.render_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES public.stories (id) ON DELETE CASCADE,
  content_object_id UUID REFERENCES public.content_objects (id) ON DELETE SET NULL,
  renderer TEXT NOT NULL,
  status public.render_job_status NOT NULL DEFAULT 'queued',
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  output_path TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  error TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  updated_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT render_jobs_renderer_not_blank CHECK (char_length(trim(renderer)) > 0),
  CONSTRAINT render_jobs_finished_after_start CHECK (
    finished_at IS NULL OR started_at IS NULL OR finished_at >= started_at
  )
);

COMMENT ON TABLE public.render_jobs IS
  'Render / encode job ledger. Timeline and BroadcastOS will enqueue rows here later.';

CREATE INDEX idx_render_jobs_organization_id ON public.render_jobs (organization_id);
CREATE INDEX idx_render_jobs_story_id ON public.render_jobs (story_id);
CREATE INDEX idx_render_jobs_content_object_id ON public.render_jobs (content_object_id);
CREATE INDEX idx_render_jobs_status ON public.render_jobs (status);
CREATE INDEX idx_render_jobs_created_at ON public.render_jobs (created_at DESC);

CREATE TRIGGER trg_render_jobs_updated_at
  BEFORE UPDATE ON public.render_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.render_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "render_jobs_select_member"
  ON public.render_jobs FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "render_jobs_insert_member"
  ON public.render_jobs FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_member(organization_id)
    AND created_by = auth.uid()
  );

CREATE POLICY "render_jobs_update_member"
  ON public.render_jobs FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "render_jobs_no_hard_delete"
  ON public.render_jobs FOR DELETE TO authenticated
  USING (false);

GRANT SELECT, INSERT, UPDATE ON public.render_jobs TO authenticated;

-- -----------------------------------------------------------------------------
-- publish_jobs
-- Destination publishing jobs against an output package (architecture only)
-- -----------------------------------------------------------------------------

CREATE TABLE public.publish_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES public.stories (id) ON DELETE CASCADE,
  output_package_id UUID NOT NULL REFERENCES public.output_packages (id) ON DELETE CASCADE,
  destination public.output_platform NOT NULL,
  status public.publish_job_status NOT NULL DEFAULT 'queued',
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  response JSONB,
  error TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  updated_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

COMMENT ON TABLE public.publish_jobs IS
  'Publish job ledger bound to output_packages. No delivery adapters in this sprint.';

CREATE INDEX idx_publish_jobs_organization_id ON public.publish_jobs (organization_id);
CREATE INDEX idx_publish_jobs_story_id ON public.publish_jobs (story_id);
CREATE INDEX idx_publish_jobs_output_package_id ON public.publish_jobs (output_package_id);
CREATE INDEX idx_publish_jobs_destination ON public.publish_jobs (destination);
CREATE INDEX idx_publish_jobs_status ON public.publish_jobs (status);
CREATE INDEX idx_publish_jobs_scheduled_at ON public.publish_jobs (scheduled_at)
  WHERE scheduled_at IS NOT NULL;
CREATE INDEX idx_publish_jobs_created_at ON public.publish_jobs (created_at DESC);

CREATE TRIGGER trg_publish_jobs_updated_at
  BEFORE UPDATE ON public.publish_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.publish_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "publish_jobs_select_member"
  ON public.publish_jobs FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "publish_jobs_insert_member"
  ON public.publish_jobs FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_member(organization_id)
    AND created_by = auth.uid()
  );

CREATE POLICY "publish_jobs_update_member"
  ON public.publish_jobs FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "publish_jobs_no_hard_delete"
  ON public.publish_jobs FOR DELETE TO authenticated
  USING (false);

GRANT SELECT, INSERT, UPDATE ON public.publish_jobs TO authenticated;
