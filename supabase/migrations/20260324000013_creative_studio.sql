-- =============================================================================
-- MediaOS Module 3.0 – Creative Studio Foundation
-- Migration: 20260324000013_creative_studio
--
-- Manual editing first. No rendering, FFmpeg, export, or AI editing in this sprint.
-- =============================================================================

CREATE TYPE public.creative_project_status AS ENUM (
  'draft',
  'active',
  'archived'
);

CREATE TYPE public.creative_track_kind AS ENUM (
  'video',
  'audio',
  'graphics',
  'subtitle'
);

CREATE TYPE public.creative_clip_kind AS ENUM (
  'image',
  'video',
  'audio',
  'graphic',
  'subtitle',
  'marker'
);

CREATE TYPE public.creative_placeholder_kind AS ENUM (
  'headline',
  'anchor',
  'image',
  'video',
  'voice',
  'music',
  'logo',
  'ticker',
  'outro'
);

-- -----------------------------------------------------------------------------
-- projects
-- -----------------------------------------------------------------------------

CREATE TABLE public.creative_studio_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  story_id UUID REFERENCES public.stories (id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status public.creative_project_status NOT NULL DEFAULT 'draft',
  frame_rate NUMERIC(6, 3) NOT NULL DEFAULT 25.000 CHECK (frame_rate > 0),
  resolution_width INTEGER NOT NULL DEFAULT 1920 CHECK (resolution_width > 0),
  resolution_height INTEGER NOT NULL DEFAULT 1080 CHECK (resolution_height > 0),
  duration_ms BIGINT NOT NULL DEFAULT 0 CHECK (duration_ms >= 0),
  thumbnail_url TEXT,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  updated_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT creative_studio_projects_settings_object CHECK (jsonb_typeof(settings) = 'object'),
  CONSTRAINT creative_studio_projects_metadata_object CHECK (jsonb_typeof(metadata) = 'object')
);

COMMENT ON TABLE public.creative_studio_projects IS
  'Creative Studio projects — manual editing foundation. Optional story_id links to Newsroom.';

CREATE INDEX idx_creative_studio_projects_org
  ON public.creative_studio_projects (organization_id)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_creative_studio_projects_story
  ON public.creative_studio_projects (story_id)
  WHERE deleted_at IS NULL AND story_id IS NOT NULL;
CREATE INDEX idx_creative_studio_projects_status
  ON public.creative_studio_projects (status)
  WHERE deleted_at IS NULL;

CREATE TRIGGER trg_creative_studio_projects_updated_at
  BEFORE UPDATE ON public.creative_studio_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.creative_studio_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creative_studio_projects_select_member"
  ON public.creative_studio_projects FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_projects_insert_member"
  ON public.creative_studio_projects FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id) AND created_by = auth.uid());

CREATE POLICY "creative_studio_projects_update_member"
  ON public.creative_studio_projects FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_projects_no_hard_delete"
  ON public.creative_studio_projects FOR DELETE TO authenticated
  USING (false);

GRANT SELECT, INSERT, UPDATE ON public.creative_studio_projects TO authenticated;

-- -----------------------------------------------------------------------------
-- timelines
-- -----------------------------------------------------------------------------

CREATE TABLE public.creative_studio_timelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.creative_studio_projects (id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Main Timeline',
  duration_ms BIGINT NOT NULL DEFAULT 60000 CHECK (duration_ms >= 0),
  zoom_level NUMERIC(8, 4) NOT NULL DEFAULT 1.0000 CHECK (zoom_level > 0),
  snap_enabled BOOLEAN NOT NULL DEFAULT true,
  playhead_ms BIGINT NOT NULL DEFAULT 0 CHECK (playhead_ms >= 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT creative_studio_timelines_metadata_object CHECK (jsonb_typeof(metadata) = 'object')
);

COMMENT ON TABLE public.creative_studio_timelines IS
  'Timeline document per Creative Studio project.';

CREATE UNIQUE INDEX uq_creative_studio_timelines_project
  ON public.creative_studio_timelines (project_id);

CREATE INDEX idx_creative_studio_timelines_org
  ON public.creative_studio_timelines (organization_id);

CREATE TRIGGER trg_creative_studio_timelines_updated_at
  BEFORE UPDATE ON public.creative_studio_timelines
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.creative_studio_timelines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creative_studio_timelines_select_member"
  ON public.creative_studio_timelines FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_timelines_insert_member"
  ON public.creative_studio_timelines FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_timelines_update_member"
  ON public.creative_studio_timelines FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_timelines_no_hard_delete"
  ON public.creative_studio_timelines FOR DELETE TO authenticated
  USING (false);

GRANT SELECT, INSERT, UPDATE ON public.creative_studio_timelines TO authenticated;

-- -----------------------------------------------------------------------------
-- timeline_tracks
-- -----------------------------------------------------------------------------

CREATE TABLE public.creative_studio_timeline_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  timeline_id UUID NOT NULL REFERENCES public.creative_studio_timelines (id) ON DELETE CASCADE,
  kind public.creative_track_kind NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  muted BOOLEAN NOT NULL DEFAULT false,
  locked BOOLEAN NOT NULL DEFAULT false,
  height INTEGER NOT NULL DEFAULT 56 CHECK (height >= 32 AND height <= 160),
  color TEXT NOT NULL DEFAULT '#64748b',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT creative_studio_timeline_tracks_metadata_object CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX idx_creative_studio_timeline_tracks_timeline
  ON public.creative_studio_timeline_tracks (timeline_id, sort_order);

CREATE TRIGGER trg_creative_studio_timeline_tracks_updated_at
  BEFORE UPDATE ON public.creative_studio_timeline_tracks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.creative_studio_timeline_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creative_studio_timeline_tracks_select_member"
  ON public.creative_studio_timeline_tracks FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_timeline_tracks_insert_member"
  ON public.creative_studio_timeline_tracks FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_timeline_tracks_update_member"
  ON public.creative_studio_timeline_tracks FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_timeline_tracks_no_hard_delete"
  ON public.creative_studio_timeline_tracks FOR DELETE TO authenticated
  USING (false);

GRANT SELECT, INSERT, UPDATE ON public.creative_studio_timeline_tracks TO authenticated;

-- -----------------------------------------------------------------------------
-- timeline_clips
-- -----------------------------------------------------------------------------

CREATE TABLE public.creative_studio_timeline_clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES public.creative_studio_timeline_tracks (id) ON DELETE CASCADE,
  media_asset_id UUID REFERENCES public.media_assets (id) ON DELETE SET NULL,
  template_id UUID,
  name TEXT NOT NULL,
  clip_kind public.creative_clip_kind NOT NULL,
  start_ms BIGINT NOT NULL DEFAULT 0 CHECK (start_ms >= 0),
  end_ms BIGINT NOT NULL DEFAULT 0 CHECK (end_ms >= start_ms),
  trim_start_ms BIGINT NOT NULL DEFAULT 0 CHECK (trim_start_ms >= 0),
  trim_end_ms BIGINT NOT NULL DEFAULT 0 CHECK (trim_end_ms >= 0),
  position_x NUMERIC(10, 4) NOT NULL DEFAULT 0,
  position_y NUMERIC(10, 4) NOT NULL DEFAULT 0,
  scale NUMERIC(10, 4) NOT NULL DEFAULT 1 CHECK (scale > 0),
  rotation NUMERIC(10, 4) NOT NULL DEFAULT 0,
  opacity NUMERIC(5, 4) NOT NULL DEFAULT 1 CHECK (opacity >= 0 AND opacity <= 1),
  volume NUMERIC(5, 4) NOT NULL DEFAULT 1 CHECK (volume >= 0 AND volume <= 1),
  speed NUMERIC(6, 3) NOT NULL DEFAULT 1 CHECK (speed > 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT creative_studio_timeline_clips_metadata_object CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX idx_creative_studio_timeline_clips_track
  ON public.creative_studio_timeline_clips (track_id, start_ms)
  WHERE deleted_at IS NULL;

CREATE TRIGGER trg_creative_studio_timeline_clips_updated_at
  BEFORE UPDATE ON public.creative_studio_timeline_clips
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.creative_studio_timeline_clips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creative_studio_timeline_clips_select_member"
  ON public.creative_studio_timeline_clips FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_timeline_clips_insert_member"
  ON public.creative_studio_timeline_clips FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_timeline_clips_update_member"
  ON public.creative_studio_timeline_clips FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_timeline_clips_no_hard_delete"
  ON public.creative_studio_timeline_clips FOR DELETE TO authenticated
  USING (false);

GRANT SELECT, INSERT, UPDATE ON public.creative_studio_timeline_clips TO authenticated;

-- -----------------------------------------------------------------------------
-- templates
-- -----------------------------------------------------------------------------

CREATE TABLE public.creative_studio_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general',
  thumbnail_url TEXT,
  aspect_ratio TEXT NOT NULL DEFAULT '16:9',
  duration_ms BIGINT NOT NULL DEFAULT 30000 CHECK (duration_ms >= 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  updated_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT creative_studio_templates_metadata_object CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX idx_creative_studio_templates_org
  ON public.creative_studio_templates (organization_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER trg_creative_studio_templates_updated_at
  BEFORE UPDATE ON public.creative_studio_timelines
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Fix trigger target for templates
DROP TRIGGER IF EXISTS trg_creative_studio_templates_updated_at ON public.creative_studio_timelines;

CREATE TRIGGER trg_creative_studio_templates_updated_at
  BEFORE UPDATE ON public.creative_studio_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.creative_studio_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creative_studio_templates_select_member"
  ON public.creative_studio_templates FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_templates_insert_member"
  ON public.creative_studio_templates FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id) AND created_by = auth.uid());

CREATE POLICY "creative_studio_templates_update_member"
  ON public.creative_studio_templates FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_templates_no_hard_delete"
  ON public.creative_studio_templates FOR DELETE TO authenticated
  USING (false);

GRANT SELECT, INSERT, UPDATE ON public.creative_studio_templates TO authenticated;

-- -----------------------------------------------------------------------------
-- template_placeholders
-- -----------------------------------------------------------------------------

CREATE TABLE public.creative_studio_template_placeholders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.creative_studio_templates (id) ON DELETE CASCADE,
  kind public.creative_placeholder_kind NOT NULL,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  default_value TEXT NOT NULL DEFAULT '',
  constraints JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT creative_studio_template_placeholders_constraints_object
    CHECK (jsonb_typeof(constraints) = 'object')
);

CREATE INDEX idx_creative_studio_template_placeholders_template
  ON public.creative_studio_template_placeholders (template_id, sort_order);

CREATE TRIGGER trg_creative_studio_template_placeholders_updated_at
  BEFORE UPDATE ON public.creative_studio_template_placeholders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.creative_studio_template_placeholders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creative_studio_template_placeholders_select_member"
  ON public.creative_studio_template_placeholders FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_template_placeholders_insert_member"
  ON public.creative_studio_template_placeholders FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_template_placeholders_update_member"
  ON public.creative_studio_template_placeholders FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_template_placeholders_no_hard_delete"
  ON public.creative_studio_template_placeholders FOR DELETE TO authenticated
  USING (false);

GRANT SELECT, INSERT, UPDATE ON public.creative_studio_template_placeholders TO authenticated;

-- FK from clips.template_id (added after templates table exists)
ALTER TABLE public.creative_studio_timeline_clips
  ADD CONSTRAINT creative_studio_timeline_clips_template_fkey
  FOREIGN KEY (template_id) REFERENCES public.creative_studio_templates (id) ON DELETE SET NULL;
