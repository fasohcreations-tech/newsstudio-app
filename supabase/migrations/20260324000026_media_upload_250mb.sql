-- =============================================================================
-- Raise Media Library storage upload limit to 250MB per object
-- Migration: 20260324000026_media_upload_250mb
--
-- IMPORTANT: This only updates per-bucket limits.
-- You MUST also raise the project GLOBAL file size limit in the Dashboard:
--   Project → Storage → Settings → Global file size limit → 250 MB (or higher)
-- Free-tier projects are often capped at 50MB until upgraded to Pro.
--
-- If buckets were created before migration 000005 with ON CONFLICT DO NOTHING,
-- they may still be at the default 50MB — this UPDATE fixes that.
-- =============================================================================

-- 250 * 1024 * 1024 = 262144000
UPDATE storage.buckets
SET file_size_limit = 262144000
WHERE id IN ('organizations', 'stories', 'shared', 'temporary');

NOTIFY pgrst, 'reload schema';
