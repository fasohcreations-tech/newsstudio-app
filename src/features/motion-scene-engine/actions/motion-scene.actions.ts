"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAuth } from "@/features/auth/guards/require-auth";
import { createClient } from "@/shared/lib/supabase/server";
import { getCurrentProfile } from "@/features/profile/services/profile.service";
import { resolveActiveMembership } from "@/features/organization/services/resolve-active-membership";
import { MOTION_SCENE_TYPES } from "@/features/motion-scene-engine/constants/motion-scene.constants";
import { motionSceneDb } from "@/features/motion-scene-engine/lib/motion-scene-db";
import { createMotionSceneService } from "@/features/motion-scene-engine/services/motion-scene.service.impl";
import type {
  MotionScene,
  MotionSceneWithRelations,
  SceneVersion,
} from "@/features/motion-scene-engine/types/motion-scene.types";

export type MotionSceneActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

async function requireMotionSceneContext() {
  const user = await requireAuth("/creative-studio/scenes");
  const supabase = await createClient();
  const { profile } = await getCurrentProfile(supabase, user.id);
  const { membership, error } = await resolveActiveMembership(
    supabase,
    user.id,
    profile?.email ?? user.email ?? "",
    profile?.full_name,
  );
  return { supabase, membership, user, error };
}

export async function ensureMotionSceneDefaultsAction(): Promise<
  MotionSceneActionResult<{ ready: true }>
> {
  const { supabase, membership, user, error } = await requireMotionSceneContext();
  if (!membership) {
    return { success: false, error: error ?? "Organization required" };
  }

  const db = motionSceneDb(supabase);
  const orgId = membership.organization.id;

  const { data: existingKit } = await db
    .from("creative_studio_brand_kits")
    .select("id")
    .eq("organization_id", orgId)
    .is("deleted_at", null)
    .eq("is_default", true)
    .maybeSingle();

  if (!existingKit) {
    await db.from("creative_studio_brand_kits").insert({
      organization_id: orgId,
      name: `${membership.organization.name} Brand Kit`,
      logo_url: membership.organization.logo_url ?? null,
      is_default: true,
      created_by: user.id,
      updated_by: user.id,
    } as Record<string, unknown>);
  }

  const service = createMotionSceneService(supabase);
  await service.ensureDefaults(orgId, user.id);

  return { success: true, data: { ready: true } };
}

const createSceneSchema = z.object({
  sceneType: z.enum(MOTION_SCENE_TYPES),
  name: z.string().trim().min(1).max(200),
  categoryId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
});

export async function createMotionSceneAction(
  raw: z.infer<typeof createSceneSchema>,
): Promise<MotionSceneActionResult<MotionSceneWithRelations>> {
  const parsed = createSceneSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { supabase, membership, user, error } = await requireMotionSceneContext();
  if (!membership) {
    return { success: false, error: error ?? "Organization required" };
  }

  await ensureMotionSceneDefaultsAction();

  const service = createMotionSceneService(supabase);
  const result = await service.createScene(
    membership.organization.id,
    user.id,
    parsed.data,
  );

  if (!result.data) return { success: false, error: result.error };
  revalidatePath("/creative-studio/scenes");
  return { success: true, data: result.data };
}

const updateSceneSchema = z.object({
  sceneId: z.string().uuid(),
  patch: z.record(z.string(), z.unknown()),
});

export async function updateMotionSceneAction(
  raw: z.infer<typeof updateSceneSchema>,
): Promise<MotionSceneActionResult<MotionSceneWithRelations>> {
  const parsed = updateSceneSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { supabase, membership, user, error } = await requireMotionSceneContext();
  if (!membership) {
    return { success: false, error: error ?? "Organization required" };
  }

  const service = createMotionSceneService(supabase);
  const result = await service.updateScene(
    parsed.data.sceneId,
    parsed.data.patch as Partial<MotionScene>,
    user.id,
  );

  if (!result.data) return { success: false, error: result.error };
  revalidatePath("/creative-studio/scenes");
  revalidatePath(`/creative-studio/scenes/${parsed.data.sceneId}`);
  return { success: true, data: result.data };
}

export async function duplicateMotionSceneAction(
  sceneId: string,
): Promise<MotionSceneActionResult<MotionSceneWithRelations>> {
  const { supabase, membership, user, error } = await requireMotionSceneContext();
  if (!membership) {
    return { success: false, error: error ?? "Organization required" };
  }

  const service = createMotionSceneService(supabase);
  const result = await service.duplicateScene(sceneId, user.id);
  if (!result.data) return { success: false, error: result.error };
  revalidatePath("/creative-studio/scenes");
  return { success: true, data: result.data };
}

export async function placeMotionSceneOnTimelineAction(raw: {
  sceneId: string;
  projectId: string;
  trackId: string;
  startMs: number;
}): Promise<MotionSceneActionResult<MotionSceneWithRelations>> {
  const { supabase, membership, user, error } = await requireMotionSceneContext();
  if (!membership) {
    return { success: false, error: error ?? "Organization required" };
  }

  const service = createMotionSceneService(supabase);
  const result = await service.placeOnTimeline(
    {
      sceneId: raw.sceneId,
      projectId: raw.projectId,
      trackId: raw.trackId,
      startMs: raw.startMs,
    },
    user.id,
  );

  if (!result.data) return { success: false, error: result.error };
  revalidatePath(`/creative-studio/projects/${raw.projectId}`);
  return { success: true, data: result.data };
}

export async function listMotionScenesAction(): Promise<
  MotionSceneActionResult<MotionScene[]>
> {
  const { supabase, membership, error } = await requireMotionSceneContext();
  if (!membership) {
    return { success: false, error: error ?? "Organization required" };
  }

  await ensureMotionSceneDefaultsAction();
  const service = createMotionSceneService(supabase);
  const result = await service.listScenes(membership.organization.id);
  if (!result.data) return { success: false, error: result.error ?? "List failed" };
  return { success: true, data: result.data };
}

const sceneVersionSchema = z.object({
  sceneId: z.string().uuid(),
  label: z.string().trim().max(200).optional(),
});

/** Snapshot current scene into history. Live scene name stays unchanged. */
export async function saveMotionSceneVersionAction(
  raw: z.infer<typeof sceneVersionSchema>,
): Promise<MotionSceneActionResult<MotionSceneWithRelations>> {
  const parsed = sceneVersionSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { supabase, membership, user, error } = await requireMotionSceneContext();
  if (!membership) {
    return { success: false, error: error ?? "Organization required" };
  }

  const service = createMotionSceneService(supabase);
  const result = await service.createVersion(
    parsed.data.sceneId,
    user.id,
    { label: parsed.data.label },
  );
  if (!result.data) return { success: false, error: result.error };
  revalidatePath(`/creative-studio/scenes/${parsed.data.sceneId}`);
  revalidatePath("/creative-studio/scenes");
  return { success: true, data: result.data };
}

export async function listMotionSceneVersionsAction(
  sceneId: string,
): Promise<MotionSceneActionResult<SceneVersion[]>> {
  const parsed = z.string().uuid().safeParse(sceneId);
  if (!parsed.success) {
    return { success: false, error: "Invalid scene id" };
  }

  const { supabase, membership, error } = await requireMotionSceneContext();
  if (!membership) {
    return { success: false, error: error ?? "Organization required" };
  }

  const service = createMotionSceneService(supabase);
  const result = await service.listVersions(parsed.data);
  if (!result.data) return { success: false, error: result.error };
  return { success: true, data: result.data };
}

const restoreVersionSchema = z.object({
  sceneId: z.string().uuid(),
  versionId: z.string().uuid(),
});

/** Restore a history snapshot onto the same scene (same id + name). */
export async function restoreMotionSceneVersionAction(
  raw: z.infer<typeof restoreVersionSchema>,
): Promise<MotionSceneActionResult<MotionSceneWithRelations>> {
  const parsed = restoreVersionSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { supabase, membership, user, error } = await requireMotionSceneContext();
  if (!membership) {
    return { success: false, error: error ?? "Organization required" };
  }

  const service = createMotionSceneService(supabase);
  const result = await service.restoreVersion(
    parsed.data.sceneId,
    parsed.data.versionId,
    user.id,
  );
  if (!result.data) return { success: false, error: result.error };

  // Keep composer object tables in sync with restored document.
  const { createSceneComposerService, toComposerScene } = await import(
    "@/features/scene-composer/services/scene-composer.service.impl"
  );
  const composerService = createSceneComposerService(supabase);
  const composerScene = toComposerScene(result.data);
  const saved = await composerService.saveComposerScene(
    parsed.data.sceneId,
    {
      composer_document: composerScene.composer_document,
      composer_settings: composerScene.composer_settings,
      workflow_state: composerScene.workflow_state,
      frame_rate: composerScene.frame_rate,
      duration_ms: composerScene.duration_ms,
      resolved_bindings: composerScene.resolved_bindings,
      metadata: composerScene.metadata,
    },
    user.id,
    { syncTables: true },
  );
  if (!saved.data) {
    return { success: false, error: saved.error ?? "Restore sync failed" };
  }

  revalidatePath(`/creative-studio/scenes/${parsed.data.sceneId}`);
  revalidatePath("/creative-studio/scenes");
  return { success: true, data: result.data };
}
