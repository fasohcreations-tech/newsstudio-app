-- =============================================================================
-- MediaOS Module 6.0 – AI Center Integration Platform
-- Migration: 20260324000019_ai_center_intelligence
--
-- Recommendation ledger for Story / Scene / Timeline / Asset / Graphics /
-- Voice / Broadcast intelligence. Suggestions only — never auto-applied.
-- =============================================================================

CREATE TYPE public.ai_intelligence_domain AS ENUM (
  'story',
  'scene',
  'timeline',
  'asset',
  'graphics',
  'voice',
  'broadcast'
);

CREATE TYPE public.ai_recommendation_status AS ENUM (
  'pending',
  'accepted',
  'rejected',
  'superseded',
  'expired'
);

CREATE TYPE public.ai_recommendation_action AS ENUM (
  'created',
  'accepted',
  'rejected',
  'superseded',
  'expired',
  'regenerated'
);

-- -----------------------------------------------------------------------------
-- ai_recommendations
-- Editable AI suggestions awaiting explicit human accept/reject.
-- -----------------------------------------------------------------------------

CREATE TABLE public.ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  domain public.ai_intelligence_domain NOT NULL,
  recommendation_type TEXT NOT NULL,
  status public.ai_recommendation_status NOT NULL DEFAULT 'pending',
  title TEXT NOT NULL,
  summary TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence NUMERIC(4, 3) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  model_version TEXT,
  prompt_id TEXT,
  prompt_version TEXT,
  ai_job_id UUID REFERENCES public.ai_jobs (id) ON DELETE SET NULL,
  story_id UUID REFERENCES public.stories (id) ON DELETE SET NULL,
  project_id UUID,
  scene_id UUID,
  media_asset_id UUID REFERENCES public.media_assets (id) ON DELETE SET NULL,
  timeline_id UUID,
  source_recommendation_id UUID REFERENCES public.ai_recommendations (id) ON DELETE SET NULL,
  origin TEXT NOT NULL DEFAULT 'ai'
    CHECK (origin IN ('ai', 'manual', 'hybrid')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  rejected_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  rejection_reason TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  updated_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT ai_recommendations_type_not_blank CHECK (char_length(trim(recommendation_type)) > 0),
  CONSTRAINT ai_recommendations_title_not_blank CHECK (char_length(trim(title)) > 0),
  CONSTRAINT ai_recommendations_payload_object CHECK (jsonb_typeof(payload) = 'object'),
  CONSTRAINT ai_recommendations_metadata_object CHECK (jsonb_typeof(metadata) = 'object')
);

COMMENT ON TABLE public.ai_recommendations IS
  'Module 6.0 AI Center recommendations. Never auto-applied to production records.';

CREATE INDEX idx_ai_recommendations_org_domain
  ON public.ai_recommendations (organization_id, domain)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_ai_recommendations_status
  ON public.ai_recommendations (status)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_ai_recommendations_story
  ON public.ai_recommendations (story_id)
  WHERE deleted_at IS NULL AND story_id IS NOT NULL;
CREATE INDEX idx_ai_recommendations_asset
  ON public.ai_recommendations (media_asset_id)
  WHERE deleted_at IS NULL AND media_asset_id IS NOT NULL;
CREATE INDEX idx_ai_recommendations_job
  ON public.ai_recommendations (ai_job_id)
  WHERE ai_job_id IS NOT NULL;
CREATE INDEX idx_ai_recommendations_created
  ON public.ai_recommendations (created_at DESC);

CREATE TRIGGER trg_ai_recommendations_updated_at
  BEFORE UPDATE ON public.ai_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_recommendations_select_member"
  ON public.ai_recommendations FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "ai_recommendations_insert_member"
  ON public.ai_recommendations FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "ai_recommendations_update_member"
  ON public.ai_recommendations FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

-- Soft-delete only — no hard DELETE policy (audit retention).

-- -----------------------------------------------------------------------------
-- ai_recommendation_events — immutable audit trail
-- -----------------------------------------------------------------------------

CREATE TABLE public.ai_recommendation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  recommendation_id UUID NOT NULL REFERENCES public.ai_recommendations (id) ON DELETE CASCADE,
  action public.ai_recommendation_action NOT NULL,
  actor_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT ai_recommendation_events_detail_object CHECK (jsonb_typeof(detail) = 'object')
);

COMMENT ON TABLE public.ai_recommendation_events IS
  'Audit history for AI recommendation accept / reject / regenerate.';

CREATE INDEX idx_ai_recommendation_events_rec
  ON public.ai_recommendation_events (recommendation_id, created_at DESC);
CREATE INDEX idx_ai_recommendation_events_org
  ON public.ai_recommendation_events (organization_id, created_at DESC);

ALTER TABLE public.ai_recommendation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_recommendation_events_select_member"
  ON public.ai_recommendation_events FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "ai_recommendation_events_insert_member"
  ON public.ai_recommendation_events FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id));
