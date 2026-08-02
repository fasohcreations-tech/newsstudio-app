-- MediaOS Module 2.5 — Smart Editor draft metadata convention
-- No new tables. Editor drafts reuse content_objects with:
--   type = 'article'
--   metadata.module = 'smart_editor'
--   metadata fields: editorVersion, bodyHtml, bodyPlain, language,
--     revision, lastCursorPosition, newsroomFormat, wordCount,
--     characterCount, autosavedAt
-- This migration is documentation-only for operators applying SQL manually.

SELECT 1;
