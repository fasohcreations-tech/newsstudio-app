/**
 * Absolute, locale-stable timestamp for SSR-safe first paint.
 */
export function formatAbsoluteTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

/**
 * Relative label. Prefer <RelativeTime /> in UI so SSR/client first paint match.
 */
export function formatRelativeTime(iso: string, nowMs: number = Date.now()): string {
  const date = new Date(iso);
  const diffMs = nowMs - date.getTime();
  const minutes = Math.round(diffMs / 60_000);

  if (Number.isNaN(date.getTime())) return "—";
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;

  return formatAbsoluteTime(iso);
}

export function slugifyTitle(title: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 80);

  return base || "story";
}

export function uniqueSlug(title: string): string {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${slugifyTitle(title)}-${suffix}`;
}

export function profileDisplayName(profile: {
  full_name: string | null;
  email: string;
} | null): string {
  if (!profile) return "Unassigned";
  return profile.full_name?.trim() || profile.email;
}
