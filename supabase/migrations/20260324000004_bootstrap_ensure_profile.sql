-- =============================================================================
-- MediaOS – Ensure profile exists during org bootstrap
-- Migration: 20260324000004_bootstrap_ensure_profile
--
-- organization_members.user_id FK references profiles(id).
-- Users created before the foundation trigger (or without a profile row)
-- fail membership insert. Bootstrap now upserts the profile from auth.users.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.bootstrap_personal_organization(
  org_name TEXT,
  org_slug TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_org_id UUID;
  new_org_id UUID;
  owner_role_id UUID;
  new_workspace_id UUID;
  current_user_id UUID := auth.uid();
  auth_email TEXT;
  auth_full_name TEXT;
  auth_avatar_url TEXT;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Ensure a profiles row exists for the authenticated user (FK target).
  SELECT
    u.email,
    COALESCE(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
    u.raw_user_meta_data ->> 'avatar_url'
  INTO auth_email, auth_full_name, auth_avatar_url
  FROM auth.users u
  WHERE u.id = current_user_id;

  IF auth_email IS NULL THEN
    RAISE EXCEPTION 'Authenticated user was not found in auth.users';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    current_user_id,
    auth_email,
    auth_full_name,
    auth_avatar_url
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
    deleted_at = NULL,
    updated_at = timezone('utc', now());

  SELECT m.organization_id
  INTO existing_org_id
  FROM public.organization_members m
  WHERE m.user_id = current_user_id
    AND m.status = 'active'
    AND m.deleted_at IS NULL
  LIMIT 1;

  IF existing_org_id IS NOT NULL THEN
    RETURN existing_org_id;
  END IF;

  IF org_name IS NULL OR char_length(trim(org_name)) = 0 THEN
    RAISE EXCEPTION 'Organization name is required';
  END IF;

  IF org_slug IS NULL OR org_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' THEN
    RAISE EXCEPTION 'Organization slug is invalid';
  END IF;

  INSERT INTO public.organizations (name, slug)
  VALUES (trim(org_name), org_slug)
  RETURNING id INTO new_org_id;

  SELECT r.id
  INTO owner_role_id
  FROM public.roles r
  WHERE r.slug = 'owner'
    AND r.organization_id IS NULL
    AND r.deleted_at IS NULL
  LIMIT 1;

  IF owner_role_id IS NULL THEN
    RAISE EXCEPTION 'System owner role is missing. Apply foundation migration.';
  END IF;

  INSERT INTO public.organization_members (
    organization_id,
    user_id,
    role_id,
    status
  )
  VALUES (
    new_org_id,
    current_user_id,
    owner_role_id,
    'active'
  );

  INSERT INTO public.workspaces (
    organization_id,
    name,
    slug
  )
  VALUES (
    new_org_id,
    'Main Desk',
    'main'
  )
  RETURNING id INTO new_workspace_id;

  UPDATE public.organization_members
  SET default_workspace_id = new_workspace_id
  WHERE organization_id = new_org_id
    AND user_id = current_user_id
    AND deleted_at IS NULL;

  RETURN new_org_id;
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_personal_organization(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bootstrap_personal_organization(TEXT, TEXT) TO authenticated;
