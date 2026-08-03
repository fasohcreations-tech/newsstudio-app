/**
 * Locate Master Templates used by Story Scene Builder.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { motionSceneDb } from "@/features/motion-scene-engine/lib/motion-scene-db";
import { getScenePackageCode } from "@/features/scene-composer/lib/gnn-package-utils";
import type { MotionScene } from "@/features/motion-scene-engine/types/motion-scene.types";

export const DEFAULT_MASTER_TEMPLATE_CODE = "GNN-001";

function isStoryInstanceMeta(meta: Record<string, unknown> | undefined): boolean {
  if (!meta) return false;
  return (
    meta.is_story_instance === true ||
    meta.binding_model === "story-panel-v1" ||
    (typeof meta.story_id === "string" && meta.story_id.length > 0)
  );
}

function pickMaster(
  rows: MotionScene[],
  packageCode: string,
): MotionScene | null {
  const templates = rows.filter(
    (scene) =>
      scene.is_template &&
      !isStoryInstanceMeta(scene.metadata as Record<string, unknown>),
  );

  const byCode =
    templates.find((scene) => getScenePackageCode(scene) === packageCode) ??
    null;
  if (byCode) return byCode;

  const byName =
    templates.find((scene) =>
      scene.name.toUpperCase().includes(packageCode.toUpperCase()),
    ) ?? null;
  if (byName) return byName;

  // Last resort: any live template named like the master (even if flag drifted).
  return (
    rows.find(
      (scene) =>
        !isStoryInstanceMeta(scene.metadata as Record<string, unknown>) &&
        (getScenePackageCode(scene) === packageCode ||
          scene.name.toUpperCase().includes(packageCode.toUpperCase())),
    ) ?? null
  );
}

export async function findMasterTemplateByCode(
  client: SupabaseClient,
  organizationId: string,
  packageCode: string = DEFAULT_MASTER_TEMPLATE_CODE,
): Promise<{ data: MotionScene | null; error: string | null }> {
  const db = motionSceneDb(client);
  const { data, error } = await db
    .from("creative_studio_motion_scenes")
    .select("*")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(120);

  if (error) {
    return { data: null, error: error.message };
  }

  const rows = (data ?? []) as unknown as MotionScene[];
  const match = pickMaster(rows, packageCode);

  if (!match) {
    return {
      data: null,
      error: `Master Template ${packageCode} was not found after seeding. Open Creative Studio → Scenes once, then rebuild.`,
    };
  }

  // Heal drifted masters so future lookups stay stable.
  if (!match.is_template || getScenePackageCode(match) !== packageCode) {
    await db
      .from("creative_studio_motion_scenes")
      .update({
        is_template: true,
        metadata: {
          ...(match.metadata ?? {}),
          package_code: packageCode,
        },
      })
      .eq("id", match.id);
    match.is_template = true;
    match.metadata = {
      ...(match.metadata ?? {}),
      package_code: packageCode,
    };
  }

  return { data: match, error: null };
}
