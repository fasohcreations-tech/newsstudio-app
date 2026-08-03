/**
 * Master Template immutability helpers.
 * Published / archived templates cannot have document fields edited.
 */

export type MasterTemplateGuardRow = {
  id: string;
  name?: string | null;
  is_template?: boolean | null;
  is_published?: boolean | null;
  workflow_state?: string | null;
  deleted_at?: string | null;
};

const ALLOWED_WHILE_LOCKED = new Set([
  "workflow_state",
  "is_favorite",
  "is_published",
  "deleted_at",
  "updated_by",
  "updated_at",
]);

export function isLockedMasterTemplate(
  row: MasterTemplateGuardRow | null | undefined,
): boolean {
  if (!row || row.deleted_at) return false;
  if (!row.is_template) return false;
  if (row.is_published) return true;
  const state = (row.workflow_state ?? "").toLowerCase();
  return state === "published" || state === "archived";
}

export function masterTemplateLockMessage(row?: MasterTemplateGuardRow | null): string {
  const label = row?.name?.trim() || "Master Template";
  return `${label} is a published Master Template and cannot be edited. Duplicate or version it instead.`;
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a === "object") {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Returns an error message when a patch would mutate a locked master.
 * Allowed: workflow archive/publish, favorite toggle, soft-delete.
 * When `baseline` is provided, keys whose values are unchanged are ignored
 * (so composer saves that re-send the same document can still change workflow).
 */
export function assertMasterTemplatePatchAllowed(
  row: MasterTemplateGuardRow | null | undefined,
  patch: Record<string, unknown>,
  baseline?: Record<string, unknown> | null,
): string | null {
  if (!isLockedMasterTemplate(row)) return null;

  const changedKeys = Object.keys(patch).filter((key) => {
    if (patch[key] === undefined) return false;
    if (!baseline) return true;
    return !valuesEqual(patch[key], baseline[key]);
  });

  if (changedKeys.length === 0) return null;

  // Soft-delete alone is always allowed.
  if (changedKeys.length === 1 && changedKeys[0] === "deleted_at") return null;

  const unsafe = changedKeys.filter((key) => !ALLOWED_WHILE_LOCKED.has(key));
  if (unsafe.length === 0) return null;

  return masterTemplateLockMessage(row);
}
