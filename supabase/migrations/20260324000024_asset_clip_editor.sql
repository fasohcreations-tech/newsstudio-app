-- =============================================================================
-- MediaOS Module 2.5 – Asset Clip Editor
-- Migration: 20260324000024_asset_clip_editor
--
-- Clips are metadata overlays on media_assets (IN/OUT). Original assets are
-- never modified. Optional external_url supports YouTube / web-linked sources.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Extend media_assets for external / multi-source imports
-- -----------------------------------------------------------------------------

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS external_url TEXT,
  ADD COLUMN IF NOT EXISTS source_provider TEXT
    CHECK (
      source_provider IS NULL
      OR source_provider IN (
        'local_upload',
        'supabase_storage',
        'media_library',
        'youtube',
        'web_search',
        'other'
      )
    );

COMMENT ON COLUMN public.media_assets.external_url IS
  'Optional remote source (YouTube / web). Playback may use this instead of Storage.';
COMMENT ON COLUMN public.media_assets.source_provider IS
  'Import provider that registered this asset.';

CREATE INDEX IF NOT EXISTS idx_media_assets_source_provider
  ON public.media_assets (organization_id, source_provider)
  WHERE deleted_at IS NULL AND source_provider IS NOT NULL;

-- -----------------------------------------------------------------------------
-- media_asset_clips — reusable production clips (metadata ranges)
-- -----------------------------------------------------------------------------

CREATE TABLE public.media_asset_clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  parent_asset_id UUID NOT NULL REFERENCES public.media_assets (id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  notes TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}'::text[],
  in_point_ms INTEGER NOT NULL CHECK (in_point_ms >= 0),
  out_point_ms INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  frame_rate NUMERIC(8, 3) NOT NULL DEFAULT 30,
  width INTEGER,
  height INTEGER,
  thumbnail_url TEXT,
  poster_storage_bucket public.media_storage_scope,
  poster_storage_path TEXT,
  proxy_storage_bucket public.media_storage_scope,
  proxy_storage_path TEXT,
  audio_extracted BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  updated_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT media_asset_clips_name_not_blank CHECK (char_length(trim(name)) > 0),
  CONSTRAINT media_asset_clips_out_after_in CHECK (out_point_ms > in_point_ms),
  CONSTRAINT media_asset_clips_duration_matches
    CHECK (duration_ms = out_point_ms - in_point_ms)
);

CREATE INDEX idx_media_asset_clips_organization_id
  ON public.media_asset_clips (organization_id);
CREATE INDEX idx_media_asset_clips_parent_asset_id
  ON public.media_asset_clips (parent_asset_id);
CREATE INDEX idx_media_asset_clips_deleted_at
  ON public.media_asset_clips (deleted_at);
CREATE INDEX idx_media_asset_clips_tags
  ON public.media_asset_clips USING gin (tags);
CREATE INDEX idx_media_asset_clips_org_updated
  ON public.media_asset_clips (organization_id, updated_at DESC)
  WHERE deleted_at IS NULL;

CREATE TRIGGER trg_media_asset_clips_updated_at
  BEFORE UPDATE ON public.media_asset_clips
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.media_asset_clips ENABLE ROW LEVEL SECURITY;

CREATE POLICY media_asset_clips_select_member
  ON public.media_asset_clips
  FOR SELECT
  USING (public.is_org_member(organization_id));

CREATE POLICY media_asset_clips_insert_member
  ON public.media_asset_clips
  FOR INSERT
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY media_asset_clips_update_member
  ON public.media_asset_clips
  FOR UPDATE
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY media_asset_clips_delete_member
  ON public.media_asset_clips
  FOR DELETE
  USING (public.is_org_member(organization_id));

-- -----------------------------------------------------------------------------
-- clip_thumbnails — poster / scrub / generated stills for a clip
-- -----------------------------------------------------------------------------

CREATE TABLE public.clip_thumbnails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  clip_id UUID NOT NULL REFERENCES public.media_asset_clips (id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'poster'
    CHECK (kind IN ('poster', 'scrub', 'capture', 'proxy_poster')),
  timecode_ms INTEGER NOT NULL DEFAULT 0 CHECK (timecode_ms >= 0),
  storage_bucket public.media_storage_scope,
  storage_path TEXT,
  public_url TEXT,
  width INTEGER,
  height INTEGER,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT clip_thumbnails_has_location CHECK (
    storage_path IS NOT NULL OR public_url IS NOT NULL
  )
);

CREATE INDEX idx_clip_thumbnails_clip_id ON public.clip_thumbnails (clip_id);
CREATE INDEX idx_clip_thumbnails_org ON public.clip_thumbnails (organization_id);

CREATE UNIQUE INDEX idx_clip_thumbnails_one_primary
  ON public.clip_thumbnails (clip_id)
  WHERE is_primary = true;

ALTER TABLE public.clip_thumbnails ENABLE ROW LEVEL SECURITY;

CREATE POLICY clip_thumbnails_select_member
  ON public.clip_thumbnails
  FOR SELECT
  USING (public.is_org_member(organization_id));

CREATE POLICY clip_thumbnails_write_member
  ON public.clip_thumbnails
  FOR ALL
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

NOTIFY pgrst, 'reload schema';
