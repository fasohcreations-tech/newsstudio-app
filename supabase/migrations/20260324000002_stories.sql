-- =============================================================================
-- MediaOS Feature 002 – Newsroom / Story Manager Foundation
-- Migration: 20260324000002_stories
--
-- Primary business object: stories
-- Designed for future story_versions without requiring them yet.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------

CREATE TYPE public.story_status AS ENUM (
  'draft',
  'assigned',
  'in_progress',
  'review',
  'approved',
  'published',
  'archived'
);

CREATE TYPE public.story_priority AS ENUM (
  'low',
  'normal',
  'high',
  'urgent'
);

-- -----------------------------------------------------------------------------
-- stories
-- -----------------------------------------------------------------------------

CREATE TABLE public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subtitle TEXT,
  slug TEXT NOT NULL,
  summary TEXT,
  status public.story_status NOT NULL DEFAULT 'draft',
  priority public.story_priority NOT NULL DEFAULT 'normal',
  category TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  reporter_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  editor_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  updated_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT stories_title_not_blank CHECK (char_length(trim(title)) > 0),
  CONSTRAINT stories_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT stories_language_not_blank CHECK (char_length(trim(language)) > 0)
);

COMMENT ON TABLE public.stories IS
  'Primary MediaOS business object. Future story_versions will reference stories(id).';

COMMENT ON COLUMN public.stories.deleted_at IS
  'Soft delete timestamp. Trash view filters WHERE deleted_at IS NOT NULL.';

CREATE UNIQUE INDEX idx_stories_org_slug_active
  ON public.stories (organization_id, slug)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_stories_organization_id ON public.stories (organization_id);
CREATE INDEX idx_stories_status ON public.stories (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_stories_priority ON public.stories (priority) WHERE deleted_at IS NULL;
CREATE INDEX idx_stories_category ON public.stories (organization_id, category)
  WHERE deleted_at IS NULL AND category IS NOT NULL;
CREATE INDEX idx_stories_reporter_id ON public.stories (reporter_id);
CREATE INDEX idx_stories_editor_id ON public.stories (editor_id);
CREATE INDEX idx_stories_created_by ON public.stories (created_by);
CREATE INDEX idx_stories_published_at ON public.stories (published_at DESC NULLS LAST);
CREATE INDEX idx_stories_updated_at ON public.stories (updated_at DESC);
CREATE INDEX idx_stories_deleted_at ON public.stories (deleted_at);
CREATE INDEX idx_stories_title_search ON public.stories
  USING gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(summary, '')));

CREATE TRIGGER trg_stories_updated_at
  BEFORE UPDATE ON public.stories
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Auto-set published_at when status transitions to published
CREATE OR REPLACE FUNCTION public.stories_set_published_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'published' AND (OLD.status IS DISTINCT FROM 'published') THEN
    NEW.published_at = coalesce(NEW.published_at, timezone('utc', now()));
  END IF;

  IF NEW.status IS DISTINCT FROM 'published' AND OLD.status = 'published' THEN
    -- Keep historical published_at unless explicitly cleared by the client
    NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_stories_published_at
  BEFORE UPDATE ON public.stories
  FOR EACH ROW
  EXECUTE FUNCTION public.stories_set_published_at();

-- -----------------------------------------------------------------------------
-- Story permissions (RBAC catalog extension)
-- -----------------------------------------------------------------------------

INSERT INTO public.permissions (code, name, description, module)
SELECT v.code, v.name, v.description, v.module
FROM (
  VALUES
    ('stories:read', 'View stories', 'View stories within the organization', 'newsroom'),
    ('stories:create', 'Create stories', 'Create new stories', 'newsroom'),
    ('stories:update', 'Update stories', 'Edit existing stories', 'newsroom'),
    ('stories:delete', 'Delete stories', 'Soft-delete stories', 'newsroom'),
    ('stories:publish', 'Publish stories', 'Approve and publish stories', 'newsroom'),
    ('stories:restore', 'Restore stories', 'Restore soft-deleted stories', 'newsroom')
) AS v(code, name, description, module)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.permissions p
  WHERE p.code = v.code
    AND p.deleted_at IS NULL
);

-- Owner: all story permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.slug = 'owner'
  AND r.organization_id IS NULL
  AND r.deleted_at IS NULL
  AND p.module = 'newsroom'
  AND p.deleted_at IS NULL
ON CONFLICT DO NOTHING;

-- Admin: all story permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.slug = 'admin'
  AND r.organization_id IS NULL
  AND r.deleted_at IS NULL
  AND p.module = 'newsroom'
  AND p.deleted_at IS NULL
ON CONFLICT DO NOTHING;

-- Editor: read/create/update (not delete/publish/restore by default)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.code IN (
  'stories:read',
  'stories:create',
  'stories:update'
)
WHERE r.slug = 'editor'
  AND r.organization_id IS NULL
  AND r.deleted_at IS NULL
  AND p.deleted_at IS NULL
ON CONFLICT DO NOTHING;

-- Viewer: read only
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.code = 'stories:read'
WHERE r.slug = 'viewer'
  AND r.organization_id IS NULL
  AND r.deleted_at IS NULL
  AND p.deleted_at IS NULL
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stories_select_member"
  ON public.stories FOR SELECT
  TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "stories_insert_member"
  ON public.stories FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_org_member(organization_id)
    AND created_by = auth.uid()
    AND (
      public.has_org_permission(organization_id, 'stories:create')
      OR public.get_user_org_role_slug(organization_id) IN ('owner', 'admin', 'editor')
    )
  );

CREATE POLICY "stories_update_member"
  ON public.stories FOR UPDATE
  TO authenticated
  USING (
    public.is_org_member(organization_id)
    AND (
      public.has_org_permission(organization_id, 'stories:update')
      OR public.has_org_permission(organization_id, 'stories:delete')
      OR public.has_org_permission(organization_id, 'stories:restore')
      OR public.has_org_permission(organization_id, 'stories:publish')
      OR public.get_user_org_role_slug(organization_id) IN ('owner', 'admin', 'editor')
    )
  )
  WITH CHECK (public.is_org_member(organization_id));

-- Soft delete only — no hard DELETE policy for authenticated clients
CREATE POLICY "stories_no_hard_delete"
  ON public.stories FOR DELETE
  TO authenticated
  USING (false);

-- -----------------------------------------------------------------------------
-- Grants
-- -----------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE ON public.stories TO authenticated;
