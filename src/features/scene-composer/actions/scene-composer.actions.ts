"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAuth } from "@/features/auth/guards/require-auth";
import { resolveActiveMembership } from "@/features/organization/services/resolve-active-membership";
import { getCurrentProfile } from "@/features/profile/services/profile.service";
import { ensureMotionSceneDefaultsAction } from "@/features/motion-scene-engine/actions/motion-scene.actions";
import { WORKFLOW_STATES } from "@/features/scene-composer/constants/scene-composer.constants";
import { createSceneComposerService } from "@/features/scene-composer/services/scene-composer.service.impl";
import type {
  ComposerScene,
  ComposerSceneDocument,
  ComposerSettings,
  SceneComponent,
  SceneWorkflowState,
} from "@/features/scene-composer/types/scene-composer.types";
import { createClient } from "@/shared/lib/supabase/server";

export type ComposerActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

async function requireComposerContext() {
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

export async function ensureComposerDefaultsAction(): Promise<
  ComposerActionResult<{ ready: true }>
> {
  const { supabase, membership, user, error } = await requireComposerContext();
  if (!membership) {
    return { success: false, error: error ?? "Organization required" };
  }

  await ensureMotionSceneDefaultsAction();
  const service = createSceneComposerService(supabase);
  const result = await service.ensureDefaults(
    membership.organization.id,
    user.id,
  );
  if (!result.data) {
    return { success: false, error: result.error ?? "Defaults failed" };
  }
  return { success: true, data: { ready: true } };
}

const saveSchema = z.object({
  sceneId: z.string().uuid(),
  name: z.string().optional(),
  duration_ms: z.number().optional(),
  frame_rate: z.number().optional(),
  workflow_state: z.enum(WORKFLOW_STATES).optional(),
  composer_settings: z.record(z.string(), z.unknown()).optional(),
  composer_document: z.record(z.string(), z.unknown()),
  resolved_bindings: z.record(z.string(), z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  /** When false, skip Next revalidation (autosave). Default true for explicit saves. */
  revalidate: z.boolean().optional(),
  /** When true, upsert normalized object/binding/keyframe tables (checkpoint only). */
  syncTables: z.boolean().optional(),
});

export async function saveComposerSceneAction(
  raw: z.infer<typeof saveSchema>,
): Promise<ComposerActionResult<ComposerScene>> {
  const parsed = saveSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { supabase, membership, user, error } = await requireComposerContext();
  if (!membership) {
    return { success: false, error: error ?? "Organization required" };
  }

  const service = createSceneComposerService(supabase);
  const result = await service.saveComposerScene(
    parsed.data.sceneId,
    {
      name: parsed.data.name,
      duration_ms: parsed.data.duration_ms,
      frame_rate: parsed.data.frame_rate,
      workflow_state: parsed.data.workflow_state as SceneWorkflowState | undefined,
      composer_settings: parsed.data.composer_settings as ComposerSettings | undefined,
      composer_document: parsed.data.composer_document as ComposerSceneDocument,
      resolved_bindings: parsed.data.resolved_bindings,
      metadata: parsed.data.metadata,
    },
    user.id,
    {
      // Autosave writes scene_document only; checkpoint syncs relational tables.
      syncTables: parsed.data.syncTables === true,
    },
  );

  if (!result.data) return { success: false, error: result.error };

  // Autosave must not revalidate — that refreshes server props, re-seeds the
  // client document, and schedules another autosave (infinite update loop).
  if (parsed.data.revalidate !== false) {
    revalidatePath(`/creative-studio/scenes/${parsed.data.sceneId}`);
    revalidatePath("/creative-studio/scenes");
  }

  return { success: true, data: result.data };
}

export async function exportComposerSceneAction(
  sceneId: string,
): Promise<ComposerActionResult<Record<string, unknown>>> {
  const { supabase, membership, error } = await requireComposerContext();
  if (!membership) {
    return { success: false, error: error ?? "Organization required" };
  }

  const service = createSceneComposerService(supabase);
  const result = await service.exportScene(sceneId);
  if (!result.data) return { success: false, error: result.error };
  return { success: true, data: result.data };
}

export async function getComposerSceneAction(
  sceneId: string,
): Promise<ComposerActionResult<ComposerScene>> {
  const { supabase, membership, error } = await requireComposerContext();
  if (!membership) {
    return { success: false, error: error ?? "Organization required" };
  }

  const service = createSceneComposerService(supabase);
  const result = await service.getComposerScene(sceneId);
  if (!result.data) return { success: false, error: result.error };
  return { success: true, data: result.data };
}

export async function listComposerComponentsAction(): Promise<
  ComposerActionResult<SceneComponent[]>
> {
  const { supabase, membership, error } = await requireComposerContext();
  if (!membership) {
    return { success: false, error: error ?? "Organization required" };
  }

  // Defaults are seeded on the scenes library page — do not re-seed on every list.
  const service = createSceneComposerService(supabase);
  const result = await service.listComponents(membership.organization.id);
  if (!result.data) return { success: false, error: result.error };
  return { success: true, data: result.data };
}
