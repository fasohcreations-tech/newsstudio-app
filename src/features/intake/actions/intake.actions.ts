"use server";

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/features/auth/guards/require-auth";
import { createClient } from "@/shared/lib/supabase/server";
import { getCurrentProfile } from "@/features/profile/services/profile.service";
import { resolveActiveMembership } from "@/features/organization/services/resolve-active-membership";
import {
  createStoryFromSourceSchema,
  enqueueSourceSchema,
} from "@/features/intake/schemas/intake.schemas";
import {
  createStoryFromSourceItem,
  enqueueSourceItem,
} from "@/features/intake/services/intake.service";

export type IntakeActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

async function requireOrgContext(redirectTo: string) {
  const user = await requireAuth(redirectTo);
  const supabase = await createClient();
  const { profile } = await getCurrentProfile(supabase, user.id);
  const { membership, error } = await resolveActiveMembership(
    supabase,
    user.id,
    profile?.email ?? user.email ?? "",
    profile?.full_name,
  );
  return { user, supabase, membership, error };
}

export async function enqueueSourceAction(
  input: unknown,
): Promise<IntakeActionResult<{ id: string }>> {
  const parsed = enqueueSourceSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }

  const { user, supabase, membership, error } =
    await requireOrgContext("/intake");
  if (!membership) {
    return { success: false, error: error ?? "Organization required." };
  }

  const result = await enqueueSourceItem(supabase, {
    organizationId: membership.organization.id,
    userId: user.id,
    sourceTypeCode: parsed.data.sourceTypeCode,
    originalUrl: parsed.data.originalUrl || null,
    title: parsed.data.title || null,
  });

  if (result.error || !result.data) {
    return { success: false, error: result.error ?? "Enqueue failed." };
  }

  revalidatePath("/intake");
  return { success: true, data: { id: result.data.id } };
}

export async function createStoryFromSourceAction(
  input: unknown,
): Promise<IntakeActionResult<{ storyId: string }>> {
  const parsed = createStoryFromSourceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid source item." };
  }

  const { user, supabase, membership, error } =
    await requireOrgContext("/intake");
  if (!membership) {
    return { success: false, error: error ?? "Organization required." };
  }

  const result = await createStoryFromSourceItem(supabase, {
    sourceItemId: parsed.data.sourceItemId,
    userId: user.id,
  });

  if (result.error || !result.data) {
    return { success: false, error: result.error ?? "Could not create story." };
  }

  revalidatePath("/intake");
  revalidatePath("/newsroom");
  revalidatePath(`/newsroom/stories/${result.data.storyId}`);
  return { success: true, data: { storyId: result.data.storyId } };
}
