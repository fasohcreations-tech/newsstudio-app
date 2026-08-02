/**
 * News Intake Center enums & catalog codes (Feature 006).
 */

export const INTAKE_SOURCE_CODES = [
  "manual_story",
  "url_import",
  "rss_feed",
  "pdf",
  "docx",
  "txt",
  "image_upload",
  "audio_upload",
  "youtube_url",
  "facebook_url",
  "x_url",
  "telegram_url",
] as const;

export type IntakeSourceCode = (typeof INTAKE_SOURCE_CODES)[number];

export const INTAKE_SOURCE_CATEGORIES = [
  "manual",
  "url",
  "feed",
  "document",
  "media",
  "social",
] as const;

export type IntakeSourceCategory = (typeof INTAKE_SOURCE_CATEGORIES)[number];

export const INTAKE_EXTRACTION_STATUSES = [
  "pending",
  "validating",
  "extracting",
  "metadata_ready",
  "story_created",
  "failed",
  "cancelled",
] as const;

export type IntakeExtractionStatus = (typeof INTAKE_EXTRACTION_STATUSES)[number];

export const INTAKE_EXTRACTION_STATUS_LABELS: Record<
  IntakeExtractionStatus,
  string
> = {
  pending: "Pending",
  validating: "Validating",
  extracting: "Extracting",
  metadata_ready: "Metadata ready",
  story_created: "Story created",
  failed: "Failed",
  cancelled: "Cancelled",
};

export const INTAKE_SOURCE_LABELS: Record<IntakeSourceCode, string> = {
  manual_story: "Manual Story",
  url_import: "URL Import",
  rss_feed: "RSS Feed",
  pdf: "PDF",
  docx: "DOCX",
  txt: "TXT",
  image_upload: "Image Upload",
  audio_upload: "Audio Upload",
  youtube_url: "YouTube URL",
  facebook_url: "Facebook URL",
  x_url: "X URL",
  telegram_url: "Telegram URL",
};
