import type { MediaFileType } from "@/shared/types/database.types";
import { DEFAULT_MEDIA_BUCKET } from "@/features/media/constants/media.constants";

export function detectMediaFileType(mimeType: string, filename: string): MediaFileType {
  const lower = filename.toLowerCase();

  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType === "application/pdf" || lower.endsWith(".pdf")) return "pdf";
  if (
    mimeType.includes("word") ||
    lower.endsWith(".doc") ||
    lower.endsWith(".docx") ||
    mimeType === "application/msword"
  ) {
    return "document";
  }
  if (
    mimeType.startsWith("text/") ||
    lower.endsWith(".txt") ||
    lower.endsWith(".md") ||
    lower.endsWith(".csv")
  ) {
    return "text";
  }
  return "other";
}

export function sanitizeStorageFilename(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120) || "file";
}

export function buildOrganizationStoragePath(
  organizationId: string,
  folderId: string | null | undefined,
  filename: string,
): string {
  const safeName = sanitizeStorageFilename(filename);
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const folderSegment = folderId ?? "root";
  return `${organizationId}/${folderSegment}/${unique}-${safeName}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function defaultBucketForUpload() {
  return DEFAULT_MEDIA_BUCKET;
}

export async function readImageDimensions(
  file: File,
): Promise<{ width: number; height: number } | null> {
  if (!file.type.startsWith("image/")) return null;

  const objectUrl = URL.createObjectURL(file);
  try {
    const dimensions = await new Promise<{ width: number; height: number } | null>(
      (resolve) => {
        const image = new Image();
        image.onload = () =>
          resolve({ width: image.naturalWidth, height: image.naturalHeight });
        image.onerror = () => resolve(null);
        image.src = objectUrl;
      },
    );
    return dimensions;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function readMediaDuration(
  file: File,
): Promise<number | null> {
  if (!file.type.startsWith("video/") && !file.type.startsWith("audio/")) {
    return null;
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const duration = await new Promise<number | null>((resolve) => {
      const element = document.createElement(
        file.type.startsWith("video/") ? "video" : "audio",
      );
      element.preload = "metadata";
      element.onloadedmetadata = () => {
        resolve(
          Number.isFinite(element.duration) ? Number(element.duration.toFixed(3)) : null,
        );
      };
      element.onerror = () => resolve(null);
      element.src = objectUrl;
    });
    return duration;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
