"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAuth } from "@/features/auth/guards/require-auth";
import { createClient } from "@/shared/lib/supabase/server";
import { getCurrentProfile } from "@/features/profile/services/profile.service";
import { resolveActiveMembership } from "@/features/organization/services/resolve-active-membership";
import { createSceneComposerService } from "@/features/scene-composer/services/scene-composer.service.impl";
import { DEFAULT_MASTER_TEMPLATE_CODE } from "@/features/story-scene-builder/lib/find-master-template";
import {
  buildStoryScenePackage,
  getStoryPackageByStoryId,
  listStoryPackagesForOrg,
  relinkStorySceneInstanceTemplate,
  syncStoryPackageFromPanels,
  syncStorySceneInstanceFromPanels,
} from "@/features/story-scene-builder/services/story-package.service";
import {
  listMasterTemplatesForOrg,
  type StoryMasterTemplateOption,
} from "@/features/story-scene-builder/lib/find-master-template";
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
  masterTemplateId: z.string().uuid().optional(),
});

const relinkSchema = z.object({
  sceneInstanceId: z.string().uuid(),
  masterTemplateId: z.string().uuid(),
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
    masterTemplateId: parsed.data.masterTemplateId,
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

export async function listStoryMasterTemplatesAction(
  storyId: string,
): Promise<StorySceneBuilderActionResult<StoryMasterTemplateOption[]>> {
  const ctx = await requireStoryContext(storyId);
  if (!ctx.membership) {
    return { success: false, error: ctx.error ?? "Unauthorized" };
  }

  const composer = createSceneComposerService(ctx.supabase);
  await composer.ensureDefaults(
    ctx.membership.organization.id,
    ctx.user.id,
  );

  const bundle = await getStoryPackageByStoryId(ctx.supabase, storyId);
  const includeIds = bundle.data
    ? [
        bundle.data.package.master_template_id ?? "",
        ...bundle.data.scenes.map((scene) => scene.master_template_id ?? ""),
      ].filter(Boolean)
    : [];

  const result = await listMasterTemplatesForOrg(
    ctx.supabase,
    ctx.membership.organization.id,
    includeIds,
  );
  if (result.error) {
    return { success: false, error: result.error };
  }
  return { success: true, data: result.data };
}

export async function relinkStorySceneInstanceTemplateAction(
  raw: z.infer<typeof relinkSchema>,
): Promise<
  StorySceneBuilderActionResult<{
    sceneInstanceId: string;
    sceneId: string;
    masterTemplateId: string;
  }>
> {
  const parsed = relinkSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const supabase = await createClient();
  const { data: instanceRow, error: instanceError } = await supabase
    .from("story_scene_instances")
    .select("story_id")
    .eq("id", parsed.data.sceneInstanceId)
    .is("deleted_at", null)
    .maybeSingle();

  if (instanceError || !instanceRow?.story_id) {
    return { success: false, error: "Scene instance not found" };
  }

  const ctx = await requireStoryContext(instanceRow.story_id);
  if (!ctx.membership) {
    return { success: false, error: ctx.error ?? "Unauthorized" };
  }

  const result = await relinkStorySceneInstanceTemplate(ctx.supabase, {
    sceneInstanceId: parsed.data.sceneInstanceId,
    masterTemplateId: parsed.data.masterTemplateId,
    userId: ctx.user.id,
  });

  if (!result.data) {
    return { success: false, error: result.error ?? "Relink failed" };
  }

  revalidatePath(`/newsroom/stories/${instanceRow.story_id}`);
  revalidatePath("/creative-studio/scenes");
  revalidatePath(`/creative-studio/scenes/${result.data.sceneId}`);

  return {
    success: true,
    data: {
      sceneInstanceId: parsed.data.sceneInstanceId,
      sceneId: result.data.sceneId,
      masterTemplateId: parsed.data.masterTemplateId,
    },
  };
}
