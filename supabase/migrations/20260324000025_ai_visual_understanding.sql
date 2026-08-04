-- =============================================================================
-- MediaOS Asset Engine — Module 2.6 AI Visual Understanding Engine
-- Migration: 20260324000025_ai_visual_understanding
--
-- Analyzes videos once, stores reusable timecoded metadata + embeddings, and
-- recommends Story Panel clips. Editors always approve before clipping.
-- Does NOT replace the Asset Clip Editor — suggestions feed into it.
-- =============================================================================

CREATE TYPE public.visual_analysis_status AS ENUM (
  'queued',
  'running',
  'ready',
  'failed',
  'stale'
);

CREATE TYPE public.visual_event_kind AS ENUM (
  'scene_boundary',
  'shot_change',
  'keyframe',
  'speech',
  'ocr',
  'face',
  'object',
  'logo',
  'landmark',
  'location',
  'action',
  'keyword'
);

CREATE TYPE public.clip_suggestion_decision AS ENUM (
  'pending',
  'accepted',
  'rejected',
  'superseded'
);

-- -----------------------------------------------------------------------------
-- media_asset_analyses — one live analysis package per video asset
-- -----------------------------------------------------------------------------

CREATE TABLE public.media_asset_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  media_asset_id UUID NOT NULL REFERENCES public.media_assets (id) ON DELETE CASCADE,
  status public.visual_analysis_status NOT NULL DEFAULT 'queued',
  source_provider TEXT,
  source_url TEXT,
  duration_ms INTEGER CHECK (duration_ms IS NULL OR duration_ms >= 0),
  frame_rate NUMERIC(8, 3),
  transcript TEXT,
  keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary TEXT,
  semantic_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  model_version TEXT,
  ai_job_id UUID,
  error TEXT,
  analyzed_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  updated_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT media_asset_analyses_keywords_array
    CHECK (jsonb_typeof(keywords) = 'array'),
  CONSTRAINT media_asset_analyses_semantic_object
    CHECK (jsonb_typeof(semantic_payload) = 'object')
);

CREATE UNIQUE INDEX idx_media_asset_analyses_asset_live
  ON public.media_asset_analyses (media_asset_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_media_asset_analyses_org_status
  ON public.media_asset_analyses (organization_id, status)
  WHERE deleted_at IS NULL;

CREATE TRIGGER trg_media_asset_analyses_updated_at
  BEFORE UPDATE ON public.media_asset_analyses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.media_asset_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY media_asset_analyses_select_member
  ON public.media_asset_analyses FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY media_asset_analyses_insert_member
  ON public.media_asset_analyses FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id) AND created_by = auth.uid());

CREATE POLICY media_asset_analyses_update_member
  ON public.media_asset_analyses FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY media_asset_analyses_delete_member
  ON public.media_asset_analyses FOR DELETE TO authenticated
  USING (public.is_org_member(organization_id));

COMMENT ON TABLE public.media_asset_analyses IS
  'Reusable AI visual understanding package for a media asset. Reprocessed only when stale/forced.';

-- -----------------------------------------------------------------------------
-- media_asset_analysis_events — timecoded detections
-- -----------------------------------------------------------------------------

CREATE TABLE public.media_asset_analysis_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  analysis_id UUID NOT NULL REFERENCES public.media_asset_analyses (id) ON DELETE CASCADE,
  media_asset_id UUID NOT NULL REFERENCES public.media_assets (id) ON DELETE CASCADE,
  kind public.visual_event_kind NOT NULL,
  start_ms INTEGER NOT NULL CHECK (start_ms >= 0),
  end_ms INTEGER NOT NULL CHECK (end_ms >= start_ms),
  label TEXT NOT NULL DEFAULT '',
  confidence NUMERIC(5, 4) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT media_asset_analysis_events_payload_object
    CHECK (jsonb_typeof(payload) = 'object')
);

CREATE INDEX idx_media_asset_analysis_events_analysis
  ON public.media_asset_analysis_events (analysis_id, start_ms);

CREATE INDEX idx_media_asset_analysis_events_asset_kind
  ON public.media_asset_analysis_events (media_asset_id, kind, start_ms);

CREATE INDEX idx_media_asset_analysis_events_org
  ON public.media_asset_analysis_events (organization_id);

ALTER TABLE public.media_asset_analysis_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY media_asset_analysis_events_select_member
  ON public.media_asset_analysis_events FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY media_asset_analysis_events_write_member
  ON public.media_asset_analysis_events FOR ALL TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

-- -----------------------------------------------------------------------------
-- media_asset_embeddings — segment vectors for semantic clip search
-- (JSONB float arrays; cosine similarity computed in app until pgvector lands)
-- -----------------------------------------------------------------------------

CREATE TABLE public.media_asset_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  analysis_id UUID NOT NULL REFERENCES public.media_asset_analyses (id) ON DELETE CASCADE,
  media_asset_id UUID NOT NULL REFERENCES public.media_assets (id) ON DELETE CASCADE,
  segment_index INTEGER NOT NULL CHECK (segment_index >= 0),
  start_ms INTEGER NOT NULL CHECK (start_ms >= 0),
  end_ms INTEGER NOT NULL CHECK (end_ms > start_ms),
  text_content TEXT NOT NULL DEFAULT '',
  embedding JSONB NOT NULL DEFAULT '[]'::jsonb,
  model_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT media_asset_embeddings_embedding_array
    CHECK (jsonb_typeof(embedding) = 'array'),
  CONSTRAINT media_asset_embeddings_unique_segment
    UNIQUE (analysis_id, segment_index)
);

CREATE INDEX idx_media_asset_embeddings_asset
  ON public.media_asset_embeddings (media_asset_id, start_ms);

CREATE INDEX idx_media_asset_embeddings_org
  ON public.media_asset_embeddings (organization_id);

ALTER TABLE public.media_asset_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY media_asset_embeddings_select_member
  ON public.media_asset_embeddings FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY media_asset_embeddings_write_member
  ON public.media_asset_embeddings FOR ALL TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

-- -----------------------------------------------------------------------------
-- story_panel_clip_suggestions — AI clip recommendations for Story Panels
-- -----------------------------------------------------------------------------

CREATE TABLE public.story_panel_clip_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES public.stories (id) ON DELETE CASCADE,
  panel_index INTEGER NOT NULL CHECK (panel_index >= 0 AND panel_index < 16),
  media_asset_id UUID NOT NULL REFERENCES public.media_assets (id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES public.media_asset_analyses (id) ON DELETE SET NULL,
  suggested_in_ms INTEGER NOT NULL CHECK (suggested_in_ms >= 0),
  suggested_out_ms INTEGER NOT NULL,
  confidence NUMERIC(5, 4) NOT NULL DEFAULT 0.5
    CHECK (confidence >= 0 AND confidence <= 1),
  reason TEXT NOT NULL DEFAULT '',
  decision public.clip_suggestion_decision NOT NULL DEFAULT 'pending',
  accepted_clip_id UUID REFERENCES public.media_asset_clips (id) ON DELETE SET NULL,
  scene_headline TEXT NOT NULL DEFAULT '',
  story_headline TEXT NOT NULL DEFAULT '',
  keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
  voice_duration_ms INTEGER,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  model_version TEXT,
  ai_job_id UUID,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  decided_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT story_panel_clip_suggestions_out_after_in
    CHECK (suggested_out_ms > suggested_in_ms),
  CONSTRAINT story_panel_clip_suggestions_keywords_array
    CHECK (jsonb_typeof(keywords) = 'array'),
  CONSTRAINT story_panel_clip_suggestions_context_object
    CHECK (jsonb_typeof(context) = 'object')
);

CREATE INDEX idx_story_panel_clip_suggestions_story_panel
  ON public.story_panel_clip_suggestions (story_id, panel_index, created_at DESC);

CREATE INDEX idx_story_panel_clip_suggestions_asset
  ON public.story_panel_clip_suggestions (media_asset_id, decision);

CREATE INDEX idx_story_panel_clip_suggestions_org
  ON public.story_panel_clip_suggestions (organization_id);

CREATE TRIGGER trg_story_panel_clip_suggestions_updated_at
  BEFORE UPDATE ON public.story_panel_clip_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.story_panel_clip_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY story_panel_clip_suggestions_select_member
  ON public.story_panel_clip_suggestions FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY story_panel_clip_suggestions_insert_member
  ON public.story_panel_clip_suggestions FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id) AND created_by = auth.uid());

CREATE POLICY story_panel_clip_suggestions_update_member
  ON public.story_panel_clip_suggestions FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY story_panel_clip_suggestions_delete_member
  ON public.story_panel_clip_suggestions FOR DELETE TO authenticated
  USING (public.is_org_member(organization_id));

COMMENT ON TABLE public.story_panel_clip_suggestions IS
  'AI Visual Understanding clip suggestions. Never auto-attach to Story Panels.';

NOTIFY pgrst, 'reload schema';
