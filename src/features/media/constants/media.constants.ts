import type { MediaFileType, MediaStorageScope } from "@/shared/types/database.types";

export const MEDIA_FILE_TYPES = [
  "image",
  "video",
  "audio",
  "pdf",
  "document",
  "text",
  "other",
] as const satisfies readonly MediaFileType[];

export const MEDIA_FILE_TYPE_LABELS: Record<MediaFileType, string> = {
  image: "Images",
  video: "Videos",
  audio: "Audio",
  pdf: "PDF",
  document: "Word / Documents",
  text: "Text",
  other: "Other",
};

export const MEDIA_STORAGE_SCOPES = [
  "organizations",
  "stories",
  "shared",
  "templates",
  "branding",
  "temporary",
] as const satisfies readonly MediaStorageScope[];

export const DEFAULT_MEDIA_BUCKET: MediaStorageScope = "organizations";

export const MEDIA_PAGE_SIZE = 48;

export const MEDIA_ACCEPT = [
  "image/*",
  "video/*",
  "audio/*",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/csv",
  "text/markdown",
].join(",");

export const MAX_UPLOAD_BYTES = 500 * 1024 * 1024;
