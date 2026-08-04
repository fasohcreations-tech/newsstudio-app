-- =============================================================================
-- MediaOS Production Pipeline Step 3 — Timeline Assembly Engine
-- Migration: 20260324000027_story_timeline_assembly
--
-- Assembles Story Scene Instances into an editable production Timeline.
-- Clips REFERENCE scene instances / voice segments — never duplicate Scene data.
-- Does NOT modify Master Templates, Story Panels, Stories, or Scene Library.
-- Does NOT implement rendering or BroadcastOS.
-- =============================================================================

CREATE TYPE public.story_timeline_status AS ENUM (
  'draft',
  'assembling',
  'ready',
  'editing',
  'locked',
  'archived'
);

CREATE TYPE public.story_timeline_track_kind AS ENUM (
  'scene',
  'voice',
  'music',
  'graphics',
  'ticker',
  'advertisement',
  'other'
);

CREATE TYPE public.story_timeline_transition_type AS ENUM (
  'cut',
  'fade',
  'cross_dissolve',
  'slide',
  'push',
  'wipe',
  'broadcast_reveal'
);

-- -----------------------------------------------------------------------------
-- story_timelines — one live production timeline per story
-- -----------------------------------------------------------------------------

CREATE TABLE public.story_timelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES public.stories (id) ON DELETE CASCADE,
  package_id UUID REFERENCES public.story_packages (id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Production Timeline',
  status public.story_timeline_status NOT NULL DEFAULT 'draft',
  duration_ms INTEGER NOT NULL DEFAULT 0 CHECK (duration_ms >= 0),
  resolution_width INTEGER NOT NULL DEFAULT 1920 CHECK (resolution_width > 0),
  resolution_height INTEGER NOT NULL DEFAULT 1080 CHECK (resolution_height > 0),
  frame_rate NUMERIC(8, 3) NOT NULL DEFAULT 30,
  aspect_ratio TEXT NOT NULL DEFAULT '16:9',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  assembled_at TIMESTAMPTZ,
  assembled_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  updated_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT story_timelines_title_not_blank CHECK (char_length(trim(title)) > 0),
  CONSTRAINT story_timelines_metadata_object CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE UNIQUE INDEX idx_story_timelines_story_live
  ON public.story_timelines (story_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_story_timelines_org
  ON public.story_timelines (organization_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER trg_story_timelines_updated_at
  BEFORE UPDATE ON public.story_timelines
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.story_timelines ENABLE ROW LEVEL SECURITY;

CREATE POLICY story_timelines_select_member
  ON public.story_timelines FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY story_timelines_insert_member
  ON public.story_timelines FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id) AND created_by = auth.uid());

CREATE POLICY story_timelines_update_member
  ON public.story_timelines FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY story_timelines_delete_member
  ON public.story_timelines FOR DELETE TO authenticated
  USING (public.is_org_member(organization_id));

COMMENT ON TABLE public.story_timelines IS
  'Production Timeline Assembly (Step 3). References Story Scene Instances — no scene document copies.';

-- -----------------------------------------------------------------------------
-- story_timeline_tracks
-- -----------------------------------------------------------------------------

CREATE TABLE public.story_timeline_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  timeline_id UUID NOT NULL REFERENCES public.story_timelines (id) ON DELETE CASCADE,
  kind public.story_timeline_track_kind NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  height INTEGER NOT NULL DEFAULT 48 CHECK (height > 0),
  color TEXT,
  muted BOOLEAN NOT NULL DEFAULT false,
  locked BOOLEAN NOT NULL DEFAULT false,
  visible BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT story_timeline_tracks_name_not_blank CHECK (char_length(trim(name)) > 0),
  CONSTRAINT story_timeline_tracks_metadata_object CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX idx_story_timeline_tracks_timeline
  ON public.story_timeline_tracks (timeline_id, sort_order);

CREATE UNIQUE INDEX idx_story_timeline_tracks_kind_once
  ON public.story_timeline_tracks (timeline_id, kind)
  WHERE kind <> 'other';

CREATE TRIGGER trg_story_timeline_tracks_updated_at
  BEFORE UPDATE ON public.story_timeline_tracks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.story_timeline_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY story_timeline_tracks_select_member
  ON public.story_timeline_tracks FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY story_timeline_tracks_write_member
  ON public.story_timeline_tracks FOR ALL TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

-- -----------------------------------------------------------------------------
-- story_timeline_clips — references only (scene instance / voice segment)
-- -----------------------------------------------------------------------------

CREATE TABLE public.story_timeline_clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  timeline_id UUID NOT NULL REFERENCES public.story_timelines (id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES public.story_timeline_tracks (id) ON DELETE CASCADE,
  -- Source of truth references (nullable by track kind)
  scene_instance_id UUID REFERENCES public.story_scene_instances (id) ON DELETE SET NULL,
  voice_segment_id UUID REFERENCES public.story_voice_segments (id) ON DELETE SET NULL,
  name TEXT NOT NULL DEFAULT '',
  start_ms INTEGER NOT NULL CHECK (start_ms >= 0),
  end_ms INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  trim_in_ms INTEGER NOT NULL DEFAULT 0 CHECK (trim_in_ms >= 0),
  trim_out_ms INTEGER,
  enabled BOOLEAN NOT NULL DEFAULT true,
  locked BOOLEAN NOT NULL DEFAULT false,
  visible BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  -- Scene revision snapshot for sync prompts (never auto-overwrite)
  scene_synced_at TIMESTAMPTZ,
  scene_revision TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  updated_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT story_timeline_clips_out_after_in CHECK (end_ms > start_ms),
  CONSTRAINT story_timeline_clips_duration_matches
    CHECK (duration_ms = end_ms - start_ms),
  CONSTRAINT story_timeline_clips_metadata_object
    CHECK (jsonb_typeof(metadata) = 'object'),
  CONSTRAINT story_timeline_clips_has_reference CHECK (
    scene_instance_id IS NOT NULL OR voice_segment_id IS NOT NULL
  )
);

CREATE INDEX idx_story_timeline_clips_timeline
  ON public.story_timeline_clips (timeline_id, start_ms)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_story_timeline_clips_track
  ON public.story_timeline_clips (track_id, start_ms)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_story_timeline_clips_scene_instance
  ON public.story_timeline_clips (scene_instance_id)
  WHERE deleted_at IS NULL AND scene_instance_id IS NOT NULL;

CREATE TRIGGER trg_story_timeline_clips_updated_at
  BEFORE UPDATE ON public.story_timeline_clips
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.story_timeline_clips ENABLE ROW LEVEL SECURITY;

CREATE POLICY story_timeline_clips_select_member
  ON public.story_timeline_clips FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY story_timeline_clips_insert_member
  ON public.story_timeline_clips FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id) AND created_by = auth.uid());

CREATE POLICY story_timeline_clips_update_member
  ON public.story_timeline_clips FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY story_timeline_clips_delete_member
  ON public.story_timeline_clips FOR DELETE TO authenticated
  USING (public.is_org_member(organization_id));

COMMENT ON TABLE public.story_timeline_clips IS
  'Timeline clips reference Scene Instances / Voice Segments. Editing clip props only — never mutates scenes.';

-- -----------------------------------------------------------------------------
-- story_timeline_transitions — between consecutive scene clips
-- -----------------------------------------------------------------------------

CREATE TABLE public.story_timeline_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  timeline_id UUID NOT NULL REFERENCES public.story_timelines (id) ON DELETE CASCADE,
  from_clip_id UUID NOT NULL REFERENCES public.story_timeline_clips (id) ON DELETE CASCADE,
  to_clip_id UUID NOT NULL REFERENCES public.story_timeline_clips (id) ON DELETE CASCADE,
  transition_type public.story_timeline_transition_type NOT NULL DEFAULT 'cut',
  duration_ms INTEGER NOT NULL DEFAULT 0 CHECK (duration_ms >= 0),
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT story_timeline_transitions_params_object
    CHECK (jsonb_typeof(parameters) = 'object'),
  CONSTRAINT story_timeline_transitions_distinct_clips
    CHECK (from_clip_id <> to_clip_id)
);

CREATE UNIQUE INDEX idx_story_timeline_transitions_edge
  ON public.story_timeline_transitions (timeline_id, from_clip_id, to_clip_id);

CREATE INDEX idx_story_timeline_transitions_timeline
  ON public.story_timeline_transitions (timeline_id);

CREATE TRIGGER trg_story_timeline_transitions_updated_at
  BEFORE UPDATE ON public.story_timeline_transitions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.story_timeline_transitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY story_timeline_transitions_select_member
  ON public.story_timeline_transitions FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY story_timeline_transitions_write_member
  ON public.story_timeline_transitions FOR ALL TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

NOTIFY pgrst, 'reload schema';
