/**
 * Stable Asset Clip references for Story fields / bindings.
 * Scene Builder prefers `clip://{clipId}` over parent `library://` assets.
 */

export const CLIP_MEDIA_PREFIX = "clip://";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function toClipMediaRef(clipId: string): string {
  return `${CLIP_MEDIA_PREFIX}${clipId}`;
}

export function parseClipMediaRef(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith(CLIP_MEDIA_PREFIX)) return null;
  const id = trimmed.slice(CLIP_MEDIA_PREFIX.length).trim();
  return UUID_RE.test(id) ? id : null;
}

export function isClipMediaRef(value: string | null | undefined): boolean {
  if (!value) return false;
  return parseClipMediaRef(value) !== null;
}
