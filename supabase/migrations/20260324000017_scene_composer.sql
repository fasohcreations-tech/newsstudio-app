-- =============================================================================
-- MediaOS Module 3.3 – Enterprise Scene Composer
-- Migration: 20260324000017_scene_composer.sql
--
-- Extends Motion Scene Engine with composer objects, components, keyframes,
-- bindings, and workflow state. Everything remains editable JSON.
-- No rendering / FFmpeg in this sprint.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------

CREATE TYPE public.scene_workflow_state AS ENUM (
  'draft',
  'review',
  'approved',
  'published',
  'archived'
);

CREATE TYPE public.scene_object_type AS ENUM (
  'rectangle',
  'rounded_rectangle',
  'circle',
  'ellipse',
  'line',
  'polygon',
  'svg',
  'image',
  'video',
  'logo',
  'text',
  'rich_text',
  'ticker',
  'clock',
  'date',
  'weather',
  'qr_code',
  'countdown',
  'counter',
  'particle_placeholder',
  'gradient',
  'mask',
  'group',
  'component'
);

CREATE TYPE public.scene_component_kind AS ENUM (
  'logo',
  'lower_third',
  'title',
  'background',
  'animation',
  'ticker',
  'clock',
  'custom'
);

CREATE TYPE public.scene_binding_source AS ENUM (
  'story',
  'brand',
  'manual',
  'ai',
  'data_feed'
);

CREATE TYPE public.scene_keyframe_property AS ENUM (
  'position_x',
  'position_y',
  'scale',
  'rotation',
  'opacity',
  'blur',
  'mask',
  'color',
  'width',
  'height',
  'text_reveal',
  'custom'
);

-- -----------------------------------------------------------------------------
-- Extend motion_scenes for composer workflow
-- -----------------------------------------------------------------------------

ALTER TABLE public.creative_studio_motion_scenes
  ADD COLUMN IF NOT EXISTS workflow_state public.scene_workflow_state NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS frame_rate INTEGER NOT NULL DEFAULT 30
    CHECK (frame_rate > 0 AND frame_rate <= 120),
  ADD COLUMN IF NOT EXISTS composer_settings JSONB NOT NULL DEFAULT '{
    "resolution_preset": "1920x1080",
    "custom_width": 1920,
    "custom_height": 1080,
    "background": "#0B1220",
    "output_profile": "broadcast_hd",
    "snap_enabled": true,
    "grid_size": 16,
    "rulers_visible": true,
    "guides_visible": true
  }'::jsonb;

ALTER TABLE public.creative_studio_motion_scenes
  ADD CONSTRAINT creative_studio_motion_scenes_composer_settings_object
    CHECK (jsonb_typeof(composer_settings) = 'object');

-- -----------------------------------------------------------------------------
-- scene_components — reusable broadcast components
-- -----------------------------------------------------------------------------

CREATE TABLE public.creative_studio_scene_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  brand_kit_id UUID REFERENCES public.creative_studio_brand_kits (id) ON DELETE SET NULL,
  component_kind public.scene_component_kind NOT NULL DEFAULT 'custom',
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  slug TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  object_tree JSONB NOT NULL DEFAULT '[]'::jsonb,
  default_bindings JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  updated_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT creative_studio_scene_components_slug_org_unique
    UNIQUE (organization_id, slug),
  CONSTRAINT creative_studio_scene_components_object_tree_array
    CHECK (jsonb_typeof(object_tree) = 'array'),
  CONSTRAINT creative_studio_scene_components_bindings_object
    CHECK (jsonb_typeof(default_bindings) = 'object'),
  CONSTRAINT creative_studio_scene_components_metadata_object
    CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX idx_creative_studio_scene_components_org
  ON public.creative_studio_scene_components (organization_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER trg_creative_studio_scene_components_updated_at
  BEFORE UPDATE ON public.creative_studio_scene_components
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.creative_studio_scene_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creative_studio_scene_components_select_member"
  ON public.creative_studio_scene_components FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_scene_components_insert_member"
  ON public.creative_studio_scene_components FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id) AND created_by = auth.uid());

CREATE POLICY "creative_studio_scene_components_update_member"
  ON public.creative_studio_scene_components FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_scene_components_no_hard_delete"
  ON public.creative_studio_scene_components FOR DELETE TO authenticated
  USING (false);

GRANT SELECT, INSERT, UPDATE ON public.creative_studio_scene_components TO authenticated;

-- -----------------------------------------------------------------------------
-- scene_objects — normalized composer objects (mirrors scene_document.objects)
-- -----------------------------------------------------------------------------

CREATE TABLE public.creative_studio_scene_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  scene_id UUID NOT NULL REFERENCES public.creative_studio_motion_scenes (id) ON DELETE CASCADE,
  parent_object_id UUID REFERENCES public.creative_studio_scene_objects (id) ON DELETE SET NULL,
  component_id UUID REFERENCES public.creative_studio_scene_components (id) ON DELETE SET NULL,
  object_type public.scene_object_type NOT NULL DEFAULT 'rectangle',
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  start_ms BIGINT NOT NULL DEFAULT 0 CHECK (start_ms >= 0),
  end_ms BIGINT NOT NULL DEFAULT 5000 CHECK (end_ms >= 0),
  offset_ms BIGINT NOT NULL DEFAULT 0,
  visible BOOLEAN NOT NULL DEFAULT true,
  locked BOOLEAN NOT NULL DEFAULT false,
  layer_color TEXT NOT NULL DEFAULT '#6366f1',
  transform JSONB NOT NULL DEFAULT '{"x":0,"y":0,"width":320,"height":80,"scale":1,"rotation":0,"opacity":1}'::jsonb,
  style JSONB NOT NULL DEFAULT '{}'::jsonb,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  bindings JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT creative_studio_scene_objects_transform_object
    CHECK (jsonb_typeof(transform) = 'object'),
  CONSTRAINT creative_studio_scene_objects_style_object
    CHECK (jsonb_typeof(style) = 'object'),
  CONSTRAINT creative_studio_scene_objects_content_object
    CHECK (jsonb_typeof(content) = 'object'),
  CONSTRAINT creative_studio_scene_objects_bindings_object
    CHECK (jsonb_typeof(bindings) = 'object'),
  CONSTRAINT creative_studio_scene_objects_metadata_object
    CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX idx_creative_studio_scene_objects_scene
  ON public.creative_studio_scene_objects (scene_id, sort_order);

CREATE TRIGGER trg_creative_studio_scene_objects_updated_at
  BEFORE UPDATE ON public.creative_studio_scene_objects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.creative_studio_scene_objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creative_studio_scene_objects_select_member"
  ON public.creative_studio_scene_objects FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_scene_objects_insert_member"
  ON public.creative_studio_scene_objects FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_scene_objects_update_member"
  ON public.creative_studio_scene_objects FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_scene_objects_no_hard_delete"
  ON public.creative_studio_scene_objects FOR DELETE TO authenticated
  USING (false);

GRANT SELECT, INSERT, UPDATE ON public.creative_studio_scene_objects TO authenticated;

-- -----------------------------------------------------------------------------
-- scene_timelines — per-scene timeline configuration
-- -----------------------------------------------------------------------------

CREATE TABLE public.creative_studio_scene_timelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  scene_id UUID NOT NULL REFERENCES public.creative_studio_motion_scenes (id) ON DELETE CASCADE,
  duration_ms BIGINT NOT NULL DEFAULT 5000 CHECK (duration_ms >= 0),
  frame_rate INTEGER NOT NULL DEFAULT 30 CHECK (frame_rate > 0 AND frame_rate <= 120),
  loop_playback BOOLEAN NOT NULL DEFAULT false,
  snap_enabled BOOLEAN NOT NULL DEFAULT true,
  zoom_level NUMERIC(6, 2) NOT NULL DEFAULT 1.0,
  markers JSONB NOT NULL DEFAULT '[]'::jsonb,
  tracks JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT creative_studio_scene_timelines_scene_unique UNIQUE (scene_id),
  CONSTRAINT creative_studio_scene_timelines_markers_array
    CHECK (jsonb_typeof(markers) = 'array'),
  CONSTRAINT creative_studio_scene_timelines_tracks_array
    CHECK (jsonb_typeof(tracks) = 'array'),
  CONSTRAINT creative_studio_scene_timelines_metadata_object
    CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX idx_creative_studio_scene_timelines_scene
  ON public.creative_studio_scene_timelines (scene_id);

CREATE TRIGGER trg_creative_studio_scene_timelines_updated_at
  BEFORE UPDATE ON public.creative_studio_scene_timelines
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.creative_studio_scene_timelines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creative_studio_scene_timelines_select_member"
  ON public.creative_studio_scene_timelines FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_scene_timelines_insert_member"
  ON public.creative_studio_scene_timelines FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_scene_timelines_update_member"
  ON public.creative_studio_scene_timelines FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_scene_timelines_no_hard_delete"
  ON public.creative_studio_scene_timelines FOR DELETE TO authenticated
  USING (false);

GRANT SELECT, INSERT, UPDATE ON public.creative_studio_scene_timelines TO authenticated;

-- -----------------------------------------------------------------------------
-- scene_keyframes
-- -----------------------------------------------------------------------------

CREATE TABLE public.creative_studio_scene_keyframes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  scene_id UUID NOT NULL REFERENCES public.creative_studio_motion_scenes (id) ON DELETE CASCADE,
  object_id UUID REFERENCES public.creative_studio_scene_objects (id) ON DELETE CASCADE,
  animation_id UUID REFERENCES public.creative_studio_scene_animations (id) ON DELETE CASCADE,
  property public.scene_keyframe_property NOT NULL DEFAULT 'opacity',
  at_ms BIGINT NOT NULL DEFAULT 0 CHECK (at_ms >= 0),
  value JSONB NOT NULL,
  easing TEXT NOT NULL DEFAULT 'ease-in-out',
  bezier_curve JSONB,
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT creative_studio_scene_keyframes_value_valid
    CHECK (jsonb_typeof(value) IN ('number', 'string', 'object')),
  CONSTRAINT creative_studio_scene_keyframes_metadata_object
    CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX idx_creative_studio_scene_keyframes_scene
  ON public.creative_studio_scene_keyframes (scene_id, object_id, at_ms);

CREATE TRIGGER trg_creative_studio_scene_keyframes_updated_at
  BEFORE UPDATE ON public.creative_studio_scene_keyframes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.creative_studio_scene_keyframes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creative_studio_scene_keyframes_select_member"
  ON public.creative_studio_scene_keyframes FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_scene_keyframes_insert_member"
  ON public.creative_studio_scene_keyframes FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_scene_keyframes_update_member"
  ON public.creative_studio_scene_keyframes FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_scene_keyframes_no_hard_delete"
  ON public.creative_studio_scene_keyframes FOR DELETE TO authenticated
  USING (false);

GRANT SELECT, INSERT, UPDATE ON public.creative_studio_scene_keyframes TO authenticated;

-- -----------------------------------------------------------------------------
-- scene_bindings — variable ↔ object data bindings
-- -----------------------------------------------------------------------------

CREATE TABLE public.creative_studio_scene_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  scene_id UUID NOT NULL REFERENCES public.creative_studio_motion_scenes (id) ON DELETE CASCADE,
  object_id UUID REFERENCES public.creative_studio_scene_objects (id) ON DELETE CASCADE,
  variable_key TEXT NOT NULL,
  binding_source public.scene_binding_source NOT NULL DEFAULT 'manual',
  target_property TEXT NOT NULL DEFAULT 'content.text',
  token TEXT NOT NULL,
  resolved_value TEXT NOT NULL DEFAULT '',
  auto_update BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT creative_studio_scene_bindings_metadata_object
    CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX idx_creative_studio_scene_bindings_scene
  ON public.creative_studio_scene_bindings (scene_id, variable_key);

CREATE TRIGGER trg_creative_studio_scene_bindings_updated_at
  BEFORE UPDATE ON public.creative_studio_scene_bindings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.creative_studio_scene_bindings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creative_studio_scene_bindings_select_member"
  ON public.creative_studio_scene_bindings FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_scene_bindings_insert_member"
  ON public.creative_studio_scene_bindings FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_scene_bindings_update_member"
  ON public.creative_studio_scene_bindings FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_scene_bindings_no_hard_delete"
  ON public.creative_studio_scene_bindings FOR DELETE TO authenticated
  USING (false);

GRANT SELECT, INSERT, UPDATE ON public.creative_studio_scene_bindings TO authenticated;

-- -----------------------------------------------------------------------------
-- Seed default system components (empty editable trees)
-- -----------------------------------------------------------------------------

-- Components are seeded per-org via SceneComposerService.ensureDefaults
