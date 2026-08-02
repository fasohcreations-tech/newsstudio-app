-- =============================================================================
-- MediaOS Module 2.1 – Allow AI Center / system jobs without a story
-- Migration: 20260324000011_ai_jobs_story_optional
-- =============================================================================

ALTER TABLE public.ai_jobs
  ALTER COLUMN story_id DROP NOT NULL;

COMMENT ON COLUMN public.ai_jobs.story_id IS
  'Optional story binding. Null for AI Center / system test jobs.';
