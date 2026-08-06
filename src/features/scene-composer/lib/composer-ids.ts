const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PREFIXED_UUID_RE =
  /^[a-z][a-z0-9_-]*-([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;

/** New composer object / binding ids — valid for Postgres UUID columns. */
export function createComposerId(): string {
  return crypto.randomUUID();
}

/**
 * Normalize composer ids (`layer-…`, `obj-…`, `bind-…`) to bare UUIDs for
 * relational table sync. Returns null when the value cannot be normalized.
 */
export function toComposerUuid(
  id: string | null | undefined,
): string | null {
  if (!id) return null;
  const trimmed = id.trim();
  if (!trimmed) return null;
  if (UUID_RE.test(trimmed)) return trimmed;
  const match = trimmed.match(PREFIXED_UUID_RE);
  return match?.[1] ?? null;
}

export function requireComposerUuid(
  id: string,
  label = "id",
): string {
  const normalized = toComposerUuid(id);
  if (!normalized) {
    throw new Error(
      `Invalid composer ${label}: "${id}" is not a UUID or prefixed UUID`,
    );
  }
  return normalized;
}
