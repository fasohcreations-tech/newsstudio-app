-- =============================================================================
-- MediaOS Module 2 – AI Workspace (Story Assistant)
-- Migration: 20260324000010_ai_workspace
--
-- Per-story AI conversation + generated outputs.
-- Chat architecture only — no external AI providers.
-- =============================================================================

CREATE TYPE public.ai_message_role AS ENUM (
  'user',
  'assistant',
  'system'
);

CREATE TYPE public.ai_workspace_action_type AS ENUM (
  'research',
  'generate_script',
  'translate',
  'generate_voice',
  'create_timeline',
  'create_thumbnail',
  'create_poster',
  'seo',
  'social_package',
  'fact_check',
  'chat'
);

CREATE TYPE public.ai_workspace_output_status AS ENUM (
  'generating',
  'waiting_for_approval',
  'approved',
  'rejected',
  'cancelled'
);

-- -----------------------------------------------------------------------------
-- ai_conversations
-- -----------------------------------------------------------------------------

CREATE TABLE public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES public.stories (id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Story Assistant',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  updated_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT ai_conversations_metadata_object CHECK (jsonb_typeof(metadata) = 'object'),
  CONSTRAINT ai_conversations_story_unique UNIQUE (story_id)
);

COMMENT ON TABLE public.ai_conversations IS
  'One active AI Workspace conversation per story (chat architecture, no providers).';

CREATE INDEX idx_ai_conversations_organization_id
  ON public.ai_conversations (organization_id)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_ai_conversations_story_id
  ON public.ai_conversations (story_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER trg_ai_conversations_updated_at
  BEFORE UPDATE ON public.ai_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_conversations_select_member"
  ON public.ai_conversations FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "ai_conversations_insert_member"
  ON public.ai_conversations FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_member(organization_id)
    AND created_by = auth.uid()
  );

CREATE POLICY "ai_conversations_update_member"
  ON public.ai_conversations FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "ai_conversations_no_hard_delete"
  ON public.ai_conversations FOR DELETE TO authenticated
  USING (false);

GRANT SELECT, INSERT, UPDATE ON public.ai_conversations TO authenticated;

-- -----------------------------------------------------------------------------
-- ai_messages
-- -----------------------------------------------------------------------------

CREATE TABLE public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations (id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES public.stories (id) ON DELETE CASCADE,
  role public.ai_message_role NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  action_type public.ai_workspace_action_type,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT ai_messages_metadata_object CHECK (jsonb_typeof(metadata) = 'object'),
  CONSTRAINT ai_messages_content_length CHECK (char_length(content) <= 50000)
);

COMMENT ON TABLE public.ai_messages IS
  'AI Workspace chat messages (user / assistant / system). Mock replies only.';

CREATE INDEX idx_ai_messages_conversation_id
  ON public.ai_messages (conversation_id, created_at)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_ai_messages_story_id
  ON public.ai_messages (story_id)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_ai_messages_organization_id
  ON public.ai_messages (organization_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER trg_ai_messages_updated_at
  BEFORE UPDATE ON public.ai_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_messages_select_member"
  ON public.ai_messages FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "ai_messages_insert_member"
  ON public.ai_messages FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "ai_messages_update_member"
  ON public.ai_messages FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "ai_messages_no_hard_delete"
  ON public.ai_messages FOR DELETE TO authenticated
  USING (false);

GRANT SELECT, INSERT, UPDATE ON public.ai_messages TO authenticated;

-- -----------------------------------------------------------------------------
-- ai_workspace_outputs
-- -----------------------------------------------------------------------------

CREATE TABLE public.ai_workspace_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES public.stories (id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.ai_conversations (id) ON DELETE SET NULL,
  message_id UUID REFERENCES public.ai_messages (id) ON DELETE SET NULL,
  action_type public.ai_workspace_action_type NOT NULL,
  status public.ai_workspace_output_status NOT NULL DEFAULT 'waiting_for_approval',
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  content_version INTEGER NOT NULL DEFAULT 1 CHECK (content_version >= 1),
  ai_job_id UUID REFERENCES public.ai_jobs (id) ON DELETE SET NULL,
  structured JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  rejected_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  rejection_reason TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  updated_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT ai_workspace_outputs_structured_object CHECK (jsonb_typeof(structured) = 'object')
);

COMMENT ON TABLE public.ai_workspace_outputs IS
  'Generated AI Workspace items with Approve / Reject / Edit / Regenerate.';

CREATE INDEX idx_ai_workspace_outputs_story_id
  ON public.ai_workspace_outputs (story_id, created_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_ai_workspace_outputs_status
  ON public.ai_workspace_outputs (story_id, status)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_ai_workspace_outputs_organization_id
  ON public.ai_workspace_outputs (organization_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER trg_ai_workspace_outputs_updated_at
  BEFORE UPDATE ON public.ai_workspace_outputs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.ai_workspace_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_workspace_outputs_select_member"
  ON public.ai_workspace_outputs FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "ai_workspace_outputs_insert_member"
  ON public.ai_workspace_outputs FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_member(organization_id)
    AND created_by = auth.uid()
  );

CREATE POLICY "ai_workspace_outputs_update_member"
  ON public.ai_workspace_outputs FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "ai_workspace_outputs_no_hard_delete"
  ON public.ai_workspace_outputs FOR DELETE TO authenticated
  USING (false);

GRANT SELECT, INSERT, UPDATE ON public.ai_workspace_outputs TO authenticated;
