-- =============================================================================
-- MediaOS Feature 006 – News Intake Center
-- Migration: 20260324000008_news_intake
--
-- Centralized intake: source_types, source_items, story_sources.
-- Architecture only — no scraping, OCR, or AI execution.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------

CREATE TYPE public.intake_extraction_status AS ENUM (
  'pending',
  'validating',
  'extracting',
  'metadata_ready',
  'story_created',
  'failed',
  'cancelled'
);

CREATE TYPE public.intake_source_category AS ENUM (
  'manual',
  'url',
  'feed',
  'document',
  'media',
  'social'
);

-- -----------------------------------------------------------------------------
-- source_types (catalog of supported intake channels)
-- -----------------------------------------------------------------------------

CREATE TABLE public.source_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  category public.intake_source_category NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT source_types_code_format CHECK (code ~ '^[a-z0-9_]+$'),
  CONSTRAINT source_types_name_not_blank CHECK (char_length(trim(name)) > 0)
);

CREATE UNIQUE INDEX idx_source_types_code ON public.source_types (code);
CREATE INDEX idx_source_types_category ON public.source_types (category);
CREATE INDEX idx_source_types_sort ON public.source_types (sort_order, name);

CREATE TRIGGER trg_source_types_updated_at
  BEFORE UPDATE ON public.source_types
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.source_types IS
  'Catalog of News Intake source channels (manual, URL, RSS, files, social).';

INSERT INTO public.source_types (code, name, category, description, sort_order) VALUES
  ('manual_story', 'Manual Story', 'manual', 'Create a story from editor-entered fields', 10),
  ('url_import', 'URL Import', 'url', 'Import an article from a web URL', 20),
  ('rss_feed', 'RSS Feed', 'feed', 'Ingest items from an RSS / Atom feed', 30),
  ('pdf', 'PDF', 'document', 'Extract text from a PDF document', 40),
  ('docx', 'DOCX', 'document', 'Extract text from a Word document', 50),
  ('txt', 'TXT', 'document', 'Import a plain-text file', 60),
  ('image_upload', 'Image Upload', 'media', 'Upload an image; OCR deferred', 70),
  ('audio_upload', 'Audio Upload', 'media', 'Upload audio; transcription deferred', 80),
  ('youtube_url', 'YouTube URL', 'social', 'Import from a YouTube URL', 90),
  ('facebook_url', 'Facebook URL', 'social', 'Import from a Facebook URL', 100),
  ('x_url', 'X URL', 'social', 'Import from an X (Twitter) URL', 110),
  ('telegram_url', 'Telegram URL', 'social', 'Import from a Telegram URL', 120);

-- -----------------------------------------------------------------------------
-- source_items (import queue)
-- -----------------------------------------------------------------------------

CREATE TABLE public.source_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  source_type_id UUID NOT NULL REFERENCES public.source_types (id) ON DELETE RESTRICT,
  original_url TEXT,
  title TEXT,
  extraction_status public.intake_extraction_status NOT NULL DEFAULT 'pending',
  imported_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  reporter_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  media_asset_id UUID REFERENCES public.media_assets (id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  extracted_content TEXT,
  extracted_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  updated_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT source_items_metadata_object CHECK (jsonb_typeof(metadata) = 'object'),
  CONSTRAINT source_items_extracted_metadata_object CHECK (jsonb_typeof(extracted_metadata) = 'object'),
  CONSTRAINT source_items_url_or_title CHECK (
    (original_url IS NOT NULL AND char_length(trim(original_url)) > 0)
    OR (title IS NOT NULL AND char_length(trim(title)) > 0)
    OR media_asset_id IS NOT NULL
  )
);

COMMENT ON TABLE public.source_items IS
  'News Intake queue. Extraction pipelines will update status and extracted_* fields later.';

CREATE INDEX idx_source_items_organization_id ON public.source_items (organization_id);
CREATE INDEX idx_source_items_source_type_id ON public.source_items (source_type_id);
CREATE INDEX idx_source_items_status ON public.source_items (extraction_status)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_source_items_reporter_id ON public.source_items (reporter_id);
CREATE INDEX idx_source_items_imported_at ON public.source_items (imported_at DESC);
CREATE INDEX idx_source_items_deleted_at ON public.source_items (deleted_at);
CREATE INDEX idx_source_items_metadata ON public.source_items USING gin (metadata);

CREATE TRIGGER trg_source_items_updated_at
  BEFORE UPDATE ON public.source_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.source_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "source_items_select_member"
  ON public.source_items FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "source_items_insert_member"
  ON public.source_items FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_member(organization_id)
    AND created_by = auth.uid()
  );

CREATE POLICY "source_items_update_member"
  ON public.source_items FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "source_items_no_hard_delete"
  ON public.source_items FOR DELETE TO authenticated
  USING (false);

GRANT SELECT, INSERT, UPDATE ON public.source_items TO authenticated;

-- source_types are global catalog — readable by authenticated users
ALTER TABLE public.source_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "source_types_select_authenticated"
  ON public.source_types FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "source_types_no_client_write"
  ON public.source_types FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

GRANT SELECT ON public.source_types TO authenticated;

-- -----------------------------------------------------------------------------
-- story_sources (link Story ↔ original source_item)
-- -----------------------------------------------------------------------------

CREATE TABLE public.story_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES public.stories (id) ON DELETE CASCADE,
  source_item_id UUID NOT NULL REFERENCES public.source_items (id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE public.story_sources IS
  'Stores the original intake source for a Story (provenance).';

CREATE UNIQUE INDEX idx_story_sources_story_item_active
  ON public.story_sources (story_id, source_item_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_story_sources_organization_id ON public.story_sources (organization_id);
CREATE INDEX idx_story_sources_story_id ON public.story_sources (story_id)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_story_sources_source_item_id ON public.story_sources (source_item_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER trg_story_sources_updated_at
  BEFORE UPDATE ON public.story_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.story_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "story_sources_select_member"
  ON public.story_sources FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "story_sources_insert_member"
  ON public.story_sources FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_member(organization_id)
    AND created_by = auth.uid()
  );

CREATE POLICY "story_sources_update_member"
  ON public.story_sources FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "story_sources_no_hard_delete"
  ON public.story_sources FOR DELETE TO authenticated
  USING (false);

GRANT SELECT, INSERT, UPDATE ON public.story_sources TO authenticated;
