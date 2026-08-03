-- =============================================================================
-- MediaOS — Sub Headline media references for scene building
-- Migration: 20260324000021_story_sub_headline_media
--
-- Each of 4 sub-headline slots can reference image / video / caption media.
-- =============================================================================

ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS sub_headline_media JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.stories.sub_headline_media IS
  'Array of up to 4 sub-headline media refs: { kind: image|video|caption|"", ref: library://…|url, caption: string }. Used for lower-info scene building.';
