/**
 * Shared enums for MediaOS Core Content Architecture (Feature 004.5).
 * Values mirror Postgres enums in 20260324000007_core_content_architecture.sql.
 */

export const CONTENT_OBJECT_TYPES = [
  "script",
  "article",
  "video_package",
  "graphic",
  "voiceover",
  "timeline",
  "clip",
  "package",
  "other",
] as const;

export type ContentObjectType = (typeof CONTENT_OBJECT_TYPES)[number];

export const CONTENT_OBJECT_STATUSES = [
  "draft",
  "in_progress",
  "ready",
  "published",
  "archived",
  "failed",
] as const;

export type ContentObjectStatus = (typeof CONTENT_OBJECT_STATUSES)[number];

export const OUTPUT_PLATFORMS = [
  "youtube",
  "facebook",
  "instagram",
  "website",
  "telegram",
  "broadcast",
  "shorts",
  "reels",
] as const;

export type OutputPlatform = (typeof OUTPUT_PLATFORMS)[number];

export const OUTPUT_PACKAGE_STATUSES = [
  "draft",
  "ready",
  "published",
  "failed",
] as const;

export type OutputPackageStatus = (typeof OUTPUT_PACKAGE_STATUSES)[number];

export const AI_JOB_STATUSES = [
  "queued",
  "running",
  "succeeded",
  "failed",
  "cancelled",
] as const;

export type AiJobStatus = (typeof AI_JOB_STATUSES)[number];

/** Common AI job_type values — open string in DB; these are recommended codes. */
export const AI_JOB_TYPES = [
  "generate_script",
  "summarize",
  "translate",
  "caption",
  "tag",
  "rewrite",
  "voiceover_script",
  "other",
] as const;

export type AiJobType = (typeof AI_JOB_TYPES)[number];

export const RENDER_JOB_STATUSES = [
  "queued",
  "running",
  "succeeded",
  "failed",
  "cancelled",
] as const;

export type RenderJobStatus = (typeof RENDER_JOB_STATUSES)[number];

export const PUBLISH_JOB_STATUSES = [
  "queued",
  "scheduled",
  "publishing",
  "published",
  "failed",
  "cancelled",
] as const;

export type PublishJobStatus = (typeof PUBLISH_JOB_STATUSES)[number];
