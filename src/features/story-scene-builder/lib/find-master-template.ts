/**
 * Locate Master Templates used by Story Scene Builder.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { motionSceneDb } from "@/features/motion-scene-engine/lib/motion-scene-db";
import { getScenePackageCode } from "@/features/scene-composer/lib/gnn-package-utils";
import type { MotionScene } from "@/features/motion-scene-engine/types/motion-scene.types";

export const DEFAULT_MASTER_TEMPLATE_CODE = "GNN-001";

export type StoryMasterTemplateOption = {
  id: string;
  name: string;
  packageCode: string | null;
  description: string | null;
  durationMs: number;
  aspectFormat: string;
  sceneType: string;
  updatedAt: string;
};

function motionSceneToTemplateOption(scene: MotionScene): StoryMasterTemplateOption {
  return {
    id: scene.id,
    name: scene.name,
    packageCode: getScenePackageCode(scene),
    description: scene.description ?? null,
    durationMs: scene.duration_ms,
    aspectFormat: scene.aspect_format,
    sceneType: scene.scene_type,
    updatedAt: scene.updated_at,
  };
}

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

/** List library master templates available for story scene linking. */
export async function listMasterTemplatesForOrg(
  client: SupabaseClient,
  organizationId: string,
  includeIds: string[] = [],
): Promise<{ data: StoryMasterTemplateOption[]; error: string | null }> {
  const db = motionSceneDb(client);
  const { data, error } = await db
    .from("creative_studio_motion_scenes")
    .select(
      "id, name, description, duration_ms, aspect_format, scene_type, metadata, is_template, updated_at",
    )
    .eq("organization_id", organizationId)
    .eq("is_template", true)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(120);

  if (error) {
    return { data: [], error: error.message };
  }

  const rows = (data ?? []) as unknown as MotionScene[];
  const masters = rows.filter(
    (scene) => !isStoryInstanceMeta(scene.metadata as Record<string, unknown>),
  );

  const missingIds = includeIds
    .map((id) => id.trim())
    .filter(Boolean)
    .filter((id, index, all) => all.indexOf(id) === index)
    .filter((id) => !masters.some((scene) => scene.id === id));

  if (missingIds.length > 0) {
    const { data: extraRows, error: extraError } = await db
      .from("creative_studio_motion_scenes")
      .select(
        "id, name, description, duration_ms, aspect_format, scene_type, metadata, is_template, updated_at",
      )
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .in("id", missingIds);

    if (extraError) {
      return { data: [], error: extraError.message };
    }

    const extras = (extraRows ?? []) as unknown as MotionScene[];
    for (const scene of extras) {
      if (isStoryInstanceMeta(scene.metadata as Record<string, unknown>)) continue;
      if (masters.some((existing) => existing.id === scene.id)) continue;
      masters.push(scene);
    }
  }

  return {
    data: masters.map((scene) => motionSceneToTemplateOption(scene)),
    error: null,
  };
}

export async function findMasterTemplateById(
  client: SupabaseClient,
  organizationId: string,
  templateId: string,
): Promise<{ data: MotionScene | null; error: string | null }> {
  const db = motionSceneDb(client);
  const { data, error } = await db
    .from("creative_studio_motion_scenes")
    .select("*")
    .eq("id", templateId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }
  if (!data) {
    return { data: null, error: "Template not found in the library" };
  }

  const scene = data as unknown as MotionScene;
  if (isStoryInstanceMeta(scene.metadata as Record<string, unknown>)) {
    return {
      data: null,
      error: "That scene is a story instance — pick a Master Template from the library",
    };
  }

  if (!scene.is_template) {
    await db
      .from("creative_studio_motion_scenes")
      .update({ is_template: true })
      .eq("id", scene.id);
    scene.is_template = true;
  }

  return { data: scene, error: null };
}
