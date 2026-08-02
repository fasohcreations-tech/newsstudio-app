import { redirect } from "next/navigation";

import { createClient } from "@/shared/lib/supabase/server";
import { DEFAULT_UNAUTHENTICATED_ROUTE } from "@/shared/config/constants";
import type { AuthUser } from "@/features/auth/types/auth.types";

/**
 * Server-side authentication guard.
 * Redirects unauthenticated users to the login page.
 */
export async function requireAuth(redirectTo?: string): Promise<AuthUser> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const params = redirectTo
      ? `?redirectTo=${encodeURIComponent(redirectTo)}`
      : "";
    redirect(`${DEFAULT_UNAUTHENTICATED_ROUTE}${params}`);
  }

  return user;
}

/**
 * Redirects authenticated users away from guest-only routes.
 */
export async function requireGuest(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }
}
