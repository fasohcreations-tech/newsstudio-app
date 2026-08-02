-- =============================================================================
-- MediaOS Foundation Schema
-- Migration: 20260324000001_foundation
--
-- Tables: profiles, organizations, workspaces, organization_members,
--         roles, permissions, role_permissions
-- Includes: UUID PKs, timestamps, soft deletes, FKs, indexes, RLS, helpers
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------

CREATE TYPE public.membership_status AS ENUM ('active', 'invited', 'suspended');

-- -----------------------------------------------------------------------------
-- Shared trigger: updated_at
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  preferred_locale TEXT NOT NULL DEFAULT 'en',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_profiles_email ON public.profiles (email) WHERE deleted_at IS NULL;
CREATE INDEX idx_profiles_deleted_at ON public.profiles (deleted_at);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- organizations
-- -----------------------------------------------------------------------------

CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  logo_url TEXT,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT organizations_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

CREATE UNIQUE INDEX idx_organizations_slug_active
  ON public.organizations (slug)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_organizations_deleted_at ON public.organizations (deleted_at);

CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- workspaces (organization-scoped)
-- -----------------------------------------------------------------------------

CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT workspaces_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

CREATE UNIQUE INDEX idx_workspaces_org_slug_active
  ON public.workspaces (organization_id, slug)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_workspaces_organization_id ON public.workspaces (organization_id);
CREATE INDEX idx_workspaces_deleted_at ON public.workspaces (deleted_at);

CREATE TRIGGER trg_workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- roles
-- organization_id NULL = system-wide role template
-- -----------------------------------------------------------------------------

CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT roles_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

CREATE UNIQUE INDEX idx_roles_system_slug_active
  ON public.roles (slug)
  WHERE organization_id IS NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX idx_roles_org_slug_active
  ON public.roles (organization_id, slug)
  WHERE organization_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX idx_roles_organization_id ON public.roles (organization_id);
CREATE INDEX idx_roles_deleted_at ON public.roles (deleted_at);

CREATE TRIGGER trg_roles_updated_at
  BEFORE UPDATE ON public.roles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- permissions (system catalog)
-- -----------------------------------------------------------------------------

CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  module TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT permissions_code_format CHECK (code ~ '^[a-z0-9_]+(?::[a-z0-9_]+)+$')
);

CREATE UNIQUE INDEX idx_permissions_code_active
  ON public.permissions (code)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_permissions_module ON public.permissions (module);
CREATE INDEX idx_permissions_deleted_at ON public.permissions (deleted_at);

CREATE TRIGGER trg_permissions_updated_at
  BEFORE UPDATE ON public.permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- role_permissions
-- -----------------------------------------------------------------------------

CREATE TABLE public.role_permissions (
  role_id UUID NOT NULL REFERENCES public.roles (id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX idx_role_permissions_permission_id ON public.role_permissions (permission_id);

-- -----------------------------------------------------------------------------
-- organization_members
-- -----------------------------------------------------------------------------

CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles (id) ON DELETE RESTRICT,
  default_workspace_id UUID REFERENCES public.workspaces (id) ON DELETE SET NULL,
  status public.membership_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_org_members_org_user_active
  ON public.organization_members (organization_id, user_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_org_members_user_id ON public.organization_members (user_id);
CREATE INDEX idx_org_members_role_id ON public.organization_members (role_id);
CREATE INDEX idx_org_members_status ON public.organization_members (status);
CREATE INDEX idx_org_members_deleted_at ON public.organization_members (deleted_at);

CREATE TRIGGER trg_organization_members_updated_at
  BEFORE UPDATE ON public.organization_members
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Auto-create profile on auth.users insert
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- RLS helper functions (SECURITY DEFINER to avoid recursive policy checks)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_org_member(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members m
    WHERE m.organization_id = org_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND m.deleted_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_org_role_slug(org_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.slug
  FROM public.organization_members m
  JOIN public.roles r ON r.id = m.role_id
  WHERE m.organization_id = org_id
    AND m.user_id = auth.uid()
    AND m.status = 'active'
    AND m.deleted_at IS NULL
    AND r.deleted_at IS NULL
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_org_permission(org_id UUID, permission_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members m
    JOIN public.role_permissions rp ON rp.role_id = m.role_id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE m.organization_id = org_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND m.deleted_at IS NULL
      AND p.code = permission_code
      AND p.deleted_at IS NULL
  );
$$;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "profiles_select_org_peers"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.organization_members self_m
      JOIN public.organization_members peer_m
        ON peer_m.organization_id = self_m.organization_id
      WHERE self_m.user_id = auth.uid()
        AND self_m.status = 'active'
        AND self_m.deleted_at IS NULL
        AND peer_m.user_id = profiles.id
        AND peer_m.status = 'active'
        AND peer_m.deleted_at IS NULL
    )
  );

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (id = auth.uid() AND deleted_at IS NULL);

-- organizations
CREATE POLICY "organizations_select_member"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL AND public.is_org_member(id));

CREATE POLICY "organizations_insert_authenticated"
  ON public.organizations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "organizations_update_admin"
  ON public.organizations FOR UPDATE
  TO authenticated
  USING (
    deleted_at IS NULL
    AND public.get_user_org_role_slug(id) IN ('owner', 'admin')
  )
  WITH CHECK (
    deleted_at IS NULL
    AND public.get_user_org_role_slug(id) IN ('owner', 'admin')
  );

-- workspaces
CREATE POLICY "workspaces_select_member"
  ON public.workspaces FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL AND public.is_org_member(organization_id));

CREATE POLICY "workspaces_insert_admin"
  ON public.workspaces FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_org_role_slug(organization_id) IN ('owner', 'admin')
  );

CREATE POLICY "workspaces_update_admin"
  ON public.workspaces FOR UPDATE
  TO authenticated
  USING (
    deleted_at IS NULL
    AND public.get_user_org_role_slug(organization_id) IN ('owner', 'admin')
  )
  WITH CHECK (
    deleted_at IS NULL
    AND public.get_user_org_role_slug(organization_id) IN ('owner', 'admin')
  );

-- roles
CREATE POLICY "roles_select_visible"
  ON public.roles FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      organization_id IS NULL
      OR public.is_org_member(organization_id)
    )
  );

CREATE POLICY "roles_manage_admin"
  ON public.roles FOR ALL
  TO authenticated
  USING (
    organization_id IS NOT NULL
    AND deleted_at IS NULL
    AND public.get_user_org_role_slug(organization_id) IN ('owner', 'admin')
  )
  WITH CHECK (
    organization_id IS NOT NULL
    AND public.get_user_org_role_slug(organization_id) IN ('owner', 'admin')
  );

-- permissions (read-only catalog for authenticated users)
CREATE POLICY "permissions_select_authenticated"
  ON public.permissions FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

-- role_permissions
CREATE POLICY "role_permissions_select_authenticated"
  ON public.role_permissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.roles r
      WHERE r.id = role_permissions.role_id
        AND r.deleted_at IS NULL
        AND (
          r.organization_id IS NULL
          OR public.is_org_member(r.organization_id)
        )
    )
  );

CREATE POLICY "role_permissions_manage_admin"
  ON public.role_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.roles r
      WHERE r.id = role_permissions.role_id
        AND r.organization_id IS NOT NULL
        AND public.get_user_org_role_slug(r.organization_id) IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.roles r
      WHERE r.id = role_permissions.role_id
        AND r.organization_id IS NOT NULL
        AND public.get_user_org_role_slug(r.organization_id) IN ('owner', 'admin')
    )
  );

-- organization_members
CREATE POLICY "org_members_select_member"
  ON public.organization_members FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      user_id = auth.uid()
      OR public.is_org_member(organization_id)
    )
  );

CREATE POLICY "org_members_insert_admin"
  ON public.organization_members FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_org_role_slug(organization_id) IN ('owner', 'admin')
    OR NOT EXISTS (
      SELECT 1
      FROM public.organization_members existing
      WHERE existing.organization_id = organization_members.organization_id
        AND existing.deleted_at IS NULL
    )
  );

CREATE POLICY "org_members_update_admin"
  ON public.organization_members FOR UPDATE
  TO authenticated
  USING (
    deleted_at IS NULL
    AND public.get_user_org_role_slug(organization_id) IN ('owner', 'admin')
  )
  WITH CHECK (
    public.get_user_org_role_slug(organization_id) IN ('owner', 'admin')
  );

-- -----------------------------------------------------------------------------
-- System seed: roles & permission catalog (reference data, not demo content)
-- -----------------------------------------------------------------------------

INSERT INTO public.roles (name, slug, description, is_system)
VALUES
  ('Owner', 'owner', 'Full organization control including billing and deletion', true),
  ('Admin', 'admin', 'Administrative access to members, workspaces, and settings', true),
  ('Editor', 'editor', 'Create and edit media content within assigned workspaces', true),
  ('Viewer', 'viewer', 'Read-only access to organization resources', true);

INSERT INTO public.permissions (code, name, description, module)
VALUES
  ('org:read', 'View organization', 'View organization profile and settings', 'organization'),
  ('org:update', 'Update organization', 'Update organization profile and settings', 'organization'),
  ('org:members:read', 'View members', 'View organization membership', 'organization'),
  ('org:members:manage', 'Manage members', 'Invite, update, and remove members', 'organization'),
  ('workspace:read', 'View workspaces', 'View workspaces in the organization', 'workspace'),
  ('workspace:manage', 'Manage workspaces', 'Create and update workspaces', 'workspace'),
  ('profile:read', 'View profiles', 'View member profiles', 'profile'),
  ('profile:update', 'Update own profile', 'Update personal profile settings', 'profile');

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.slug = 'owner' AND r.organization_id IS NULL AND r.deleted_at IS NULL;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.slug = 'admin'
  AND r.organization_id IS NULL
  AND r.deleted_at IS NULL
  AND p.code <> 'org:update';

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.code IN (
  'org:read',
  'org:members:read',
  'workspace:read',
  'profile:read',
  'profile:update'
)
WHERE r.slug = 'editor'
  AND r.organization_id IS NULL
  AND r.deleted_at IS NULL;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.code IN (
  'org:read',
  'workspace:read',
  'profile:read',
  'profile:update'
)
WHERE r.slug = 'viewer'
  AND r.organization_id IS NULL
  AND r.deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- Grants
-- -----------------------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.organizations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.workspaces TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roles TO authenticated;
GRANT SELECT ON public.permissions TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.role_permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.organization_members TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_org_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_org_permission(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_org_role_slug(UUID) TO authenticated;
