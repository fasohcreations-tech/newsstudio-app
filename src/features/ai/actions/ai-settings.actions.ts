"use server";

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/features/auth/guards/require-auth";
import { createClient } from "@/shared/lib/supabase/server";
import { getCurrentProfile } from "@/features/profile/services/profile.service";
import { resolveActiveMembership } from "@/features/organization/services/resolve-active-membership";
import {
  aiOrgSettingsSchema,
  type AIOrgSettingsInput,
} from "@/features/ai/schemas/ai-settings.schemas";
import { saveAIOrgSettings } from "@/features/ai/services/ai-settings.service";

export type SaveAISettingsResult =
  | { success: true; data: AIOrgSettingsInput }
  | { success: false; error: string };

export async function saveAISettingsAction(
  input: unknown,
): Promise<SaveAISettingsResult> {
  const parsed = aiOrgSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }

  const user = await requireAuth("/settings/ai");
  const supabase = await createClient();
  const { profile } = await getCurrentProfile(supabase, user.id);
  const { membership, error: membershipError } = await resolveActiveMembership(
    supabase,
    user.id,
    profile?.email ?? user.email ?? "",
    profile?.full_name,
  );

  if (!membership) {
    return {
      success: false,
      error: membershipError ?? "Organization context required.",
    };
  }

  const result = await saveAIOrgSettings(
    supabase,
    membership.organization.id,
    parsed.data,
  );

  if (result.error) {
    console.error("[AISettings] save failed", result.error);
    return { success: false, error: result.error };
  }

  revalidatePath("/settings/ai");
  revalidatePath("/ai-center");
  return { success: true, data: result.settings };
}
