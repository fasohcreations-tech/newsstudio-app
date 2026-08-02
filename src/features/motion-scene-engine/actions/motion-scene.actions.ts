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
  if (!result.data) return { success: false, error: result.error };
  return { success: true, data: result.data };
}
