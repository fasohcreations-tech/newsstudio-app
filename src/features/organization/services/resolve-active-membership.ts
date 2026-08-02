import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/shared/types/database.types";
import type { OrganizationMembership } from "@/features/organization/types/organization.types";
import { getUserMemberships } from "@/features/organization/services/organization.service";

type Client = SupabaseClient<Database>;

function slugifyOrgName(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "organization"
  );
}

/**
 * Returns the active membership (first) or provisions a personal organization
 * via SECURITY DEFINER RPC (avoids organizations SELECT RLS chicken-and-egg).
 */
export async function resolveActiveMembership(
  client: Client,
  userId: string,
  email: string,
  fullName?: string | null,
): Promise<{ membership: OrganizationMembership | null; error: string | null }> {
  const existing = await getUserMemberships(client, userId);

  if (existing.error) {
    return { membership: null, error: existing.error };
  }

  if (existing.memberships[0]) {
    return { membership: existing.memberships[0], error: null };
  }

  const display = fullName?.trim() || email.split("@")[0] || "Newsroom";
  const orgName = `${display}'s Newsroom`;
  const orgSlug = `${slugifyOrgName(display)}-${Math.random().toString(36).slice(2, 7)}`;

  const { error: bootstrapError } = await client.rpc(
    "bootstrap_personal_organization",
    {
      org_name: orgName,
      org_slug: orgSlug,
    },
  );

  if (bootstrapError) {
    return {
      membership: null,
      error: bootstrapError.message,
    };
  }

  const provisioned = await getUserMemberships(client, userId);

  if (provisioned.error || !provisioned.memberships[0]) {
    return {
      membership: null,
      error:
        provisioned.error ??
        "Organization was created but membership could not be loaded.",
    };
  }

  return { membership: provisioned.memberships[0], error: null };
}
