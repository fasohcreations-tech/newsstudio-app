-- =============================================================================
-- MediaOS Feature 003 – Media Library / DAM
-- Migration: 20260324000005_media_library
--
-- Tables: media_folders, media_assets, media_tags, media_asset_tags, story_media
-- Storage buckets: organizations, stories, shared, templates, branding, temporary
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------

CREATE TYPE public.media_file_type AS ENUM (
  'image',
  'video',
  'audio',
  'pdf',
  'document',
  'text',
  'other'
);

CREATE TYPE public.media_storage_scope AS ENUM (
  'organizations',
  'stories',
  'shared',
  'templates',
  'branding',
  'temporary'
);

-- -----------------------------------------------------------------------------
-- media_folders
-- -----------------------------------------------------------------------------

CREATE TABLE public.media_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.media_folders (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT media_folders_name_not_blank CHECK (char_length(trim(name)) > 0)
);

CREATE INDEX idx_media_folders_organization_id ON public.media_folders (organization_id);
CREATE INDEX idx_media_folders_parent_id ON public.media_folders (parent_id);
CREATE INDEX idx_media_folders_deleted_at ON public.media_folders (deleted_at);

CREATE UNIQUE INDEX idx_media_folders_org_parent_name_active
  ON public.media_folders (organization_id, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name))
  WHERE deleted_at IS NULL;

CREATE TRIGGER trg_media_folders_updated_at
  BEFORE UPDATE ON public.media_folders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- media_assets
-- -----------------------------------------------------------------------------

CREATE TABLE public.media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  folder_id UUID REFERENCES public.media_folders (id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  storage_bucket public.media_storage_scope NOT NULL DEFAULT 'organizations',
  storage_path TEXT NOT NULL,
  file_type public.media_file_type NOT NULL DEFAULT 'other',
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL CHECK (file_size >= 0),
  width INTEGER CHECK (width IS NULL OR width > 0),
  height INTEGER CHECK (height IS NULL OR height > 0),
  duration_seconds NUMERIC(12, 3) CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  checksum TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  updated_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT media_assets_name_not_blank CHECK (char_length(trim(name)) > 0),
  CONSTRAINT media_assets_storage_path_not_blank CHECK (char_length(trim(storage_path)) > 0)
);

COMMENT ON TABLE public.media_assets IS
  'Digital asset registry for MediaOS DAM. Files live in Supabase Storage; metadata and org ownership live here.';

CREATE UNIQUE INDEX idx_media_assets_bucket_path_active
  ON public.media_assets (storage_bucket, storage_path)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_media_assets_organization_id ON public.media_assets (organization_id);
CREATE INDEX idx_media_assets_folder_id ON public.media_assets (folder_id);
CREATE INDEX idx_media_assets_file_type ON public.media_assets (file_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_media_assets_created_by ON public.media_assets (created_by);
CREATE INDEX idx_media_assets_updated_at ON public.media_assets (updated_at DESC);
CREATE INDEX idx_media_assets_deleted_at ON public.media_assets (deleted_at);
CREATE INDEX idx_media_assets_name_search ON public.media_assets
  USING gin (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(original_filename, '')));

CREATE TRIGGER trg_media_assets_updated_at
  BEFORE UPDATE ON public.media_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- media_tags
-- -----------------------------------------------------------------------------

CREATE TABLE public.media_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT media_tags_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

CREATE UNIQUE INDEX idx_media_tags_org_slug_active
  ON public.media_tags (organization_id, slug)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_media_tags_organization_id ON public.media_tags (organization_id);

CREATE TRIGGER trg_media_tags_updated_at
  BEFORE UPDATE ON public.media_tags
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- media_asset_tags
-- -----------------------------------------------------------------------------

CREATE TABLE public.media_asset_tags (
  media_asset_id UUID NOT NULL REFERENCES public.media_assets (id) ON DELETE CASCADE,
  media_tag_id UUID NOT NULL REFERENCES public.media_tags (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (media_asset_id, media_tag_id)
);

CREATE INDEX idx_media_asset_tags_tag_id ON public.media_asset_tags (media_tag_id);

-- -----------------------------------------------------------------------------
-- story_media (many-to-many Story ↔ Asset)
-- -----------------------------------------------------------------------------

CREATE TABLE public.story_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES public.stories (id) ON DELETE CASCADE,
  media_asset_id UUID NOT NULL REFERENCES public.media_assets (id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  label TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_story_media_story_asset_active
  ON public.story_media (story_id, media_asset_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_story_media_organization_id ON public.story_media (organization_id);
CREATE INDEX idx_story_media_story_id ON public.story_media (story_id);
CREATE INDEX idx_story_media_media_asset_id ON public.story_media (media_asset_id);
CREATE INDEX idx_story_media_deleted_at ON public.story_media (deleted_at);

CREATE TRIGGER trg_story_media_updated_at
  BEFORE UPDATE ON public.story_media
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Permissions
-- -----------------------------------------------------------------------------

INSERT INTO public.permissions (code, name, description, module)
SELECT v.code, v.name, v.description, v.module
FROM (
  VALUES
    ('media:read', 'View media', 'View media library assets and folders', 'media'),
    ('media:upload', 'Upload media', 'Upload media assets to the library', 'media'),
    ('media:update', 'Update media', 'Rename, move, and edit media metadata', 'media'),
    ('media:delete', 'Delete media', 'Soft-delete media assets and folders', 'media'),
    ('media:restore', 'Restore media', 'Restore soft-deleted media assets', 'media')
) AS v(code, name, description, module)
WHERE NOT EXISTS (
  SELECT 1 FROM public.permissions p WHERE p.code = v.code AND p.deleted_at IS NULL
);

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.slug IN ('owner', 'admin')
  AND r.organization_id IS NULL
  AND r.deleted_at IS NULL
  AND p.module = 'media'
  AND p.deleted_at IS NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.code IN ('media:read', 'media:upload', 'media:update')
WHERE r.slug = 'editor'
  AND r.organization_id IS NULL
  AND r.deleted_at IS NULL
  AND p.deleted_at IS NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.code = 'media:read'
WHERE r.slug = 'viewer'
  AND r.organization_id IS NULL
  AND r.deleted_at IS NULL
  AND p.deleted_at IS NULL
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

ALTER TABLE public.media_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_asset_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_media ENABLE ROW LEVEL SECURITY;

-- folders
CREATE POLICY "media_folders_select_member"
  ON public.media_folders FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "media_folders_insert_member"
  ON public.media_folders FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_member(organization_id)
    AND created_by = auth.uid()
  );

CREATE POLICY "media_folders_update_member"
  ON public.media_folders FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "media_folders_no_hard_delete"
  ON public.media_folders FOR DELETE TO authenticated
  USING (false);

-- assets
CREATE POLICY "media_assets_select_member"
  ON public.media_assets FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "media_assets_insert_member"
  ON public.media_assets FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_member(organization_id)
    AND created_by = auth.uid()
  );

CREATE POLICY "media_assets_update_member"
  ON public.media_assets FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "media_assets_no_hard_delete"
  ON public.media_assets FOR DELETE TO authenticated
  USING (false);

-- tags
CREATE POLICY "media_tags_select_member"
  ON public.media_tags FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "media_tags_insert_member"
  ON public.media_tags FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "media_tags_update_member"
  ON public.media_tags FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "media_tags_no_hard_delete"
  ON public.media_tags FOR DELETE TO authenticated
  USING (false);

-- asset tags
CREATE POLICY "media_asset_tags_select_member"
  ON public.media_asset_tags FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.media_assets a
      WHERE a.id = media_asset_tags.media_asset_id
        AND public.is_org_member(a.organization_id)
    )
  );

CREATE POLICY "media_asset_tags_insert_member"
  ON public.media_asset_tags FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.media_assets a
      WHERE a.id = media_asset_tags.media_asset_id
        AND public.is_org_member(a.organization_id)
    )
  );

CREATE POLICY "media_asset_tags_delete_member"
  ON public.media_asset_tags FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.media_assets a
      WHERE a.id = media_asset_tags.media_asset_id
        AND public.is_org_member(a.organization_id)
    )
  );

-- story_media
CREATE POLICY "story_media_select_member"
  ON public.story_media FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "story_media_insert_member"
  ON public.story_media FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_member(organization_id)
    AND created_by = auth.uid()
  );

CREATE POLICY "story_media_update_member"
  ON public.story_media FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "story_media_no_hard_delete"
  ON public.story_media FOR DELETE TO authenticated
  USING (false);

-- -----------------------------------------------------------------------------
-- Storage buckets
-- Path convention: {organization_id}/[optional-subpath]/filename
-- -----------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('organizations', 'organizations', false, 524288000, NULL),
  ('stories', 'stories', false, 524288000, NULL),
  ('shared', 'shared', false, 524288000, NULL),
  ('templates', 'templates', false, 104857600, NULL),
  ('branding', 'branding', false, 52428800, NULL),
  ('temporary', 'temporary', false, 524288000, NULL)
ON CONFLICT (id) DO NOTHING;

-- Helper: first path segment is organization UUID
CREATE OR REPLACE FUNCTION public.storage_org_id(object_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  segment TEXT;
BEGIN
  segment := split_part(object_name, '/', 1);
  IF segment ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN segment::UUID;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_access_storage_object(object_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.storage_org_id(object_name) IS NULL THEN false
    ELSE public.is_org_member(public.storage_org_id(object_name))
  END;
$$;

GRANT EXECUTE ON FUNCTION public.storage_org_id(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_storage_object(TEXT) TO authenticated;

DO $$
DECLARE
  bucket_name TEXT;
BEGIN
  FOREACH bucket_name IN ARRAY ARRAY[
    'organizations', 'stories', 'shared', 'templates', 'branding', 'temporary'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "media_storage_select_%1$s" ON storage.objects;', bucket_name);
    EXECUTE format('DROP POLICY IF EXISTS "media_storage_insert_%1$s" ON storage.objects;', bucket_name);
    EXECUTE format('DROP POLICY IF EXISTS "media_storage_update_%1$s" ON storage.objects;', bucket_name);
    EXECUTE format('DROP POLICY IF EXISTS "media_storage_delete_%1$s" ON storage.objects;', bucket_name);

    EXECUTE format(
      'CREATE POLICY "media_storage_select_%1$s"
         ON storage.objects FOR SELECT TO authenticated
         USING (bucket_id = %1$L AND public.can_access_storage_object(name));',
      bucket_name
    );

    EXECUTE format(
      'CREATE POLICY "media_storage_insert_%1$s"
         ON storage.objects FOR INSERT TO authenticated
         WITH CHECK (bucket_id = %1$L AND public.can_access_storage_object(name));',
      bucket_name
    );

    EXECUTE format(
      'CREATE POLICY "media_storage_update_%1$s"
         ON storage.objects FOR UPDATE TO authenticated
         USING (bucket_id = %1$L AND public.can_access_storage_object(name))
         WITH CHECK (bucket_id = %1$L AND public.can_access_storage_object(name));',
      bucket_name
    );

    EXECUTE format(
      'CREATE POLICY "media_storage_delete_%1$s"
         ON storage.objects FOR DELETE TO authenticated
         USING (bucket_id = %1$L AND public.can_access_storage_object(name));',
      bucket_name
    );
  END LOOP;
END;
$$;

-- -----------------------------------------------------------------------------
-- Grants
-- -----------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE ON public.media_folders TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.media_assets TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.media_tags TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.media_asset_tags TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.story_media TO authenticated;
