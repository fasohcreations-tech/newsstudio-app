/**
 * Instantiate an editable Scene clone from an immutable Master Template.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { motionSceneDb } from "@/features/motion-scene-engine/lib/motion-scene-db";
import type { MotionScene } from "@/features/motion-scene-engine/types/motion-scene.types";
import { isLockedMasterTemplate } from "@/features/story-scene-builder/lib/master-template-guard";
import type { StoryDataRecord } from "@/features/story-production/types/story-data.types";

export type InstantiateFromMasterInput = {
  master: MotionScene;
  userId: string;
  name: string;
  durationMs: number;
  resolvedBindings: Record<string, string>;
  storyData: StoryDataRecord;
  storyId: string;
  packageId: string;
  segmentIndex: number;
  storyHeadline: string;
};

export async function instantiateSceneFromMaster(
  client: SupabaseClient,
  input: InstantiateFromMasterInput,
): Promise<{ data: MotionScene | null; error: string | null }> {
  const master = input.master;

  // Cloning is always allowed — even from locked masters.
  // Editing the master itself remains blocked elsewhere.
  void isLockedMasterTemplate({
    id: master.id,
    name: master.name,
    is_template: master.is_template,
    is_published: master.is_published,
    workflow_state: (master as { workflow_state?: string }).workflow_state,
    deleted_at: master.deleted_at,
  });

  const db = motionSceneDb(client);
  const { data, error } = await db
    .from("creative_studio_motion_scenes")
    .insert({
      organization_id: master.organization_id,
      category_id: master.category_id,
      brand_kit_id: master.brand_kit_id,
      parent_scene_id: master.id,
      scene_type: master.scene_type,
      name: input.name,
      description: master.description,
      aspect_format: master.aspect_format,
      theme_mode: master.theme_mode,
      duration_ms: input.durationMs,
      canvas: master.canvas,
      properties: {
        ...master.properties,
        story_instance: true,
        story_id: input.storyId,
        package_id_ref: input.packageId,
        segment_index: input.segmentIndex,
      },
      timeline: {
        ...master.timeline,
        duration_ms: input.durationMs,
      },
      transitions: master.transitions,
      preview: master.preview,
      scene_document: master.scene_document,
      // Do not inherit master's resolved text — only panel bindings.
      resolved_bindings: {
        ...input.resolvedBindings,
      },
      metadata: {
        instantiated_from: master.id,
        story_id: input.storyId,
        package_id: input.packageId,
        segment_index: input.segmentIndex,
        is_story_instance: true,
        binding_model: "story-panel-v1",
        story_headline: input.storyHeadline,
        panel_subheadline: input.resolvedBindings.headline ?? "",
        story_data: input.storyData,
        story_data_version: "1.0",
        story_engine_version: "3.7",
      },
      is_template: false,
      workflow_state: "draft",
      created_by: input.userId,
      updated_by: input.userId,
    })
    .select("*")
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? "Failed to instantiate scene" };
  }

  return { data: data as unknown as MotionScene, error: null };
}
