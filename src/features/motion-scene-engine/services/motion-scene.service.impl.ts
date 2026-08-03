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
  SceneVersion,
} from "@/features/motion-scene-engine/types/motion-scene.types";
import { withQueryLog } from "@/shared/lib/supabase/query-log";

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
    /** When true, omit heavy JSON (scene_document / timeline). Default true. */
    lightweight?: boolean;
    /** Max rows (library pagination). Default 100. */
    limit?: number;
    /** Offset for pagination. Default 0. */
    offset?: number;
  }) {
    const lightweight = filters?.lightweight !== false;
    const limit = Math.min(Math.max(filters?.limit ?? 100, 1), 500);
    const offset = Math.max(filters?.offset ?? 0, 0);
    // Library / sidebars never need full scene_document — that was a major egress source.
    const columns = lightweight
      ? [
          "id",
          "organization_id",
          "category_id",
          "project_id",
          "brand_kit_id",
          "parent_scene_id",
          "scene_type",
          "name",
          "description",
          "aspect_format",
          "theme_mode",
          "duration_ms",
          "canvas",
          "properties",
          "preview",
          "metadata",
          "is_template",
          "is_favorite",
          "version",
          "created_at",
          "updated_at",
          "created_by",
          "updated_by",
        ].join(",")
      : "*";

    let query = this.db()
      .from("creative_studio_motion_scenes")
      .select(columns)
      .eq("organization_id", organizationId)
      .eq("is_template", true)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (filters?.categoryId) query = query.eq("category_id", filters.categoryId);
    if (filters?.sceneType) query = query.eq("scene_type", filters.sceneType);
    if (filters?.favoritesOnly) query = query.eq("is_favorite", true);
    if (filters?.search?.trim()) {
      query = query.ilike("name", `%${filters.search.trim()}%`);
    }

    const { data, error } = await withQueryLog(
      `listScenes:${organizationId}:${lightweight ? "light" : "full"}`,
      async () => await query,
      {
        rowCount: (r) => (Array.isArray(r.data) ? r.data.length : 0),
        payload: (r) => r.data,
      },
    );
    if (error) return fail<MotionScene[]>(error.message);
    return ok(
      (data ?? []).map((row) => {
        const scene = asScene(row as unknown as Record<string, unknown>);
        // Lightweight rows omit scene_document — provide an empty stub so callers
        // that read .layers do not throw. Layer count lives in metadata.layer_count.
        if (lightweight && scene.scene_document == null) {
          scene.scene_document = {
            version: "1.0",
            layers: [],
            placeholders: [],
            variables: [],
            animations: [],
          };
        }
        return scene;
      }),
    );
  }

  async getScene(sceneId: string) {
    const { data, error } = await withQueryLog(
      `getScene:${sceneId}`,
      async () =>
        await this.db()
          .from("creative_studio_motion_scenes")
          .select("*")
          .eq("id", sceneId)
          .is("deleted_at", null)
          .maybeSingle(),
      {
        rowCount: (r) => (r.data ? 1 : 0),
        payload: (r) => r.data,
      },
    );

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
    // Insert already returned the row — avoid a second full-document download.
    return ok(toMotionSceneWithRelations(scene));
  }

  async updateScene(
    sceneId: string,
    patch: Partial<MotionScene>,
    userId: string,
    options?: { syncNormalized?: boolean; refetch?: boolean },
  ) {
    const syncNormalized = options?.syncNormalized !== false;
    const refetch = options?.refetch !== false;

    // When not refetching, omit scene_document / timeline from the response body
    // — returning the JSON we just wrote doubles autosave egress.
    const returning = refetch
      ? "*"
      : [
          "id",
          "organization_id",
          "category_id",
          "project_id",
          "brand_kit_id",
          "parent_scene_id",
          "scene_type",
          "name",
          "description",
          "aspect_format",
          "theme_mode",
          "duration_ms",
          "canvas",
          "properties",
          "preview",
          "metadata",
          "resolved_bindings",
          "is_template",
          "is_favorite",
          "version",
          "created_at",
          "updated_at",
          "created_by",
          "updated_by",
        ].join(",");

    const { data, error } = await this.db()
      .from("creative_studio_motion_scenes")
      .update({ ...patch, updated_by: userId })
      .eq("id", sceneId)
      .is("deleted_at", null)
      .select(returning)
      .single();

    if (error || !data) {
      return fail<MotionSceneWithRelations>(error?.message ?? "Update failed");
    }

    const scene = asScene(data as unknown as Record<string, unknown>);
    if (patch.scene_document) {
      scene.scene_document = patch.scene_document;
    }
    if (syncNormalized && patch.scene_document) {
      await this.syncNormalizedTables(scene.organization_id, scene);
    }
    // Avoid a second full-document download after every save/autosave.
    if (!refetch) {
      return ok(toMotionSceneWithRelations(scene));
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

  /**
   * Snapshot the current scene document into history and bump version.
   * Keeps the live scene name stable (one scene = one named file).
   */
  async createVersion(
    sceneId: string,
    userId: string,
    options?: { label?: string },
  ) {
    const source = await this.getScene(sceneId);
    if (!source.data) {
      return fail<MotionSceneWithRelations>(source.error ?? "Not found");
    }

    const src = source.data;
    const nextVersion = src.version + 1;
    const label =
      options?.label?.trim() ||
      `Version ${nextVersion}`;

    const { error: insertError } = await this.db()
      .from("creative_studio_scene_versions")
      .insert({
        organization_id: src.organization_id,
        scene_id: src.id,
        version_number: nextVersion,
        name: label,
        scene_snapshot: src.scene_document as unknown as Record<string, unknown>,
        created_by: userId,
      });

    if (insertError) {
      return fail<MotionSceneWithRelations>(insertError.message);
    }

    // Bump version counter only — never rename the live scene.
    return this.updateScene(sceneId, { version: nextVersion }, userId);
  }

  async listVersions(sceneId: string) {
    const { data, error } = await this.db()
      .from("creative_studio_scene_versions")
      .select(
        "id, organization_id, scene_id, version_number, name, created_by, created_at",
      )
      .eq("scene_id", sceneId)
      .order("version_number", { ascending: false });

    if (error) return fail<SceneVersion[]>(error.message);
    return ok(
      (data ?? []).map((row) => ({
        ...(row as Omit<SceneVersion, "scene_snapshot">),
        scene_snapshot: {},
      })),
    );
  }

  async getVersion(versionId: string) {
    const { data, error } = await this.db()
      .from("creative_studio_scene_versions")
      .select("*")
      .eq("id", versionId)
      .maybeSingle();

    if (error) return fail<SceneVersion>(error.message);
    if (!data) return fail<SceneVersion>("Version not found");
    return ok(data as SceneVersion);
  }

  /**
   * Restore a history snapshot onto the same scene record (same id + name).
   * Saves a safety checkpoint of the current live state first.
   */
  async restoreVersion(sceneId: string, versionId: string, userId: string) {
    const versionResult = await this.getVersion(versionId);
    if (!versionResult.data) {
      return fail<MotionSceneWithRelations>(
        versionResult.error ?? "Version not found",
      );
    }
    const version = versionResult.data;
    if (version.scene_id !== sceneId) {
      return fail<MotionSceneWithRelations>("Version does not belong to this scene");
    }

    const safety = await this.createVersion(sceneId, userId, {
      label: `Before restore · v${version.version_number}`,
    });
    if (!safety.data) {
      return fail<MotionSceneWithRelations>(
        safety.error ?? "Could not checkpoint current scene",
      );
    }

    const snapshot = version.scene_snapshot as unknown as MotionScene["scene_document"];
    // Ensure layers array exists for normalized sync after restore.
    const document: MotionScene["scene_document"] = {
      ...snapshot,
      layers: Array.isArray(snapshot.layers) ? snapshot.layers : [],
      placeholders: Array.isArray(snapshot.placeholders)
        ? snapshot.placeholders
        : [],
      variables: Array.isArray(snapshot.variables) ? snapshot.variables : [],
      animations: Array.isArray(snapshot.animations) ? snapshot.animations : [],
    };

    return this.updateScene(
      sceneId,
      {
        scene_document: document,
      },
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
      .select(
        "id, organization_id, name, slug, description, icon, sort_order, metadata, created_at, updated_at",
      )
      .eq("organization_id", organizationId)
      .order("sort_order", { ascending: true });

    if (error) return fail<SceneCategory[]>(error.message);
    return ok((data ?? []) as SceneCategory[]);
  }

  async listAnimationPresets(organizationId: string) {
    const { data, error } = await this.db()
      .from("creative_studio_animation_presets")
      .select(
        "id, organization_id, name, kind, duration_ms, config, is_system, metadata, created_at, updated_at",
      )
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
