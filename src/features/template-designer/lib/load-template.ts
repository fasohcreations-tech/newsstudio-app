import { notFound } from "next/navigation";

import { requireAuth } from "@/features/auth/guards/require-auth";
import { getCurrentProfile } from "@/features/profile/services/profile.service";
import { resolveActiveMembership } from "@/features/organization/services/resolve-active-membership";
import { createTemplateDesignerService } from "@/features/template-designer/services/template-designer.service.impl";
import type { BroadcastTemplate } from "@/features/template-designer/types/template-designer.types";
import { createClient } from "@/shared/lib/supabase/server";

export async function requireTemplateContext(redirectTo: string) {
  const user = await requireAuth(redirectTo);
  const supabase = await createClient();
  const { profile } = await getCurrentProfile(supabase, user.id);
  const { membership, error } = await resolveActiveMembership(
    supabase,
    user.id,
    profile?.email ?? user.email ?? "",
    profile?.full_name,
  );
  return { user, supabase, membership, error, profile };
}

export async function loadTemplateOrNotFound(
  templateId: string,
): Promise<BroadcastTemplate> {
  const service = createTemplateDesignerService();
  const result = await service.getTemplate(templateId);
  if (!result.data) notFound();
  return result.data;
}
