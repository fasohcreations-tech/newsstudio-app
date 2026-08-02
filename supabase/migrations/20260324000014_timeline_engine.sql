-- =============================================================================
-- MediaOS Module 3.1 – Enterprise Timeline Engine
-- Migration: 20260324000014_timeline_engine
--
-- Extends Creative Studio for newsroom-grade multi-track editing.
-- No rendering, FFmpeg, export, or AI editing in this sprint.
-- =============================================================================

-- Extend track kinds (keep legacy values for backward compatibility)
ALTER TYPE public.creative_track_kind ADD VALUE IF NOT EXISTS 'image';
ALTER TYPE public.creative_track_kind ADD VALUE IF NOT EXISTS 'title';
ALTER TYPE public.creative_track_kind ADD VALUE IF NOT EXISTS 'voice';
ALTER TYPE public.creative_track_kind ADD VALUE IF NOT EXISTS 'music';
ALTER TYPE public.creative_track_kind ADD VALUE IF NOT EXISTS 'sfx';
ALTER TYPE public.creative_track_kind ADD VALUE IF NOT EXISTS 'marker';
ALTER TYPE public.creative_track_kind ADD VALUE IF NOT EXISTS 'ai_suggestion';

-- Extend clip kinds
ALTER TYPE public.creative_clip_kind ADD VALUE IF NOT EXISTS 'title';
ALTER TYPE public.creative_clip_kind ADD VALUE IF NOT EXISTS 'voice';
ALTER TYPE public.creative_clip_kind ADD VALUE IF NOT EXISTS 'music';
ALTER TYPE public.creative_clip_kind ADD VALUE IF NOT EXISTS 'sfx';
ALTER TYPE public.creative_clip_kind ADD VALUE IF NOT EXISTS 'ai_suggestion';

CREATE TYPE public.creative_timeline_link_kind AS ENUM (
  'story',
  'scene',
  'content_object',
  'voice_segment',
  'script_paragraph'
);

-- -----------------------------------------------------------------------------
-- timelines — story / content linking
-- -----------------------------------------------------------------------------

ALTER TABLE public.creative_studio_timelines
  ADD COLUMN IF NOT EXISTS story_id UUID REFERENCES public.stories (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scene_id UUID,
  ADD COLUMN IF NOT EXISTS content_object_id UUID REFERENCES public.content_objects (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS voice_segment_id UUID,
  ADD COLUMN IF NOT EXISTS script_paragraph_id UUID,
  ADD COLUMN IF NOT EXISTS magnetic_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ripple_mode TEXT NOT NULL DEFAULT 'off'
    CHECK (ripple_mode IN ('off', 'standard', 'trim', 'roll'));

COMMENT ON COLUMN public.creative_studio_timelines.ripple_mode IS
  'Ripple editing architecture placeholder: off | standard | trim | roll';

CREATE INDEX IF NOT EXISTS idx_creative_studio_timelines_story
  ON public.creative_studio_timelines (story_id)
  WHERE story_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_creative_studio_timelines_content_object
  ON public.creative_studio_timelines (content_object_id)
  WHERE content_object_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- timeline_tracks — enterprise track chrome
-- -----------------------------------------------------------------------------

ALTER TABLE public.creative_studio_timeline_tracks
  ADD COLUMN IF NOT EXISTS collapsed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS visible BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS solo BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS color_label TEXT NOT NULL DEFAULT 'default';

-- -----------------------------------------------------------------------------
-- timeline_clips — clip operations & story links
-- -----------------------------------------------------------------------------

ALTER TABLE public.creative_studio_timeline_clips
  ADD COLUMN IF NOT EXISTS locked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS muted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS color_label TEXT NOT NULL DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS content_object_id UUID REFERENCES public.content_objects (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scene_id UUID,
  ADD COLUMN IF NOT EXISTS voice_segment_id UUID,
  ADD COLUMN IF NOT EXISTS script_paragraph_id UUID,
  ADD COLUMN IF NOT EXISTS source_clip_id UUID REFERENCES public.creative_studio_timeline_clips (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_creative_studio_timeline_clips_content_object
  ON public.creative_studio_timeline_clips (content_object_id)
  WHERE deleted_at IS NULL AND content_object_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- timeline_markers — ruler markers (independent of clip markers)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.creative_studio_timeline_markers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  timeline_id UUID NOT NULL REFERENCES public.creative_studio_timelines (id) ON DELETE CASCADE,
  start_ms BIGINT NOT NULL DEFAULT 0 CHECK (start_ms >= 0),
  label TEXT NOT NULL DEFAULT 'Marker',
  color TEXT NOT NULL DEFAULT '#f59e0b',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT creative_studio_timeline_markers_metadata_object
    CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_creative_studio_timeline_markers_timeline
  ON public.creative_studio_timeline_markers (timeline_id, start_ms);

CREATE TRIGGER trg_creative_studio_timeline_markers_updated_at
  BEFORE UPDATE ON public.creative_studio_timeline_markers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.creative_studio_timeline_markers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creative_studio_timeline_markers_select_member"
  ON public.creative_studio_timeline_markers FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_timeline_markers_insert_member"
  ON public.creative_studio_timeline_markers FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id) AND created_by = auth.uid());

CREATE POLICY "creative_studio_timeline_markers_update_member"
  ON public.creative_studio_timeline_markers FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_timeline_markers_no_hard_delete"
  ON public.creative_studio_timeline_markers FOR DELETE TO authenticated
  USING (false);

GRANT SELECT, INSERT, UPDATE ON public.creative_studio_timeline_markers TO authenticated;

-- -----------------------------------------------------------------------------
-- timeline_links — flexible story / scene / script relationships
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.creative_studio_timeline_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  timeline_id UUID NOT NULL REFERENCES public.creative_studio_timelines (id) ON DELETE CASCADE,
  clip_id UUID REFERENCES public.creative_studio_timeline_clips (id) ON DELETE CASCADE,
  kind public.creative_timeline_link_kind NOT NULL,
  target_id UUID NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT creative_studio_timeline_links_metadata_object
    CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_creative_studio_timeline_links_timeline
  ON public.creative_studio_timeline_links (timeline_id, kind);

CREATE INDEX IF NOT EXISTS idx_creative_studio_timeline_links_clip
  ON public.creative_studio_timeline_links (clip_id)
  WHERE clip_id IS NOT NULL;

CREATE TRIGGER trg_creative_studio_timeline_links_updated_at
  BEFORE UPDATE ON public.creative_studio_timeline_links
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.creative_studio_timeline_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creative_studio_timeline_links_select_member"
  ON public.creative_studio_timeline_links FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_timeline_links_insert_member"
  ON public.creative_studio_timeline_links FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_timeline_links_update_member"
  ON public.creative_studio_timeline_links FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_timeline_links_no_hard_delete"
  ON public.creative_studio_timeline_links FOR DELETE TO authenticated
  USING (false);

GRANT SELECT, INSERT, UPDATE ON public.creative_studio_timeline_links TO authenticated;
