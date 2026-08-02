import type { SupabaseClient } from "@supabase/supabase-js";

import { createTimelineService } from "@/features/creative-studio/services/timeline.service.impl";
import {
  DEFAULT_SCENE_CATEGORIES,
  SYSTEM_ANIMATION_PRESETS,
} from "@/features/motion-scene-engine/constants/motion-scene.constants";
import { motionSceneDb } from "@/features/motion-scene-engine/lib/motion-scene-db";
import {
  buildNewMotionScene,
  toMotionSceneWithRelations,
} from "@/features/motion-scene-engine/lib/scene-defaults";
import type {
  MotionScene,
  MotionSceneServiceResult,
  MotionSceneType,
  MotionSceneWithRelations,
  PlaceOnTimelineInput,
  SceneCategory,
} from "@/features/motion-scene-engine/types/motion-scene.types";

type Client = SupabaseClient;

function ok<T>(data: T): MotionSceneServiceResult<T> {
  return { data, error: null };
}

function fail<T>(error: string): MotionSceneServiceResult<T> {
  return { data: null, error };
}

function asScene(row: Record<string, unknown>): MotionScene {
  return row as unknown as MotionScene;
}

export class SupabaseMotionSceneService {
  constructor(private client: Client) {}

  private db() {
    return motionSceneDb(this.client);
  }

  async listScenes(organizationId: string, filters?: {
    categoryId?: string;
    sceneType?: MotionSceneType;
    search?: string;
    favoritesOnly?: boolean;
  }) {
    let query = this.db()
      .from("creative_studio_motion_scenes")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("is_template", true)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });

    if (filters?.categoryId) query = query.eq("category_id", filters.categoryId);
    if (filters?.sceneType) query = query.eq("scene_type", filters.sceneType);
    if (filters?.favoritesOnly) query = query.eq("is_favorite", true);
    if (filters?.search?.trim()) {
      query = query.ilike("name", `%${filters.search.trim()}%`);
    }

    const { data, error } = await query;
    if (error) return fail<MotionScene[]>(error.message);
    return ok((data ?? []).map((row) => asScene(row as Record<string, unknown>)));
  }

  async getScene(sceneId: string) {
    const { data, error } = await this.db()
      .from("creative_studio_motion_scenes")
      .select("*")
      .eq("id", sceneId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) return fail<MotionSceneWithRelations>(error.message);
    if (!data) return fail<MotionSceneWithRelations>("Motion scene not found");
    return ok(toMotionSceneWithRelations(asScene(data as Record<string, unknown>)));
  }

  async createScene(
    organizationId: string,
    userId: string,
    input: {
      sceneType: MotionSceneType;
      name: string;
      categoryId?: string | null;
      brandKitId?: string | null;
      projectId?: string | null;
    },
  ) {
    const built = buildNewMotionScene({
      sceneType: input.sceneType,
      name: input.name,
    });

    const { data, error } = await this.db()
      .from("creative_studio_motion_scenes")
      .insert({
        organization_id: organizationId,
        category_id: input.categoryId ?? null,
        brand_kit_id: input.brandKitId ?? null,
        project_id: input.projectId ?? null,
        scene_type: built.scene_type,
        name: built.name,
        aspect_format: built.aspect_format,
        duration_ms: built.duration_ms,
        canvas: built.canvas,
        properties: built.properties,
        timeline: built.timeline,
        transitions: built.transitions,
        preview: built.preview,
        scene_document: built.scene_document,
        resolved_bindings: built.resolved_bindings,
        is_template: true,
        created_by: userId,
        updated_by: userId,
      })
      .select("*")
      .single();

    if (error || !data) {
      return fail<MotionSceneWithRelations>(error?.message ?? "Create failed");
    }

    const scene = asScene(data as Record<string, unknown>);
    await this.syncNormalizedTables(organizationId, scene);
    return this.getScene(scene.id);
  }

  async updateScene(
    sceneId: string,
    patch: Partial<MotionScene>,
    userId: string,
  ) {
    const { data, error } = await this.db()
      .from("creative_studio_motion_scenes")
      .update({ ...patch, updated_by: userId })
      .eq("id", sceneId)
      .is("deleted_at", null)
      .select("*")
      .single();

    if (error || !data) {
      return fail<MotionSceneWithRelations>(error?.message ?? "Update failed");
    }

    const scene = asScene(data as Record<string, unknown>);
    if (patch.scene_document) {
      await this.syncNormalizedTables(scene.organization_id, scene);
    }
    return this.getScene(scene.id);
  }

  async duplicateScene(sceneId: string, userId: string) {
    const source = await this.getScene(sceneId);
    if (!source.data) return fail<MotionSceneWithRelations>(source.error ?? "Not found");

    const src = source.data;
    const { data, error } = await this.db()
      .from("creative_studio_motion_scenes")
      .insert({
        organization_id: src.organization_id,
        category_id: src.category_id,
        brand_kit_id: src.brand_kit_id,
        parent_scene_id: src.parent_scene_id ?? src.id,
        scene_type: src.scene_type,
        name: `${src.name} (Copy)`,
        description: src.description,
        aspect_format: src.aspect_format,
        theme_mode: src.theme_mode,
        duration_ms: src.duration_ms,
        canvas: src.canvas,
        properties: src.properties,
        timeline: src.timeline,
        transitions: src.transitions,
        preview: src.preview,
        scene_document: src.scene_document,
        resolved_bindings: src.resolved_bindings,
        metadata: { ...src.metadata, duplicated_from: src.id },
        is_template: true,
        created_by: userId,
        updated_by: userId,
      })
      .select("*")
      .single();

    if (error || !data) {
      return fail<MotionSceneWithRelations>(error?.message ?? "Duplicate failed");
    }
    const scene = asScene(data as Record<string, unknown>);
    await this.syncNormalizedTables(scene.organization_id, scene);
    return this.getScene(scene.id);
  }

  async createVersion(sceneId: string, userId: string) {
    const source = await this.getScene(sceneId);
    if (!source.data) return fail<MotionSceneWithRelations>(source.error ?? "Not found");

    const src = source.data;
    const nextVersion = src.version + 1;

    await this.db().from("creative_studio_scene_versions").insert({
      organization_id: src.organization_id,
      scene_id: src.id,
      version_number: nextVersion,
      name: `${src.name} v${nextVersion}`,
      scene_snapshot: src.scene_document as unknown as Record<string, unknown>,
      created_by: userId,
    });

    return this.updateScene(
      sceneId,
      { version: nextVersion, name: `${src.name} v${nextVersion}` },
      userId,
    );
  }

  async placeOnTimeline(input: PlaceOnTimelineInput, userId: string) {
    const scene = await this.getScene(input.sceneId);
    if (!scene.data) {
      return fail<MotionSceneWithRelations>(scene.error ?? "Scene not found");
    }

    const timeline = createTimelineService(this.client);
    const clipResult = await timeline.addClip(
      input.trackId,
      scene.data.organization_id,
      {
        name: scene.data.name,
        clip_kind: "graphic",
        start_ms: input.startMs,
        end_ms: input.startMs + scene.data.duration_ms,
        trim_start_ms: 0,
        trim_end_ms: scene.data.duration_ms,
        position_x: 0,
        position_y: 0,
        scale: 1,
        rotation: 0,
        opacity: 1,
        volume: 1,
        speed: 1,
        sort_order: 0,
        metadata: {
          motion_scene_id: scene.data.id,
          scene_type: scene.data.scene_type,
          scene_document: scene.data.scene_document,
          resolved_bindings: scene.data.resolved_bindings,
          canvas_width: scene.data.canvas.width,
          canvas_height: scene.data.canvas.height,
        },
        media_asset_id: null,
        template_id: null,
      },
    );

    if (!clipResult.data) {
      return fail<MotionSceneWithRelations>(
        clipResult.error ?? "Place on timeline failed",
      );
    }

    const bundle = await timeline.getBundleByProject(input.projectId);
    return this.updateScene(
      input.sceneId,
      {
        project_id: input.projectId,
        timeline_id: bundle.data?.timeline.id ?? null,
        clip_id: clipResult.data.id,
        is_template: false,
      },
      userId,
    );
  }

  async ensureDefaults(organizationId: string, userId: string) {
    await this.ensureCategories(organizationId);
    await this.ensureAnimationPresets(organizationId);

    const { count } = await this.db()
      .from("creative_studio_motion_scenes")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .is("deleted_at", null);

    if ((count ?? 0) > 0) {
      return this.listScenes(organizationId);
    }

    return ok([] as MotionScene[]);
  }

  private async ensureCategories(organizationId: string) {
    const { data: existing } = await this.db()
      .from("creative_studio_scene_categories")
      .select("id")
      .eq("organization_id", organizationId);

    if ((existing ?? []).length > 0) return;

    await this.db()
      .from("creative_studio_scene_categories")
      .insert(
        DEFAULT_SCENE_CATEGORIES.map((cat, index) => ({
          organization_id: organizationId,
          slug: cat.slug,
          name: cat.name,
          icon: cat.icon,
          sort_order: index,
        })),
      );
  }

  private async ensureAnimationPresets(organizationId: string) {
    const { count } = await this.db()
      .from("creative_studio_animation_presets")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("is_system", true);

    if ((count ?? 0) >= SYSTEM_ANIMATION_PRESETS.length) return;

    const { data: existing } = await this.db()
      .from("creative_studio_animation_presets")
      .select("name")
      .eq("organization_id", organizationId)
      .eq("is_system", true);

    const names = new Set((existing ?? []).map((row) => row.name as string));
    const toInsert = SYSTEM_ANIMATION_PRESETS.filter((p) => !names.has(p.name));

    if (toInsert.length === 0) return;

    await this.db()
      .from("creative_studio_animation_presets")
      .insert(
        toInsert.map((preset) => ({
          organization_id: organizationId,
          name: preset.name,
          kind: preset.kind,
          duration_ms: preset.duration_ms,
          config: preset.config,
          is_system: true,
          metadata: { motion_scene_engine: true },
        })),
      );
  }

  async listCategories(organizationId: string) {
    const { data, error } = await this.db()
      .from("creative_studio_scene_categories")
      .select("*")
      .eq("organization_id", organizationId)
      .order("sort_order", { ascending: true });

    if (error) return fail<SceneCategory[]>(error.message);
    return ok((data ?? []) as SceneCategory[]);
  }

  async listAnimationPresets(organizationId: string) {
    const { data, error } = await this.db()
      .from("creative_studio_animation_presets")
      .select("*")
      .eq("organization_id", organizationId)
      .order("name", { ascending: true });

    if (error) return fail(error.message);
    return ok(data ?? []);
  }

  private async syncNormalizedTables(organizationId: string, scene: MotionScene) {
    const doc = scene.scene_document;

    await this.db()
      .from("creative_studio_scene_layers")
      .delete()
      .eq("scene_id", scene.id);

    if (doc.layers.length > 0) {
      await this.db()
        .from("creative_studio_scene_layers")
        .insert(
          doc.layers.map((layer) => ({
            id: layer.id,
            organization_id: organizationId,
            scene_id: scene.id,
            parent_layer_id: layer.parent_layer_id ?? null,
            name: layer.name,
            layer_type: layer.layer_type,
            sort_order: layer.sort_order,
            start_ms: layer.start_ms,
            end_ms: layer.end_ms,
            offset_ms: layer.offset_ms,
            visible: layer.visible,
            locked: layer.locked,
            group_id: layer.group_id ?? null,
            transform: layer.transform,
            style: layer.style,
            content: layer.content,
            metadata: layer.metadata,
          })),
        );
    }

    await this.db()
      .from("creative_studio_scene_placeholders")
      .delete()
      .eq("scene_id", scene.id);

    if (doc.placeholders.length > 0) {
      await this.db()
        .from("creative_studio_scene_placeholders")
        .insert(
          doc.placeholders.map((ph) => ({
            id: ph.id,
            organization_id: organizationId,
            scene_id: scene.id,
            layer_id: ph.layer_id ?? null,
            placeholder_kind: ph.placeholder_kind,
            variable_key: ph.variable_key,
            label: ph.label,
            default_value: ph.default_value,
            token: ph.token,
            binding_source: ph.binding_source,
            constraints: ph.constraints,
            metadata: ph.metadata,
            sort_order: ph.sort_order,
          })),
        );
    }
  }
}

export function createMotionSceneService(client: Client) {
  return new SupabaseMotionSceneService(client);
}
