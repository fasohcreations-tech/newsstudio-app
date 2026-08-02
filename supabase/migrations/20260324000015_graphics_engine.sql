-- =============================================================================
-- MediaOS Module 3.2 – Enterprise News Graphics Engine
-- Migration: 20260324000015_graphics_engine
--
-- Reusable graphics, templates, animations, data-driven overlays.
-- No rendering, FFmpeg, export, or AI graphics generation in this sprint.
-- =============================================================================

CREATE TYPE public.graphic_type AS ENUM (
  'lower_third',
  'breaking_news_banner',
  'full_screen_graphic',
  'quote_card',
  'statistics_panel',
  'name_strap',
  'location_strap',
  'headline_banner',
  'bible_verse_card',
  'scripture_overlay',
  'topic_card',
  'ticker',
  'channel_bug',
  'watermark',
  'logo_overlay',
  'clock',
  'date',
  'credits',
  'end_slate',
  'custom_graphic'
);

CREATE TYPE public.animation_kind AS ENUM (
  'fade',
  'slide',
  'zoom',
  'scale',
  'push',
  'wipe',
  'typewriter',
  'custom'
);

CREATE TYPE public.graphic_variable_kind AS ENUM (
  'text',
  'image',
  'color',
  'datetime',
  'number',
  'boolean'
);

CREATE TYPE public.text_alignment AS ENUM (
  'left',
  'center',
  'right',
  'justify'
);

-- -----------------------------------------------------------------------------
-- brand_kits — organization brand identity for graphics
-- -----------------------------------------------------------------------------

CREATE TABLE public.creative_studio_brand_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Default Brand Kit',
  logo_url TEXT,
  watermark_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#1e40af',
  secondary_color TEXT NOT NULL DEFAULT '#dc2626',
  font_primary TEXT NOT NULL DEFAULT 'Inter',
  font_secondary TEXT NOT NULL DEFAULT 'Noto Sans Malayalam',
  safe_margins JSONB NOT NULL DEFAULT '{"top":48,"right":48,"bottom":48,"left":48}'::jsonb,
  animation_preset_ids UUID[] NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  updated_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT creative_studio_brand_kits_metadata_object
    CHECK (jsonb_typeof(metadata) = 'object'),
  CONSTRAINT creative_studio_brand_kits_safe_margins_object
    CHECK (jsonb_typeof(safe_margins) = 'object')
);

CREATE INDEX idx_creative_studio_brand_kits_org
  ON public.creative_studio_brand_kits (organization_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER trg_creative_studio_brand_kits_updated_at
  BEFORE UPDATE ON public.creative_studio_brand_kits
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.creative_studio_brand_kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creative_studio_brand_kits_select_member"
  ON public.creative_studio_brand_kits FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_brand_kits_insert_member"
  ON public.creative_studio_brand_kits FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id) AND created_by = auth.uid());

CREATE POLICY "creative_studio_brand_kits_update_member"
  ON public.creative_studio_brand_kits FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_brand_kits_no_hard_delete"
  ON public.creative_studio_brand_kits FOR DELETE TO authenticated
  USING (false);

GRANT SELECT, INSERT, UPDATE ON public.creative_studio_brand_kits TO authenticated;

-- -----------------------------------------------------------------------------
-- graphic_categories
-- -----------------------------------------------------------------------------

CREATE TABLE public.creative_studio_graphic_categories (
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
  CONSTRAINT creative_studio_graphic_categories_metadata_object
    CHECK (jsonb_typeof(metadata) = 'object'),
  CONSTRAINT creative_studio_graphic_categories_slug_unique
    UNIQUE (organization_id, slug)
);

CREATE INDEX idx_creative_studio_graphic_categories_org
  ON public.creative_studio_graphic_categories (organization_id, sort_order);

CREATE TRIGGER trg_creative_studio_graphic_categories_updated_at
  BEFORE UPDATE ON public.creative_studio_graphic_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.creative_studio_graphic_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creative_studio_graphic_categories_select_member"
  ON public.creative_studio_graphic_categories FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_graphic_categories_insert_member"
  ON public.creative_studio_graphic_categories FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_graphic_categories_update_member"
  ON public.creative_studio_graphic_categories FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_graphic_categories_no_hard_delete"
  ON public.creative_studio_graphic_categories FOR DELETE TO authenticated
  USING (false);

GRANT SELECT, INSERT, UPDATE ON public.creative_studio_graphic_categories TO authenticated;

-- -----------------------------------------------------------------------------
-- animation_presets
-- -----------------------------------------------------------------------------

CREATE TABLE public.creative_studio_animation_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  brand_kit_id UUID REFERENCES public.creative_studio_brand_kits (id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  kind public.animation_kind NOT NULL DEFAULT 'fade',
  duration_ms INTEGER NOT NULL DEFAULT 500 CHECK (duration_ms >= 0),
  easing TEXT NOT NULL DEFAULT 'ease-out',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_system BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT creative_studio_animation_presets_config_object
    CHECK (jsonb_typeof(config) = 'object'),
  CONSTRAINT creative_studio_animation_presets_metadata_object
    CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX idx_creative_studio_animation_presets_org
  ON public.creative_studio_animation_presets (organization_id, kind);

CREATE TRIGGER trg_creative_studio_animation_presets_updated_at
  BEFORE UPDATE ON public.creative_studio_animation_presets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.creative_studio_animation_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creative_studio_animation_presets_select_member"
  ON public.creative_studio_animation_presets FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_animation_presets_insert_member"
  ON public.creative_studio_animation_presets FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_animation_presets_update_member"
  ON public.creative_studio_animation_presets FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_animation_presets_no_hard_delete"
  ON public.creative_studio_animation_presets FOR DELETE TO authenticated
  USING (false);

GRANT SELECT, INSERT, UPDATE ON public.creative_studio_animation_presets TO authenticated;

-- -----------------------------------------------------------------------------
-- graphic_templates — reusable graphics with versioning
-- -----------------------------------------------------------------------------

CREATE TABLE public.creative_studio_graphic_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.creative_studio_graphic_categories (id) ON DELETE SET NULL,
  brand_kit_id UUID REFERENCES public.creative_studio_brand_kits (id) ON DELETE SET NULL,
  graphic_type public.graphic_type NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  thumbnail_url TEXT,
  aspect_ratio TEXT NOT NULL DEFAULT '16:9',
  duration_ms INTEGER NOT NULL DEFAULT 5000 CHECK (duration_ms >= 0),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  parent_template_id UUID REFERENCES public.creative_studio_graphic_templates (id) ON DELETE SET NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT false,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  scene_document JSONB NOT NULL DEFAULT '{"layers":[]}'::jsonb,
  animation_timeline JSONB NOT NULL DEFAULT '{"tracks":[]}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  updated_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT creative_studio_graphic_templates_properties_object
    CHECK (jsonb_typeof(properties) = 'object'),
  CONSTRAINT creative_studio_graphic_templates_scene_object
    CHECK (jsonb_typeof(scene_document) = 'object'),
  CONSTRAINT creative_studio_graphic_templates_animation_object
    CHECK (jsonb_typeof(animation_timeline) = 'object'),
  CONSTRAINT creative_studio_graphic_templates_metadata_object
    CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX idx_creative_studio_graphic_templates_org
  ON public.creative_studio_graphic_templates (organization_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_creative_studio_graphic_templates_type
  ON public.creative_studio_graphic_templates (graphic_type)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_creative_studio_graphic_templates_category
  ON public.creative_studio_graphic_templates (category_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER trg_creative_studio_graphic_templates_updated_at
  BEFORE UPDATE ON public.creative_studio_graphic_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.creative_studio_graphic_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creative_studio_graphic_templates_select_member"
  ON public.creative_studio_graphic_templates FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_graphic_templates_insert_member"
  ON public.creative_studio_graphic_templates FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id) AND created_by = auth.uid());

CREATE POLICY "creative_studio_graphic_templates_update_member"
  ON public.creative_studio_graphic_templates FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_graphic_templates_no_hard_delete"
  ON public.creative_studio_graphic_templates FOR DELETE TO authenticated
  USING (false);

GRANT SELECT, INSERT, UPDATE ON public.creative_studio_graphic_templates TO authenticated;

-- -----------------------------------------------------------------------------
-- graphic_variables — dynamic placeholder definitions per template
-- -----------------------------------------------------------------------------

CREATE TABLE public.creative_studio_graphic_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.creative_studio_graphic_templates (id) ON DELETE CASCADE,
  variable_key TEXT NOT NULL,
  label TEXT NOT NULL,
  kind public.graphic_variable_kind NOT NULL DEFAULT 'text',
  default_value TEXT NOT NULL DEFAULT '',
  placeholder_token TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  constraints JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT creative_studio_graphic_variables_key_unique
    UNIQUE (template_id, variable_key),
  CONSTRAINT creative_studio_graphic_variables_constraints_object
    CHECK (jsonb_typeof(constraints) = 'object'),
  CONSTRAINT creative_studio_graphic_variables_metadata_object
    CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX idx_creative_studio_graphic_variables_template
  ON public.creative_studio_graphic_variables (template_id, sort_order);

CREATE TRIGGER trg_creative_studio_graphic_variables_updated_at
  BEFORE UPDATE ON public.creative_studio_graphic_variables
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.creative_studio_graphic_variables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creative_studio_graphic_variables_select_member"
  ON public.creative_studio_graphic_variables FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_graphic_variables_insert_member"
  ON public.creative_studio_graphic_variables FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_graphic_variables_update_member"
  ON public.creative_studio_graphic_variables FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_graphic_variables_no_hard_delete"
  ON public.creative_studio_graphic_variables FOR DELETE TO authenticated
  USING (false);

GRANT SELECT, INSERT, UPDATE ON public.creative_studio_graphic_variables TO authenticated;

-- -----------------------------------------------------------------------------
-- graphic_instances — placed graphics (project / timeline / clip linked)
-- -----------------------------------------------------------------------------

CREATE TABLE public.creative_studio_graphic_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.creative_studio_graphic_templates (id) ON DELETE SET NULL,
  brand_kit_id UUID REFERENCES public.creative_studio_brand_kits (id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.creative_studio_projects (id) ON DELETE CASCADE,
  timeline_id UUID REFERENCES public.creative_studio_timelines (id) ON DELETE SET NULL,
  clip_id UUID REFERENCES public.creative_studio_timeline_clips (id) ON DELETE SET NULL,
  graphic_type public.graphic_type NOT NULL,
  name TEXT NOT NULL,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  scene_document JSONB NOT NULL DEFAULT '{"layers":[]}'::jsonb,
  resolved_variables JSONB NOT NULL DEFAULT '{}'::jsonb,
  animation_timeline JSONB NOT NULL DEFAULT '{"tracks":[]}'::jsonb,
  layer_order INTEGER NOT NULL DEFAULT 0,
  start_ms BIGINT NOT NULL DEFAULT 0 CHECK (start_ms >= 0),
  duration_ms INTEGER NOT NULL DEFAULT 5000 CHECK (duration_ms >= 0),
  locked BOOLEAN NOT NULL DEFAULT false,
  hidden BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  updated_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT creative_studio_graphic_instances_properties_object
    CHECK (jsonb_typeof(properties) = 'object'),
  CONSTRAINT creative_studio_graphic_instances_scene_object
    CHECK (jsonb_typeof(scene_document) = 'object'),
  CONSTRAINT creative_studio_graphic_instances_resolved_object
    CHECK (jsonb_typeof(resolved_variables) = 'object'),
  CONSTRAINT creative_studio_graphic_instances_animation_object
    CHECK (jsonb_typeof(animation_timeline) = 'object'),
  CONSTRAINT creative_studio_graphic_instances_metadata_object
    CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX idx_creative_studio_graphic_instances_org
  ON public.creative_studio_graphic_instances (organization_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_creative_studio_graphic_instances_project
  ON public.creative_studio_graphic_instances (project_id)
  WHERE deleted_at IS NULL AND project_id IS NOT NULL;

CREATE INDEX idx_creative_studio_graphic_instances_clip
  ON public.creative_studio_graphic_instances (clip_id)
  WHERE deleted_at IS NULL AND clip_id IS NOT NULL;

CREATE TRIGGER trg_creative_studio_graphic_instances_updated_at
  BEFORE UPDATE ON public.creative_studio_graphic_instances
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.creative_studio_graphic_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creative_studio_graphic_instances_select_member"
  ON public.creative_studio_graphic_instances FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_graphic_instances_insert_member"
  ON public.creative_studio_graphic_instances FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id) AND created_by = auth.uid());

CREATE POLICY "creative_studio_graphic_instances_update_member"
  ON public.creative_studio_graphic_instances FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "creative_studio_graphic_instances_no_hard_delete"
  ON public.creative_studio_graphic_instances FOR DELETE TO authenticated
  USING (false);

GRANT SELECT, INSERT, UPDATE ON public.creative_studio_graphic_instances TO authenticated;
