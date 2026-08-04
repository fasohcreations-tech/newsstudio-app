/**
 * Stable Media Library / Asset Clip references stored in Story fields / bindings.
 * Preview resolves `library://{assetId}` and `clip://{clipId}` to playback URLs.
 * Scene Builder prefers clip refs when present.
 */

import {
  CLIP_MEDIA_PREFIX,
  isClipMediaRef,
  parseClipMediaRef,
  toClipMediaRef,
} from "@/features/asset-clip-editor/lib/clip-media-reference";

export const LIBRARY_MEDIA_PREFIX = "library://";
export { CLIP_MEDIA_PREFIX, parseClipMediaRef, toClipMediaRef, isClipMediaRef };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function toLibraryMediaRef(assetId: string): string {
  return `${LIBRARY_MEDIA_PREFIX}${assetId}`;
}

export function parseLibraryMediaRef(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith(LIBRARY_MEDIA_PREFIX)) return null;
  const id = trimmed.slice(LIBRARY_MEDIA_PREFIX.length).trim();
  return UUID_RE.test(id) ? id : null;
}

export function isLibraryMediaRef(value: string | null | undefined): boolean {
  if (!value) return false;
  return parseLibraryMediaRef(value) !== null;
}

export function collectLibraryAssetIdsFromValue(value: string): string[] {
  return value
    .split(",")
    .map((part) => parseLibraryMediaRef(part.trim()))
    .filter((id): id is string => Boolean(id));
}

export function collectClipIdsFromValue(value: string): string[] {
  return value
    .split(",")
    .map((part) => parseClipMediaRef(part.trim()))
    .filter((id): id is string => Boolean(id));
}

export function collectLibraryAssetIds(
  bindings: Record<string, string>,
): string[] {
  const ids = new Set<string>();
  for (const value of Object.values(bindings)) {
    if (!value) continue;
    for (const id of collectLibraryAssetIdsFromValue(value)) {
      ids.add(id);
    }
  }
  return [...ids];
}

export function collectClipIds(bindings: Record<string, string>): string[] {
  const ids = new Set<string>();
  for (const value of Object.values(bindings)) {
    if (!value) continue;
    for (const id of collectClipIdsFromValue(value)) {
      ids.add(id);
    }
  }
  return [...ids];
}

export function resolveLibraryRefsInBindings(
  bindings: Record<string, string>,
  urlByAssetId: Record<string, string>,
  urlByClipId: Record<string, string> = {},
): Record<string, string> {
  const resolved: Record<string, string> = { ...bindings };

  for (const [key, value] of Object.entries(resolved)) {
    if (
      !value ||
      (!value.includes(LIBRARY_MEDIA_PREFIX) &&
        !value.includes(CLIP_MEDIA_PREFIX))
    ) {
      continue;
    }

    resolved[key] = value
      .split(",")
      .map((part) => {
        const trimmed = part.trim();
        const clipId = parseClipMediaRef(trimmed);
        if (clipId && urlByClipId[clipId]) return urlByClipId[clipId];
        const assetId = parseLibraryMediaRef(trimmed);
        if (assetId && urlByAssetId[assetId]) return urlByAssetId[assetId];
        return trimmed;
      })
      .join(",");
  }

  return resolved;
}

/**
 * Prefer clip ref when both exist (Story Panel / Scene Builder rule).
 */
export function preferPanelMediaRef(input: {
  originalRef?: string | null;
  clipRef?: string | null;
}): string {
  const clip = input.clipRef?.trim();
  if (clip && parseClipMediaRef(clip)) return clip;
  return (input.originalRef ?? "").trim();
}
