-- =============================================================================
-- MediaOS Feature 004 – Story Workspace
-- Migration: 20260324000006_story_workspace
--
-- story_scripts: version-ready script documents for the Story Workspace
-- =============================================================================

CREATE TABLE public.story_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES public.stories (id) ON DELETE CASCADE,
  content_html TEXT NOT NULL DEFAULT '',
  content_plain TEXT NOT NULL DEFAULT '',
  word_count INTEGER NOT NULL DEFAULT 0 CHECK (word_count >= 0),
  character_count INTEGER NOT NULL DEFAULT 0 CHECK (character_count >= 0),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  is_current BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  updated_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE public.story_scripts IS
  'Story Workspace script documents. is_current marks the editable head; future History will retain prior versions.';

CREATE UNIQUE INDEX idx_story_scripts_current
  ON public.story_scripts (story_id)
  WHERE is_current = true AND deleted_at IS NULL;

CREATE INDEX idx_story_scripts_organization_id ON public.story_scripts (organization_id);
CREATE INDEX idx_story_scripts_story_id ON public.story_scripts (story_id);
CREATE INDEX idx_story_scripts_updated_at ON public.story_scripts (updated_at DESC);
CREATE INDEX idx_story_scripts_deleted_at ON public.story_scripts (deleted_at);

CREATE TRIGGER trg_story_scripts_updated_at
  BEFORE UPDATE ON public.story_scripts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Ensure at most one current script is maintained by application logic;
-- unique partial index above enforces it.

ALTER TABLE public.story_scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "story_scripts_select_member"
  ON public.story_scripts FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "story_scripts_insert_member"
  ON public.story_scripts FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_member(organization_id)
    AND created_by = auth.uid()
  );

CREATE POLICY "story_scripts_update_member"
  ON public.story_scripts FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "story_scripts_no_hard_delete"
  ON public.story_scripts FOR DELETE TO authenticated
  USING (false);

GRANT SELECT, INSERT, UPDATE ON public.story_scripts TO authenticated;
