import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/shared/types/database.types";
import type { OrganizationMembership } from "@/features/organization/types/organization.types";

type Client = SupabaseClient<Database>;

/**
 * Foundation service: load memberships for the authenticated user.
 * Management UI is intentionally deferred.
 */
export async function getUserMemberships(
  client: Client,
  userId: string,
): Promise<{ memberships: OrganizationMembership[]; error: string | null }> {
  const { data, error } = await client
    .from("organization_members")
    .select(
      `
      *,
      organization:organizations!inner(id, name, slug, logo_url),
      role:roles!inner(id, name, slug),
      default_workspace:workspaces(id, name, slug)
    `,
    )
    .eq("user_id", userId)
    .eq("status", "active")
    .is("deleted_at", null)
    .is("organization.deleted_at", null);

  if (error) {
    return { memberships: [], error: error.message };
  }

  return {
    memberships: (data ?? []) as unknown as OrganizationMembership[],
    error: null,
  };
}
