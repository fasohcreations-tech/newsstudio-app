import { env } from "@/shared/lib/env";

/**
 * Canonical application origin used for Supabase Auth redirects.
 * Prefer NEXT_PUBLIC_APP_URL so email links always return to the correct port.
 */
export function getAppUrl(): string {
  return env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
}

/**
 * Only allow same-origin relative paths for post-auth redirects.
 */
export function safeAuthNextPath(
  next: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return fallback;
  }

  if (next.includes("://") || next.includes("\\")) {
    return fallback;
  }

  return next;
}
