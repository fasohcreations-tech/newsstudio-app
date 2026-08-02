import { redirect } from "next/navigation";

import { createClient } from "@/shared/lib/supabase/server";
import { requireAuth } from "@/features/auth/guards/require-auth";

/**
 * Role guard foundation.
 * Verifies the current user holds one of the allowed role slugs
 * within the given organization. Expand as RBAC UI lands.
 */
export async function requireOrgRole(
  organizationId: string,
  allowedRoles: string[],
  fallbackPath = "/dashboard",
): Promise<{ userId: string; roleSlug: string }> {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data: roleSlug, error } = await supabase.rpc("get_user_org_role_slug", {
    org_id: organizationId,
  });

  if (error || !roleSlug || !allowedRoles.includes(roleSlug)) {
    redirect(fallbackPath);
  }

  return { userId: user.id, roleSlug };
}

/**
 * Permission guard foundation.
 * Checks a permission code against the user's org role grants.
 */
export async function requireOrgPermission(
  organizationId: string,
  permissionCode: string,
  fallbackPath = "/dashboard",
): Promise<{ userId: string }> {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data: allowed, error } = await supabase.rpc("has_org_permission", {
    org_id: organizationId,
    permission_code: permissionCode,
  });

  if (error || !allowed) {
    redirect(fallbackPath);
  }

  return { userId: user.id };
}
