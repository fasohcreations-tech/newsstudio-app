-- =============================================================================
-- MediaOS Production Pipeline Step 2
-- Migration: 20260324000022_story_scene_builder
--
-- Story Packages + Voice Segments + Scene Instances from Master Templates.
-- Master templates (is_template=true + published/archived) stay immutable.
-- Timeline generation is out of scope for this migration.
-- =============================================================================

CREATE TYPE public.story_package_status AS ENUM (
  'draft',
  'building',
  'ready',
  'failed',
  'archived'
);

CREATE TYPE public.story_scene_instance_status AS ENUM (
  'draft',
  'ready',
  'editing',
  'archived'
);

-- -----------------------------------------------------------------------------
-- story_packages — inventory container per approved story
-- -----------------------------------------------------------------------------

CREATE TABLE public.story_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES public.stories (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status public.story_package_status NOT NULL DEFAULT 'draft',
  master_template_id UUID REFERENCES public.creative_studio_motion_scenes (id) ON DELETE SET NULL,
  master_template_code TEXT,
  scene_count INTEGER NOT NULL DEFAULT 0 CHECK (scene_count >= 0),
  total_duration_ms INTEGER NOT NULL DEFAULT 0 CHECK (total_duration_ms >= 0),
  voice_duration_ms INTEGER,
  ai_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  history JSONB NOT NULL DEFAULT '[]'::jsonb,
  error TEXT,
  built_at TIMESTAMPTZ,
  built_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  updated_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT story_packages_title_not_blank CHECK (char_length(trim(title)) > 0),
  CONSTRAINT story_packages_ai_metadata_object CHECK (jsonb_typeof(ai_metadata) = 'object'),
  CONSTRAINT story_packages_history_array CHECK (jsonb_typeof(history) = 'array')
);

CREATE UNIQUE INDEX idx_story_packages_story_live
  ON public.story_packages (story_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_story_packages_org
  ON public.story_packages (organization_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER trg_story_packages_updated_at
  BEFORE UPDATE ON public.story_packages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.story_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "story_packages_select_member"
  ON public.story_packages FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "story_packages_insert_member"
  ON public.story_packages FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id) AND created_by = auth.uid());

CREATE POLICY "story_packages_update_member"
  ON public.story_packages FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "story_packages_delete_member"
  ON public.story_packages FOR DELETE TO authenticated
  USING (public.is_org_member(organization_id));

COMMENT ON TABLE public.story_packages IS
  'Story Scene Builder package: story + voice segments + scene instance collection. Does not own Master Templates.';

-- -----------------------------------------------------------------------------
-- story_voice_segments — narration split for scene-level audio references
-- -----------------------------------------------------------------------------

CREATE TABLE public.story_voice_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES public.stories (id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.story_packages (id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  label TEXT NOT NULL DEFAULT '',
  text TEXT NOT NULL,
  start_ms INTEGER NOT NULL DEFAULT 0 CHECK (start_ms >= 0),
  end_ms INTEGER NOT NULL DEFAULT 0 CHECK (end_ms >= start_ms),
  duration_ms INTEGER NOT NULL DEFAULT 0 CHECK (duration_ms >= 0),
  headline TEXT,
  subheadline TEXT,
  body_text TEXT,
  media_kind TEXT NOT NULL DEFAULT '' CHECK (media_kind IN ('', 'image', 'video', 'caption')),
  media_ref TEXT NOT NULL DEFAULT '',
  media_caption TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT story_voice_segments_text_not_blank CHECK (char_length(trim(text)) > 0),
  CONSTRAINT story_voice_segments_metadata_object CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX idx_story_voice_segments_package
  ON public.story_voice_segments (package_id, sort_order);

CREATE INDEX idx_story_voice_segments_story
  ON public.story_voice_segments (story_id);

CREATE TRIGGER trg_story_voice_segments_updated_at
  BEFORE UPDATE ON public.story_voice_segments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.story_voice_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "story_voice_segments_select_member"
  ON public.story_voice_segments FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "story_voice_segments_insert_member"
  ON public.story_voice_segments FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "story_voice_segments_update_member"
  ON public.story_voice_segments FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "story_voice_segments_delete_member"
  ON public.story_voice_segments FOR DELETE TO authenticated
  USING (public.is_org_member(organization_id));

COMMENT ON TABLE public.story_voice_segments IS
  'Scene-level voice/script segments derived from approved script + voice timing. Each scene instance references one segment.';

-- -----------------------------------------------------------------------------
-- story_scene_instances — editable clones of Master Templates
-- -----------------------------------------------------------------------------

CREATE TABLE public.story_scene_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.story_packages (id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES public.stories (id) ON DELETE CASCADE,
  master_template_id UUID NOT NULL REFERENCES public.creative_studio_motion_scenes (id) ON DELETE RESTRICT,
  scene_id UUID NOT NULL REFERENCES public.creative_studio_motion_scenes (id) ON DELETE CASCADE,
  voice_segment_id UUID REFERENCES public.story_voice_segments (id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  timeline_order INTEGER NOT NULL DEFAULT 0 CHECK (timeline_order >= 0),
  name TEXT NOT NULL,
  status public.story_scene_instance_status NOT NULL DEFAULT 'draft',
  duration_ms INTEGER NOT NULL DEFAULT 0 CHECK (duration_ms >= 0),
  headline TEXT NOT NULL DEFAULT '',
  subheadline TEXT NOT NULL DEFAULT '',
  body_text TEXT NOT NULL DEFAULT '',
  video_asset_ref TEXT NOT NULL DEFAULT '',
  image_asset_ref TEXT NOT NULL DEFAULT '',
  logo_ref TEXT NOT NULL DEFAULT '',
  advertisement_ref TEXT NOT NULL DEFAULT '',
  animations JSONB NOT NULL DEFAULT '[]'::jsonb,
  behaviors JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  updated_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT story_scene_instances_name_not_blank CHECK (char_length(trim(name)) > 0),
  CONSTRAINT story_scene_instances_animations_array CHECK (jsonb_typeof(animations) = 'array'),
  CONSTRAINT story_scene_instances_behaviors_array CHECK (jsonb_typeof(behaviors) = 'array'),
  CONSTRAINT story_scene_instances_metadata_object CHECK (jsonb_typeof(metadata) = 'object'),
  CONSTRAINT story_scene_instances_scene_ne_master CHECK (scene_id <> master_template_id)
);

CREATE UNIQUE INDEX idx_story_scene_instances_scene_live
  ON public.story_scene_instances (scene_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_story_scene_instances_package
  ON public.story_scene_instances (package_id, sort_order)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_story_scene_instances_story
  ON public.story_scene_instances (story_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER trg_story_scene_instances_updated_at
  BEFORE UPDATE ON public.story_scene_instances
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.story_scene_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "story_scene_instances_select_member"
  ON public.story_scene_instances FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "story_scene_instances_insert_member"
  ON public.story_scene_instances FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id) AND created_by = auth.uid());

CREATE POLICY "story_scene_instances_update_member"
  ON public.story_scene_instances FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "story_scene_instances_delete_member"
  ON public.story_scene_instances FOR DELETE TO authenticated
  USING (public.is_org_member(organization_id));

COMMENT ON TABLE public.story_scene_instances IS
  'Editable scene instances cloned from Master Templates. scene_id points at the mutable clone; master_template_id is immutable reference.';

COMMENT ON COLUMN public.story_scene_instances.master_template_id IS
  'Immutable Master Template. Never write production edits to this scene.';
COMMENT ON COLUMN public.story_scene_instances.scene_id IS
  'Editable Motion Scene clone (is_template=false). Open in Scene Composer.';

-- -----------------------------------------------------------------------------
-- Master template protection (DB-level)
-- Published / archived templates cannot change document fields.
-- Allowed: workflow_state transitions that archive, soft-delete, favorite, metadata flags.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_master_template_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.is_template IS TRUE
     AND OLD.deleted_at IS NULL
     AND (
       OLD.is_published IS TRUE
       OR OLD.workflow_state::text IN ('published', 'archived')
     )
  THEN
    -- Soft-delete / archive transitions are allowed.
    IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
      RETURN NEW;
    END IF;
    IF NEW.workflow_state IS DISTINCT FROM OLD.workflow_state
       AND NEW.workflow_state::text IN ('archived', 'published', 'draft', 'review', 'approved')
       AND NEW.scene_document IS NOT DISTINCT FROM OLD.scene_document
       AND NEW.resolved_bindings IS NOT DISTINCT FROM OLD.resolved_bindings
       AND NEW.canvas IS NOT DISTINCT FROM OLD.canvas
       AND NEW.properties IS NOT DISTINCT FROM OLD.properties
       AND NEW.timeline IS NOT DISTINCT FROM OLD.timeline
       AND NEW.composer_settings IS NOT DISTINCT FROM OLD.composer_settings
       AND NEW.duration_ms IS NOT DISTINCT FROM OLD.duration_ms
       AND NEW.name IS NOT DISTINCT FROM OLD.name
    THEN
      RETURN NEW;
    END IF;
    IF NEW.is_favorite IS DISTINCT FROM OLD.is_favorite
       AND NEW.scene_document IS NOT DISTINCT FROM OLD.scene_document
       AND NEW.resolved_bindings IS NOT DISTINCT FROM OLD.resolved_bindings
       AND NEW.canvas IS NOT DISTINCT FROM OLD.canvas
       AND NEW.properties IS NOT DISTINCT FROM OLD.properties
       AND NEW.timeline IS NOT DISTINCT FROM OLD.timeline
       AND NEW.composer_settings IS NOT DISTINCT FROM OLD.composer_settings
       AND NEW.duration_ms IS NOT DISTINCT FROM OLD.duration_ms
       AND NEW.name IS NOT DISTINCT FROM OLD.name
       AND NEW.workflow_state IS NOT DISTINCT FROM OLD.workflow_state
    THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION
      'Published Master Templates are immutable. Duplicate or version the template instead of editing it.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_motion_scenes_master_immutable
  ON public.creative_studio_motion_scenes;

CREATE TRIGGER trg_motion_scenes_master_immutable
  BEFORE UPDATE ON public.creative_studio_motion_scenes
  FOR EACH ROW EXECUTE FUNCTION public.enforce_master_template_immutability();
