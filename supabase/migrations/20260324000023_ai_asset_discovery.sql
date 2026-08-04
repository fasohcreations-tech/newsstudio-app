-- =============================================================================
-- MediaOS Production Pipeline Step 2A
-- Migration: 20260324000023_ai_asset_discovery
--
-- AI Asset Discovery Engine — search + rank + editor approval for Story Panels.
-- Executes after AI Producer panels, before Scene Builder instances.
-- Never auto-publishes assets into scenes without editor acceptance.
-- =============================================================================

CREATE TYPE public.asset_discovery_run_status AS ENUM (
  'draft',
  'running',
  'ready',
  'failed',
  'archived'
);

CREATE TYPE public.asset_discovery_provider AS ENUM (
  'local_media_library',
  'supabase_storage',
  'organization_library',
  'free_image',
  'free_video',
  'licensed_stock',
  'news_agency',
  'custom_search',
  'previously_used'
);

CREATE TYPE public.asset_discovery_kind AS ENUM (
  'video',
  'image',
  'illustration',
  'map',
  'icon',
  'logo',
  'chart',
  'infographic',
  'document',
  'pdf',
  'screenshot',
  'other'
);

CREATE TYPE public.asset_discovery_decision AS ENUM (
  'pending',
  'accepted',
  'rejected',
  'replaced'
);

-- -----------------------------------------------------------------------------
-- story_asset_discovery_runs — one discovery session per story (latest live)
-- -----------------------------------------------------------------------------

CREATE TABLE public.story_asset_discovery_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES public.stories (id) ON DELETE CASCADE,
  status public.asset_discovery_run_status NOT NULL DEFAULT 'draft',
  panel_count INTEGER NOT NULL DEFAULT 0 CHECK (panel_count >= 0),
  preferred_provider public.asset_discovery_provider,
  ai_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  history JSONB NOT NULL DEFAULT '[]'::jsonb,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  updated_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT story_asset_discovery_runs_ai_metadata_object
    CHECK (jsonb_typeof(ai_metadata) = 'object'),
  CONSTRAINT story_asset_discovery_runs_history_array
    CHECK (jsonb_typeof(history) = 'array')
);

CREATE UNIQUE INDEX idx_story_asset_discovery_runs_story_live
  ON public.story_asset_discovery_runs (story_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_story_asset_discovery_runs_org
  ON public.story_asset_discovery_runs (organization_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER trg_story_asset_discovery_runs_updated_at
  BEFORE UPDATE ON public.story_asset_discovery_runs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.story_asset_discovery_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "story_asset_discovery_runs_select_member"
  ON public.story_asset_discovery_runs FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "story_asset_discovery_runs_insert_member"
  ON public.story_asset_discovery_runs FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id) AND created_by = auth.uid());

CREATE POLICY "story_asset_discovery_runs_update_member"
  ON public.story_asset_discovery_runs FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "story_asset_discovery_runs_delete_member"
  ON public.story_asset_discovery_runs FOR DELETE TO authenticated
  USING (public.is_org_member(organization_id));

COMMENT ON TABLE public.story_asset_discovery_runs IS
  'AI Asset Discovery session for a story. Suggestions only — never auto-binds scenes.';

-- -----------------------------------------------------------------------------
-- story_panel_asset_searches — query history per Story Panel
-- -----------------------------------------------------------------------------

CREATE TABLE public.story_panel_asset_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES public.stories (id) ON DELETE CASCADE,
  run_id UUID NOT NULL REFERENCES public.story_asset_discovery_runs (id) ON DELETE CASCADE,
  panel_index INTEGER NOT NULL CHECK (panel_index >= 0 AND panel_index < 16),
  scene_headline TEXT NOT NULL DEFAULT '',
  story_headline TEXT NOT NULL DEFAULT '',
  keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
  expanded_keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
  queries JSONB NOT NULL DEFAULT '[]'::jsonb,
  providers_queried TEXT[] NOT NULL DEFAULT '{}',
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT story_panel_asset_searches_keywords_array
    CHECK (jsonb_typeof(keywords) = 'array'),
  CONSTRAINT story_panel_asset_searches_expanded_array
    CHECK (jsonb_typeof(expanded_keywords) = 'array'),
  CONSTRAINT story_panel_asset_searches_queries_array
    CHECK (jsonb_typeof(queries) = 'array'),
  CONSTRAINT story_panel_asset_searches_context_object
    CHECK (jsonb_typeof(context) = 'object')
);

CREATE INDEX idx_story_panel_asset_searches_run
  ON public.story_panel_asset_searches (run_id, panel_index);

CREATE INDEX idx_story_panel_asset_searches_story
  ON public.story_panel_asset_searches (story_id, panel_index, created_at DESC);

ALTER TABLE public.story_panel_asset_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "story_panel_asset_searches_select_member"
  ON public.story_panel_asset_searches FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "story_panel_asset_searches_insert_member"
  ON public.story_panel_asset_searches FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id) AND created_by = auth.uid());

CREATE POLICY "story_panel_asset_searches_update_member"
  ON public.story_panel_asset_searches FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "story_panel_asset_searches_delete_member"
  ON public.story_panel_asset_searches FOR DELETE TO authenticated
  USING (public.is_org_member(organization_id));

COMMENT ON TABLE public.story_panel_asset_searches IS
  'Search history for Story Panel asset discovery (keywords, expanded queries, providers).';

-- -----------------------------------------------------------------------------
-- story_panel_asset_candidates — ranked suggestions + editor decisions
-- -----------------------------------------------------------------------------

CREATE TABLE public.story_panel_asset_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES public.stories (id) ON DELETE CASCADE,
  run_id UUID NOT NULL REFERENCES public.story_asset_discovery_runs (id) ON DELETE CASCADE,
  search_id UUID REFERENCES public.story_panel_asset_searches (id) ON DELETE SET NULL,
  panel_index INTEGER NOT NULL CHECK (panel_index >= 0 AND panel_index < 16),
  provider public.asset_discovery_provider NOT NULL,
  provider_asset_id TEXT,
  media_asset_id UUID REFERENCES public.media_assets (id) ON DELETE SET NULL,
  asset_kind public.asset_discovery_kind NOT NULL DEFAULT 'other',
  title TEXT NOT NULL DEFAULT '',
  thumbnail_url TEXT,
  preview_url TEXT,
  source_url TEXT,
  license_info TEXT NOT NULL DEFAULT '',
  resolution TEXT NOT NULL DEFAULT '',
  aspect_ratio TEXT NOT NULL DEFAULT '',
  orientation TEXT NOT NULL DEFAULT '',
  relevance_score REAL NOT NULL DEFAULT 0 CHECK (relevance_score >= 0 AND relevance_score <= 1),
  confidence REAL NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1),
  rank INTEGER NOT NULL DEFAULT 0 CHECK (rank >= 0),
  status public.asset_discovery_decision NOT NULL DEFAULT 'pending',
  decided_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  decision_note TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  updated_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT story_panel_asset_candidates_metadata_object
    CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX idx_story_panel_asset_candidates_run_panel
  ON public.story_panel_asset_candidates (run_id, panel_index, rank)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_story_panel_asset_candidates_story_status
  ON public.story_panel_asset_candidates (story_id, panel_index, status)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX idx_story_panel_asset_candidates_one_accepted
  ON public.story_panel_asset_candidates (story_id, panel_index)
  WHERE deleted_at IS NULL AND status = 'accepted';

CREATE TRIGGER trg_story_panel_asset_candidates_updated_at
  BEFORE UPDATE ON public.story_panel_asset_candidates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.story_panel_asset_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "story_panel_asset_candidates_select_member"
  ON public.story_panel_asset_candidates FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "story_panel_asset_candidates_insert_member"
  ON public.story_panel_asset_candidates FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id) AND created_by = auth.uid());

CREATE POLICY "story_panel_asset_candidates_update_member"
  ON public.story_panel_asset_candidates FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "story_panel_asset_candidates_delete_member"
  ON public.story_panel_asset_candidates FOR DELETE TO authenticated
  USING (public.is_org_member(organization_id));

COMMENT ON TABLE public.story_panel_asset_candidates IS
  'Ranked asset suggestions for Story Panels. Only status=accepted is bound to sub_headline_media.';
