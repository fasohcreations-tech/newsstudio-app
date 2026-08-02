"use server";

import { requireAuth } from "@/features/auth/guards/require-auth";
import { createClient } from "@/shared/lib/supabase/server";
import { getCurrentProfile } from "@/features/profile/services/profile.service";
import { resolveActiveMembership } from "@/features/organization/services/resolve-active-membership";
import { checkAllProvidersHealth } from "@/features/ai/services/ai-orchestrator";
import type { ProviderHealth } from "@/features/ai/types/ai";

export async function refreshProviderHealthAction(): Promise<{
  health: ProviderHealth[];
  error: string | null;
}> {
  const user = await requireAuth("/ai-center");
  const supabase = await createClient();
  const { profile } = await getCurrentProfile(supabase, user.id);
  const { membership, error } = await resolveActiveMembership(
    supabase,
    user.id,
    profile?.email ?? user.email ?? "",
    profile?.full_name,
  );

  if (!membership) {
    return { health: [], error: error ?? "Organization context required." };
  }

  try {
    const health = await checkAllProvidersHealth(
      supabase,
      membership.organization.id,
    );
    return { health, error: null };
  } catch (err) {
    console.error("[AIOrchestrator] health refresh failed", err);
    return {
      health: [],
      error: err instanceof Error ? err.message : "Health check failed",
    };
  }
}
