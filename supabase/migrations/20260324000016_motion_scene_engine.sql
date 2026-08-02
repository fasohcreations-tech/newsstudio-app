-- =============================================================================
-- MediaOS Module 3.2 – Enterprise Motion Scene Engine
-- Migration: 20260324000016_motion_scene_engine
--
-- Replaces static graphic templates with reusable Motion Scenes.
-- Purges legacy graphic template data. No rendering / FFmpeg in this sprint.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Purge legacy graphic template pack data (GNN + defaults)
-- -----------------------------------------------------------------------------

DELETE FROM public.creative_studio_graphic_variables;
DELETE FROM public.creative_studio_graphic_instances;
DELETE FROM public.creative_studio_graphic_templates;
DELETE FROM public.creative_studio_graphic_categories;

DROP TABLE IF EXISTS public.creative_studio_graphic_variables CASCADE;
DROP TABLE IF EXISTS public.creative_studio_graphic_instances CASCADE;
DROP TABLE IF EXISTS public.creative_studio_graphic_templates CASCADE;
DROP TABLE IF EXISTS public.creative_studio_graphic_categories CASCADE;

DROP TYPE IF EXISTS public.graphic_type CASCADE;
DROP TYPE IF EXISTS public.graphic_variable_kind CASCADE;

-- Extend animation kinds for motion scene engine
ALTER TYPE public.animation_kind ADD VALUE IF NOT EXISTS 'reveal';
ALTER TYPE public.animation_kind ADD VALUE IF NOT EXISTS 'blur';
ALTER TYPE public.animation_kind ADD VALUE IF NOT EXISTS 'bounce';
ALTER TYPE public.animation_kind ADD VALUE IF NOT EXISTS 'elastic';
ALTER TYPE public.animation_kind ADD VALUE IF NOT EXISTS 'rotate';
ALTER TYPE public.animation_kind ADD VALUE IF NOT EXISTS 'opacity';

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------

CREATE TYPE public.motion_scene_type AS ENUM (
  'intro',
  'headline',
  'anchor',
  'story',
  'image',
  'video',
  'quote',
  'scripture',
  'breaking_news',
  'live',
  'lower_third',
  'reporter',
  'guest',
  'location',
  'statistics',
  'timeline',
  'map',
  'comparison',
  'weather',
  'promo',
  'sponsor',
  'cta',
  'social',
  'outro',
  'credits',
  'custom'
);

CREATE TYPE public.scene_layer_type AS ENUM (
  'rectangle',
  'circle',
  'line',
  'gradient',
  'text',
  'image',
  'video',
  'logo',
  'svg',
  'icon',
  'shape',
  'mask',
  'blur',
  'shadow',
  'particle_placeholder',
  'countdown_placeholder',
  'clock_placeholder',
  'ticker_placeholder'
);

CREATE TYPE public.scene_placeholder_kind AS ENUM (
  'text',
  'headline',
  'subtitle',
  'body',
  'quote',
  'bible_verse',
  'reference',
  'reporter',
  'guest',
  'designation',
  'location',
  'organization',
  'ticker',
  'breaking_title',
  'image',
  'video',
  'logo',
  'portrait',
  'background_video',
  'background_image',
  'date',
  'time',
  'weather',
  'temperature',
  'counter',
  'score',
  'election_result',
  'stock_data',
  'custom_variable'
);

CREATE TYPE public.scene_theme_mode AS ENUM (
  'light',
  'dark',
  'channel',
  'custom'
);

CREATE TYPE public.scene_aspect_format AS ENUM (
  '16:9',
  '9:16',
  '1:1',
  '4:5',
  '21:9'
);

-- -----------------------------------------------------------------------------
-- scene_categories
-- -----------------------------------------------------------------------------

CREATE TABLE public.creative_studio_scene_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT 'layers',
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT creative_studio_scene_categories_slug_unique
    UNIQUE (organization_id, slug),
  CONSTRAINT creative_studio_scene_categories_metadata_object
    CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX idx_creative_studio_scene_categories_org
  ON public.creative_studio_scene_categories (organization_id, sort_order);

CREATE TRIGGER trg_creative_studio_scene_categories_updated_at
  BEFORE UPDATE ON public.creative_studio_scene_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.creative_studio_scene_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creative_studio_scene_categories_select_member"
  ON public.creative_studio_scene_categories FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_scene_categories_insert_member"
  ON public.creative_studio_scene_categories FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_scene_categories_update_member"
  ON public.creative_studio_scene_categories FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_scene_categories_no_hard_delete"
  ON public.creative_studio_scene_categories FOR DELETE TO authenticated
  USING (false);

GRANT SELECT, INSERT, UPDATE ON public.creative_studio_scene_categories TO authenticated;

-- -----------------------------------------------------------------------------
-- scene_tags
-- -----------------------------------------------------------------------------

CREATE TABLE public.creative_studio_scene_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#64748b',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT creative_studio_scene_tags_slug_unique
    UNIQUE (organization_id, slug),
  CONSTRAINT creative_studio_scene_tags_metadata_object
    CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX idx_creative_studio_scene_tags_org
  ON public.creative_studio_scene_tags (organization_id);

ALTER TABLE public.creative_studio_scene_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creative_studio_scene_tags_select_member"
  ON public.creative_studio_scene_tags FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_scene_tags_insert_member"
  ON public.creative_studio_scene_tags FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_scene_tags_update_member"
  ON public.creative_studio_scene_tags FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_scene_tags_no_hard_delete"
  ON public.creative_studio_scene_tags FOR DELETE TO authenticated
  USING (false);

GRANT SELECT, INSERT, UPDATE ON public.creative_studio_scene_tags TO authenticated;

-- -----------------------------------------------------------------------------
-- motion_scenes — reusable motion scene definitions (JSON + normalized children)
-- -----------------------------------------------------------------------------

CREATE TABLE public.creative_studio_motion_scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.creative_studio_scene_categories (id) ON DELETE SET NULL,
  brand_kit_id UUID REFERENCES public.creative_studio_brand_kits (id) ON DELETE SET NULL,
  parent_scene_id UUID REFERENCES public.creative_studio_motion_scenes (id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.creative_studio_projects (id) ON DELETE CASCADE,
  timeline_id UUID REFERENCES public.creative_studio_timelines (id) ON DELETE SET NULL,
  clip_id UUID REFERENCES public.creative_studio_timeline_clips (id) ON DELETE SET NULL,
  scene_type public.motion_scene_type NOT NULL DEFAULT 'custom',
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  version INTEGER NOT NULL DEFAULT 1,
  is_template BOOLEAN NOT NULL DEFAULT true,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT false,
  aspect_format public.scene_aspect_format NOT NULL DEFAULT '16:9',
  theme_mode public.scene_theme_mode NOT NULL DEFAULT 'channel',
  duration_ms INTEGER NOT NULL DEFAULT 5000 CHECK (duration_ms >= 0),
  canvas JSONB NOT NULL DEFAULT '{"width":1920,"height":1080,"background":"#000000","safe_area":{"top":48,"right":48,"bottom":48,"left":48},"grid":{"enabled":true,"size":16},"guides":[]}'::jsonb,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  timeline JSONB NOT NULL DEFAULT '{"duration_ms":5000,"markers":[],"tracks":[]}'::jsonb,
  transitions JSONB NOT NULL DEFAULT '{"in":null,"out":null}'::jsonb,
  preview JSONB NOT NULL DEFAULT '{"playhead_ms":0,"loop":false,"safe_area_visible":true}'::jsonb,
  scene_document JSONB NOT NULL DEFAULT '{"version":"1.0","layers":[],"placeholders":[],"variables":[],"animations":[]}'::jsonb,
  resolved_bindings JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  updated_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT creative_studio_motion_scenes_canvas_object
    CHECK (jsonb_typeof(canvas) = 'object'),
  CONSTRAINT creative_studio_motion_scenes_properties_object
    CHECK (jsonb_typeof(properties) = 'object'),
  CONSTRAINT creative_studio_motion_scenes_timeline_object
    CHECK (jsonb_typeof(timeline) = 'object'),
  CONSTRAINT creative_studio_motion_scenes_transitions_object
    CHECK (jsonb_typeof(transitions) = 'object'),
  CONSTRAINT creative_studio_motion_scenes_preview_object
    CHECK (jsonb_typeof(preview) = 'object'),
  CONSTRAINT creative_studio_motion_scenes_document_object
    CHECK (jsonb_typeof(scene_document) = 'object'),
  CONSTRAINT creative_studio_motion_scenes_bindings_object
    CHECK (jsonb_typeof(resolved_bindings) = 'object'),
  CONSTRAINT creative_studio_motion_scenes_metadata_object
    CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX idx_creative_studio_motion_scenes_org
  ON public.creative_studio_motion_scenes (organization_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_creative_studio_motion_scenes_type
  ON public.creative_studio_motion_scenes (scene_type)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_creative_studio_motion_scenes_project
  ON public.creative_studio_motion_scenes (project_id)
  WHERE deleted_at IS NULL AND project_id IS NOT NULL;

CREATE TRIGGER trg_creative_studio_motion_scenes_updated_at
  BEFORE UPDATE ON public.creative_studio_motion_scenes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.creative_studio_motion_scenes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creative_studio_motion_scenes_select_member"
  ON public.creative_studio_motion_scenes FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_motion_scenes_insert_member"
  ON public.creative_studio_motion_scenes FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id) AND created_by = auth.uid());

CREATE POLICY "creative_studio_motion_scenes_update_member"
  ON public.creative_studio_motion_scenes FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_motion_scenes_no_hard_delete"
  ON public.creative_studio_motion_scenes FOR DELETE TO authenticated
  USING (false);

GRANT SELECT, INSERT, UPDATE ON public.creative_studio_motion_scenes TO authenticated;

-- -----------------------------------------------------------------------------
-- scene_layers
-- -----------------------------------------------------------------------------

CREATE TABLE public.creative_studio_scene_layers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  scene_id UUID NOT NULL REFERENCES public.creative_studio_motion_scenes (id) ON DELETE CASCADE,
  parent_layer_id UUID REFERENCES public.creative_studio_scene_layers (id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  layer_type public.scene_layer_type NOT NULL DEFAULT 'rectangle',
  sort_order INTEGER NOT NULL DEFAULT 0,
  start_ms BIGINT NOT NULL DEFAULT 0 CHECK (start_ms >= 0),
  end_ms BIGINT NOT NULL DEFAULT 5000 CHECK (end_ms >= 0),
  offset_ms BIGINT NOT NULL DEFAULT 0,
  visible BOOLEAN NOT NULL DEFAULT true,
  locked BOOLEAN NOT NULL DEFAULT false,
  group_id TEXT,
  transform JSONB NOT NULL DEFAULT '{"x":0,"y":0,"scale":1,"rotation":0,"opacity":1}'::jsonb,
  style JSONB NOT NULL DEFAULT '{}'::jsonb,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT creative_studio_scene_layers_transform_object
    CHECK (jsonb_typeof(transform) = 'object'),
  CONSTRAINT creative_studio_scene_layers_style_object
    CHECK (jsonb_typeof(style) = 'object'),
  CONSTRAINT creative_studio_scene_layers_content_object
    CHECK (jsonb_typeof(content) = 'object'),
  CONSTRAINT creative_studio_scene_layers_metadata_object
    CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX idx_creative_studio_scene_layers_scene
  ON public.creative_studio_scene_layers (scene_id, sort_order);

CREATE TRIGGER trg_creative_studio_scene_layers_updated_at
  BEFORE UPDATE ON public.creative_studio_scene_layers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.creative_studio_scene_layers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creative_studio_scene_layers_select_member"
  ON public.creative_studio_scene_layers FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_scene_layers_insert_member"
  ON public.creative_studio_scene_layers FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_scene_layers_update_member"
  ON public.creative_studio_scene_layers FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_scene_layers_no_hard_delete"
  ON public.creative_studio_scene_layers FOR DELETE TO authenticated
  USING (false);

GRANT SELECT, INSERT, UPDATE ON public.creative_studio_scene_layers TO authenticated;

-- -----------------------------------------------------------------------------
-- scene_placeholders
-- -----------------------------------------------------------------------------

CREATE TABLE public.creative_studio_scene_placeholders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  scene_id UUID NOT NULL REFERENCES public.creative_studio_motion_scenes (id) ON DELETE CASCADE,
  layer_id UUID REFERENCES public.creative_studio_scene_layers (id) ON DELETE CASCADE,
  placeholder_kind public.scene_placeholder_kind NOT NULL,
  variable_key TEXT NOT NULL,
  label TEXT NOT NULL,
  default_value TEXT NOT NULL DEFAULT '',
  token TEXT NOT NULL,
  binding_source TEXT NOT NULL DEFAULT 'manual',
  constraints JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT creative_studio_scene_placeholders_key_unique
    UNIQUE (scene_id, variable_key),
  CONSTRAINT creative_studio_scene_placeholders_constraints_object
    CHECK (jsonb_typeof(constraints) = 'object'),
  CONSTRAINT creative_studio_scene_placeholders_metadata_object
    CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX idx_creative_studio_scene_placeholders_scene
  ON public.creative_studio_scene_placeholders (scene_id, sort_order);

CREATE TRIGGER trg_creative_studio_scene_placeholders_updated_at
  BEFORE UPDATE ON public.creative_studio_scene_placeholders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.creative_studio_scene_placeholders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creative_studio_scene_placeholders_select_member"
  ON public.creative_studio_scene_placeholders FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_scene_placeholders_insert_member"
  ON public.creative_studio_scene_placeholders FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_scene_placeholders_update_member"
  ON public.creative_studio_scene_placeholders FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_scene_placeholders_no_hard_delete"
  ON public.creative_studio_scene_placeholders FOR DELETE TO authenticated
  USING (false);

GRANT SELECT, INSERT, UPDATE ON public.creative_studio_scene_placeholders TO authenticated;

-- -----------------------------------------------------------------------------
-- scene_variables — story / brand binding definitions
-- -----------------------------------------------------------------------------

CREATE TABLE public.creative_studio_scene_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  scene_id UUID NOT NULL REFERENCES public.creative_studio_motion_scenes (id) ON DELETE CASCADE,
  variable_key TEXT NOT NULL,
  label TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'text',
  default_value TEXT NOT NULL DEFAULT '',
  story_field TEXT,
  brand_field TEXT,
  auto_update BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT creative_studio_scene_variables_key_unique
    UNIQUE (scene_id, variable_key),
  CONSTRAINT creative_studio_scene_variables_metadata_object
    CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX idx_creative_studio_scene_variables_scene
  ON public.creative_studio_scene_variables (scene_id, sort_order);

CREATE TRIGGER trg_creative_studio_scene_variables_updated_at
  BEFORE UPDATE ON public.creative_studio_scene_variables
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.creative_studio_scene_variables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creative_studio_scene_variables_select_member"
  ON public.creative_studio_scene_variables FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_scene_variables_insert_member"
  ON public.creative_studio_scene_variables FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_scene_variables_update_member"
  ON public.creative_studio_scene_variables FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_scene_variables_no_hard_delete"
  ON public.creative_studio_scene_variables FOR DELETE TO authenticated
  USING (false);

GRANT SELECT, INSERT, UPDATE ON public.creative_studio_scene_variables TO authenticated;

-- -----------------------------------------------------------------------------
-- scene_animations — per-layer animation tracks
-- -----------------------------------------------------------------------------

CREATE TABLE public.creative_studio_scene_animations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  scene_id UUID NOT NULL REFERENCES public.creative_studio_motion_scenes (id) ON DELETE CASCADE,
  layer_id UUID REFERENCES public.creative_studio_scene_layers (id) ON DELETE CASCADE,
  preset_id UUID REFERENCES public.creative_studio_animation_presets (id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  kind public.animation_kind NOT NULL DEFAULT 'fade',
  start_ms BIGINT NOT NULL DEFAULT 0 CHECK (start_ms >= 0),
  duration_ms INTEGER NOT NULL DEFAULT 500 CHECK (duration_ms >= 0),
  easing TEXT NOT NULL DEFAULT 'ease-out',
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  keyframes JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT creative_studio_scene_animations_parameters_object
    CHECK (jsonb_typeof(parameters) = 'object'),
  CONSTRAINT creative_studio_scene_animations_keyframes_array
    CHECK (jsonb_typeof(keyframes) = 'array'),
  CONSTRAINT creative_studio_scene_animations_metadata_object
    CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX idx_creative_studio_scene_animations_scene
  ON public.creative_studio_scene_animations (scene_id, sort_order);

CREATE TRIGGER trg_creative_studio_scene_animations_updated_at
  BEFORE UPDATE ON public.creative_studio_scene_animations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.creative_studio_scene_animations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creative_studio_scene_animations_select_member"
  ON public.creative_studio_scene_animations FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_scene_animations_insert_member"
  ON public.creative_studio_scene_animations FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_scene_animations_update_member"
  ON public.creative_studio_scene_animations FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_scene_animations_no_hard_delete"
  ON public.creative_studio_scene_animations FOR DELETE TO authenticated
  USING (false);

GRANT SELECT, INSERT, UPDATE ON public.creative_studio_scene_animations TO authenticated;

-- -----------------------------------------------------------------------------
-- scene_versions
-- -----------------------------------------------------------------------------

CREATE TABLE public.creative_studio_scene_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  scene_id UUID NOT NULL REFERENCES public.creative_studio_motion_scenes (id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  scene_snapshot JSONB NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT creative_studio_scene_versions_unique
    UNIQUE (scene_id, version_number),
  CONSTRAINT creative_studio_scene_versions_snapshot_object
    CHECK (jsonb_typeof(scene_snapshot) = 'object')
);

CREATE INDEX idx_creative_studio_scene_versions_scene
  ON public.creative_studio_scene_versions (scene_id, version_number DESC);

ALTER TABLE public.creative_studio_scene_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creative_studio_scene_versions_select_member"
  ON public.creative_studio_scene_versions FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_scene_versions_insert_member"
  ON public.creative_studio_scene_versions FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id) AND created_by = auth.uid());

CREATE POLICY "creative_studio_scene_versions_no_update"
  ON public.creative_studio_scene_versions FOR UPDATE TO authenticated
  USING (false);

CREATE POLICY "creative_studio_scene_versions_no_hard_delete"
  ON public.creative_studio_scene_versions FOR DELETE TO authenticated
  USING (false);

GRANT SELECT, INSERT ON public.creative_studio_scene_versions TO authenticated;

-- -----------------------------------------------------------------------------
-- scene_tag_links
-- -----------------------------------------------------------------------------

CREATE TABLE public.creative_studio_scene_tag_links (
  scene_id UUID NOT NULL REFERENCES public.creative_studio_motion_scenes (id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.creative_studio_scene_tags (id) ON DELETE CASCADE,
  PRIMARY KEY (scene_id, tag_id)
);

CREATE INDEX idx_creative_studio_scene_tag_links_tag
  ON public.creative_studio_scene_tag_links (tag_id);

ALTER TABLE public.creative_studio_scene_tag_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creative_studio_scene_tag_links_select_member"
  ON public.creative_studio_scene_tag_links FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.creative_studio_motion_scenes s
      WHERE s.id = scene_id AND public.is_org_member(s.organization_id)
    )
  );

CREATE POLICY "creative_studio_scene_tag_links_insert_member"
  ON public.creative_studio_scene_tag_links FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.creative_studio_motion_scenes s
      WHERE s.id = scene_id AND public.is_org_member(s.organization_id)
    )
  );

CREATE POLICY "creative_studio_scene_tag_links_delete_member"
  ON public.creative_studio_scene_tag_links FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.creative_studio_motion_scenes s
      WHERE s.id = scene_id AND public.is_org_member(s.organization_id)
    )
  );

GRANT SELECT, INSERT, DELETE ON public.creative_studio_scene_tag_links TO authenticated;
