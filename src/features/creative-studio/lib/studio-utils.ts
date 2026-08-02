import type { CreativeClipKind, CreativeTrackKind } from "@/features/creative-studio/types/creative-studio.types";
import type { MediaFileType } from "@/shared/types/database.types";

export const MEDIA_BIN_DRAG_TYPE = "application/vnd.mediaos.media-bin+json";

export type MediaBinDragPayload = {
  assetId: string;
  name: string;
  clipKind: CreativeClipKind;
  category: string;
  durationMs?: number;
};

export function mediaFileTypeToClipKind(
  fileType: MediaFileType,
): CreativeClipKind {
  switch (fileType) {
    case "image":
      return "image";
    case "video":
      return "video";
    case "audio":
      return "audio";
    case "pdf":
    case "document":
    case "text":
      return "graphic";
    default:
      return "graphic";
  }
}

export function mediaFileTypeToBinCategory(fileType: MediaFileType): string {
  switch (fileType) {
    case "image":
      return "image";
    case "video":
      return "video";
    case "audio":
      return "audio";
    case "pdf":
    case "document":
    case "text":
      return "document";
    default:
      return "graphic";
  }
}

export function isClipCompatibleWithTrack(
  trackKind: CreativeTrackKind | string,
  clipKind: CreativeClipKind | string,
): boolean {
  switch (trackKind) {
    case "video":
      return clipKind === "image" || clipKind === "video" || clipKind === "graphic";
    case "image":
      return clipKind === "image" || clipKind === "graphic";
    case "graphics":
      return clipKind === "graphic" || clipKind === "image" || clipKind === "title";
    case "title":
      return clipKind === "title" || clipKind === "graphic" || clipKind === "subtitle";
    case "subtitle":
      return clipKind === "subtitle" || clipKind === "title";
    case "audio":
    case "voice":
      return clipKind === "audio" || clipKind === "voice";
    case "music":
      return clipKind === "audio" || clipKind === "music";
    case "sfx":
      return clipKind === "audio" || clipKind === "sfx";
    case "marker":
      return clipKind === "marker";
    case "ai_suggestion":
      return clipKind === "ai_suggestion" || clipKind === "graphic";
    default:
      return false;
  }
}

export function snapMs(ms: number, enabled: boolean, frameRate: number): number {
  if (!enabled) return Math.max(0, ms);
  const frameMs = 1000 / frameRate;
  return Math.max(0, Math.round(ms / frameMs) * frameMs);
}

export const DEFAULT_CLIP_DURATION_MS = 5000;
export const MIN_CLIP_DURATION_MS = 250;
