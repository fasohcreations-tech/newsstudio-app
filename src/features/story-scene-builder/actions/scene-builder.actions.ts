"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAuth } from "@/features/auth/guards/require-auth";
import { createClient } from "@/shared/lib/supabase/server";
import { getCurrentProfile } from "@/features/profile/services/profile.service";
import { resolveActiveMembership } from "@/features/organization/services/resolve-active-membership";
import { DEFAULT_MASTER_TEMPLATE_CODE } from "@/features/story-scene-builder/lib/find-master-template";
import {
  buildStoryScenePackage,
  getStoryPackageByStoryId,
  listStoryPackagesForOrg,
  syncStoryPackageFromPanels,
  syncStorySceneInstanceFromPanels,
} from "@/features/story-scene-builder/services/story-package.service";
import type {
  BuildStoryScenesResult,
  StoryPackageBundle,
  StoryPackageRow,
} from "@/features/story-scene-builder/types/scene-builder.types";

export type StorySceneBuilderActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

async function requireStoryContext(storyId: string) {
  const user = await requireAuth(`/newsroom/stories/${storyId}`);
  const supabase = await createClient();
  const { profile } = await getCurrentProfile(supabase, user.id);
  const { membership, error } = await resolveActiveMembership(
    supabase,
    user.id,
    profile?.email ?? user.email ?? "",
    profile?.full_name,
  );

  if (!membership) {
    return {
      user,
      supabase,
      membership: null as null,
      error: error ?? "Organization required",
    };
  }

  const { data: story, error: storyError } = await supabase
    .from("stories")
    .select("id, organization_id")
    .eq("id", storyId)
    .is("deleted_at", null)
    .maybeSingle();

  if (storyError || !story) {
    return {
      user,
      supabase,
      membership: null as null,
      error: storyError?.message ?? "Story not found",
    };
  }

  if (story.organization_id !== membership.organization.id) {
    return {
      user,
      supabase,
      membership: null as null,
      error: "Story belongs to another organization",
    };
  }

  return { user, supabase, membership, error: null as string | null };
}

const buildSchema = z.object({
  storyId: z.string().uuid(),
  masterTemplateCode: z.string().trim().min(1).max(40).optional(),
});

export async function buildStoryScenesAction(
  raw: z.infer<typeof buildSchema>,
): Promise<StorySceneBuilderActionResult<BuildStoryScenesResult>> {
  const parsed = buildSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const ctx = await requireStoryContext(parsed.data.storyId);
  if (!ctx.membership) {
    return { success: false, error: ctx.error ?? "Unauthorized" };
  }

  const result = await buildStoryScenePackage(ctx.supabase, {
    storyId: parsed.data.storyId,
    userId: ctx.user.id,
    masterTemplateCode:
      parsed.data.masterTemplateCode ?? DEFAULT_MASTER_TEMPLATE_CODE,
  });

  if (!result.data) {
    return { success: false, error: result.error ?? "Build failed" };
  }

  revalidatePath(`/newsroom/stories/${parsed.data.storyId}`);
  revalidatePath("/creative-studio/scenes");
  return { success: true, data: result.data };
}

export async function syncStoryScenesFromPanelsAction(
  storyId: string,
): Promise<
  StorySceneBuilderActionResult<{ updatedCount: number; sceneIds: string[] }>
> {
  const ctx = await requireStoryContext(storyId);
  if (!ctx.membership) {
    return { success: false, error: ctx.error ?? "Unauthorized" };
  }

  const result = await syncStoryPackageFromPanels(ctx.supabase, {
    storyId,
    userId: ctx.user.id,
  });

  if (!result.data) {
    return { success: false, error: result.error ?? "Sync failed" };
  }

  revalidatePath(`/newsroom/stories/${storyId}`);
  revalidatePath("/creative-studio/scenes");
  for (const sceneId of result.data.updatedSceneIds) {
    revalidatePath(`/creative-studio/scenes/${sceneId}`);
  }

  return {
    success: true,
    data: {
      updatedCount: result.data.updatedSceneIds.length,
      sceneIds: result.data.updatedSceneIds,
    },
  };
}

export async function syncStorySceneInstanceAction(
  sceneId: string,
): Promise<StorySceneBuilderActionResult<{ sceneId: string }>> {
  const user = await requireAuth(`/creative-studio/scenes/${sceneId}`);
  const supabase = await createClient();
  const { profile } = await getCurrentProfile(supabase, user.id);
  const { membership, error } = await resolveActiveMembership(
    supabase,
    user.id,
    profile?.email ?? user.email ?? "",
    profile?.full_name,
  );

  if (!membership) {
    return { success: false, error: error ?? "Organization required" };
  }

  const result = await syncStorySceneInstanceFromPanels(supabase, {
    sceneId,
    userId: user.id,
  });

  if (!result.data) {
    return { success: false, error: result.error ?? "Sync failed" };
  }

  revalidatePath(`/creative-studio/scenes/${sceneId}`);
  return { success: true, data: result.data };
}

export async function getStoryPackageAction(
  storyId: string,
): Promise<StorySceneBuilderActionResult<StoryPackageBundle | null>> {
  const ctx = await requireStoryContext(storyId);
  if (!ctx.membership) {
    return { success: false, error: ctx.error ?? "Unauthorized" };
  }

  const result = await getStoryPackageByStoryId(ctx.supabase, storyId);
  if (result.error) {
    return { success: false, error: result.error };
  }
  return { success: true, data: result.data };
}

export async function listOrgStoryPackagesAction(): Promise<
  StorySceneBuilderActionResult<StoryPackageRow[]>
> {
  const user = await requireAuth("/creative-studio/scenes");
  const supabase = await createClient();
  const { profile } = await getCurrentProfile(supabase, user.id);
  const { membership, error } = await resolveActiveMembership(
    supabase,
    user.id,
    profile?.email ?? user.email ?? "",
    profile?.full_name,
  );

  if (!membership) {
    return { success: false, error: error ?? "Organization required" };
  }

  const result = await listStoryPackagesForOrg(
    supabase,
    membership.organization.id,
  );
  if (result.error) {
    return { success: false, error: result.error };
  }
  return { success: true, data: result.data ?? [] };
}
