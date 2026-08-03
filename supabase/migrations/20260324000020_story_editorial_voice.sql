-- =============================================================================
-- MediaOS Production Pipeline Step 1
-- Migration: 20260324000020_story_editorial_voice
--
-- Editorial Approval + Voice Generation fields on stories.
-- Audio files live in the existing `stories` storage bucket.
-- =============================================================================

CREATE TYPE public.story_voice_status AS ENUM (
  'none',
  'pending',
  'generating',
  'ready',
  'failed',
  'stale'
);

ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS approved_script TEXT,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS voice_status public.story_voice_status NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS voice_url TEXT,
  ADD COLUMN IF NOT EXISTS voice_duration_ms INTEGER,
  ADD COLUMN IF NOT EXISTS voice_name TEXT,
  ADD COLUMN IF NOT EXISTS voice_language TEXT,
  ADD COLUMN IF NOT EXISTS voice_speaking_rate NUMERIC(4, 2),
  ADD COLUMN IF NOT EXISTS voice_pitch NUMERIC(4, 2),
  ADD COLUMN IF NOT EXISTS voice_volume_gain_db NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS voice_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS voice_error TEXT,
  ADD COLUMN IF NOT EXISTS voice_storage_path TEXT;

COMMENT ON COLUMN public.stories.approved_script IS
  'Plain-text script snapshot locked at editorial approval. Used as TTS input.';
COMMENT ON COLUMN public.stories.voice_status IS
  'Voice pipeline status: none → pending/generating → ready | failed | stale.';
COMMENT ON COLUMN public.stories.voice_url IS
  'Signed or public URL for the latest generated voice audio.';
COMMENT ON COLUMN public.stories.voice_storage_path IS
  'Supabase Storage object path within the stories bucket.';

CREATE INDEX IF NOT EXISTS idx_stories_voice_status
  ON public.stories (voice_status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_stories_approved_at
  ON public.stories (approved_at DESC NULLS LAST)
  WHERE deleted_at IS NULL;
