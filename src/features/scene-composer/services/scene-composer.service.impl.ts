import type { SupabaseClient } from "@supabase/supabase-js";

import { DEFAULT_SYSTEM_COMPONENTS } from "@/features/scene-composer/constants/scene-composer.constants";
import {
  GNN_BROADCAST_PACKAGE_ID,
  GNN_COMPONENT_LIBRARY,
  GNN_DESIGN_SYSTEM,
  GNN_MASTER_SCENE_CODES,
  GNN_MOTION_PRESETS,
} from "@/features/scene-composer/constants/gnn-broadcast-package.constants";
import { composerDb } from "@/features/scene-composer/lib/composer-db";
import {
  requireComposerUuid,
  toComposerUuid,
} from "@/features/scene-composer/lib/composer-ids";
import {
  createDefaultComposerSettings,
  objectsToLayers,
  upgradeToComposerDocument,
} from "@/features/scene-composer/lib/object-factory";
import { buildGnnBroadcastSceneDrafts } from "@/features/scene-composer/lib/gnn-broadcast-package";
import {
  buildGnn001ComponentObjectTree,
  GNN_001_SKELETON_COMPONENTS,
  GNN_001_SKELETON_VERSION,
} from "@/features/scene-composer/lib/gnn-001-full-news-story-skeleton";
import {
  buildGnn001BackgroundComponentRecord,
} from "@/features/scene-composer/lib/gnn-001-background.factory";
import {
  GNN_001_BACKGROUND_COMPONENT_SLUG,
  GNN_001_BACKGROUND_LAYER_VERSION,
} from "@/features/scene-composer/lib/gnn-001-background.constants";
import {
  buildGnn001FrameComponentRecords,
} from "@/features/scene-composer/lib/gnn-001-frame.factory";
import {
  GNN_001_FRAME_DEFINITIONS,
  GNN_001_FRAME_LAYER_VERSION,
} from "@/features/scene-composer/lib/gnn-001-frame.constants";
import {
  buildGnn001MainVideoComponentRecord,
} from "@/features/scene-composer/lib/gnn-001-main-video.factory";
import {
  GNN_001_MAIN_VIDEO_CONTAINER_SLUG,
  GNN_001_MAIN_VIDEO_LAYER_VERSION,
} from "@/features/scene-composer/lib/gnn-001-main-video.constants";
import {
  assertMasterTemplatePatchAllowed,
} from "@/features/story-scene-builder/lib/master-template-guard";
import type {
  ComposerScene,
  ComposerServiceResult,
  SceneComponent,
} from "@/features/scene-composer/types/scene-composer.types";
import type { MotionSceneWithRelations } from "@/features/motion-scene-engine/types/motion-scene.types";
import { createMotionSceneService } from "@/features/motion-scene-engine/services/motion-scene.service.impl";
import { withQueryLog } from "@/shared/lib/supabase/query-log";

type Client = SupabaseClient;

function ok<T>(data: T): ComposerServiceResult<T> {
  return { data, error: null };
}

function fail<T>(error: string): ComposerServiceResult<T> {
  return { data: null, error };
}

export function toComposerScene(scene: MotionSceneWithRelations): ComposerScene {
  const composerSettings =
    (scene.properties.composer_settings as ComposerScene["composer_settings"]) ??
    createDefaultComposerSettings();

  const composerDocument = upgradeToComposerDocument({
    ...scene.scene_document,
    objects: (scene.scene_document as { objects?: ComposerScene["composer_document"]["objects"] })
      .objects,
    bindings: (scene.scene_document as { bindings?: ComposerScene["composer_document"]["bindings"] })
      .bindings,
    keyframes: (scene.scene_document as { keyframes?: ComposerScene["composer_document"]["keyframes"] })
      .keyframes,
  });

  return {
    ...scene,
    workflow_state:
      (scene as MotionSceneWithRelations & { workflow_state?: ComposerScene["workflow_state"] })
        .workflow_state ?? "draft",
    frame_rate:
      (scene as MotionSceneWithRelations & { frame_rate?: number }).frame_rate ?? 30,
    composer_settings: composerSettings,
    composer_document: composerDocument,
  };
}

export class SupabaseSceneComposerService {
  constructor(private client: Client) {}

  private db() {
    return composerDb(this.client);
  }

  async getComposerScene(sceneId: string) {
    const motion = createMotionSceneService(this.client);
    const result = await motion.getScene(sceneId);
    if (!result.data) return fail<ComposerScene>(result.error ?? "Not found");
    return ok(toComposerScene(result.data));
  }

  async saveComposerScene(
    sceneId: string,
    patch: {
      composer_document: ComposerScene["composer_document"];
      composer_settings?: ComposerScene["composer_settings"];
      workflow_state?: ComposerScene["workflow_state"];
      frame_rate?: number;
      name?: string;
      duration_ms?: number;
      resolved_bindings?: Record<string, string>;
      metadata?: Record<string, unknown>;
    },
    userId: string,
    options?: { syncTables?: boolean },
  ) {
    const syncTables = options?.syncTables === true;
    const syncedLayers = objectsToLayers(patch.composer_document.objects);
    const document = {
      ...patch.composer_document,
      layers: syncedLayers,
    };

    const objectCount = patch.composer_document.objects.length;
    const mergedMetadata = {
      ...(patch.metadata ?? {}),
      layer_count: syncedLayers.length,
      object_count: objectCount,
    };

    const { data: current, error: currentError } = await this.db()
      .from("creative_studio_motion_scenes")
      .select(
        "id, name, is_template, is_published, workflow_state, deleted_at, duration_ms, scene_document, resolved_bindings, metadata, frame_rate, composer_settings",
      )
      .eq("id", sceneId)
      .is("deleted_at", null)
      .maybeSingle();

    if (currentError) {
      return fail<ComposerScene>(currentError.message);
    }
    if (!current) {
      return fail<ComposerScene>("Scene not found");
    }

    const lockError = assertMasterTemplatePatchAllowed(
      current,
      {
        name: patch.name,
        duration_ms: patch.duration_ms,
        scene_document: document,
        resolved_bindings: patch.resolved_bindings,
        metadata: mergedMetadata,
        workflow_state: patch.workflow_state,
        frame_rate: patch.frame_rate,
        composer_settings: patch.composer_settings,
      },
      {
        name: (current as { name?: string }).name,
        duration_ms: (current as { duration_ms?: number }).duration_ms,
        scene_document: (current as { scene_document?: unknown }).scene_document,
        resolved_bindings: (current as { resolved_bindings?: unknown })
          .resolved_bindings,
        metadata: (current as { metadata?: unknown }).metadata,
        workflow_state: (current as { workflow_state?: string }).workflow_state,
        frame_rate: (current as { frame_rate?: number }).frame_rate,
        composer_settings: (current as { composer_settings?: unknown })
          .composer_settings,
      },
    );
    if (lockError) {
      return fail<ComposerScene>(lockError);
    }

    // Single UPDATE — no second workflow UPDATE, no full-document
    // response body. Relational table sync is opt-in (explicit Save / checkpoint).
    const { data, error } = await withQueryLog(
      `saveComposerScene:${sceneId}:${syncTables ? "checkpoint" : "autosave"}`,
      async () =>
        await this.db()
          .from("creative_studio_motion_scenes")
          .update({
            name: patch.name,
            duration_ms: patch.duration_ms,
            scene_document: document,
            resolved_bindings: patch.resolved_bindings,
            metadata: mergedMetadata,
            workflow_state: patch.workflow_state,
            frame_rate: patch.frame_rate,
            composer_settings: patch.composer_settings,
            updated_by: userId,
          })
          .eq("id", sceneId)
          .is("deleted_at", null)
          .select(
            "id, organization_id, project_id, category_id, brand_kit_id, parent_scene_id, scene_type, name, description, aspect_format, theme_mode, duration_ms, canvas, properties, preview, metadata, resolved_bindings, is_template, is_favorite, version, workflow_state, frame_rate, composer_settings, created_at, updated_at, created_by, updated_by",
          )
          .single(),
      {
        rowCount: (r) => (r.data ? 1 : 0),
        payload: (r) => r.data,
      },
    );

    if (error || !data) {
      return fail<ComposerScene>(error?.message ?? "Save failed");
    }

    const row = data as Record<string, unknown>;
    const organizationId = row.organization_id as string;

    if (syncTables) {
      try {
        await this.syncComposerTables(organizationId, sceneId, patch);
      } catch (syncError) {
        return fail<ComposerScene>(
          syncError instanceof Error
            ? syncError.message
            : "Composer table sync failed",
        );
      }
    }

    // Return local merge — do not re-download scene_document.
    return ok(
      toComposerScene({
        ...(row as unknown as MotionSceneWithRelations),
        workflow_state:
          (patch.workflow_state as ComposerScene["workflow_state"]) ??
          (row.workflow_state as ComposerScene["workflow_state"]) ??
          "draft",
        frame_rate:
          patch.frame_rate ?? (row.frame_rate as number | undefined) ?? 30,
        properties: {
          ...((row.properties as Record<string, unknown>) ?? {}),
          composer_settings:
            patch.composer_settings ??
            (row.composer_settings as ComposerScene["composer_settings"]) ??
            ((row.properties as { composer_settings?: ComposerScene["composer_settings"] })
              ?.composer_settings),
        },
        metadata: {
          ...((row.metadata as Record<string, unknown>) ?? {}),
          ...mergedMetadata,
        },
        scene_document: document,
        resolved_bindings:
          patch.resolved_bindings ??
          ((row.resolved_bindings as Record<string, string>) ?? {}),
      } as MotionSceneWithRelations),
    );
  }

  async listComponents(organizationId: string) {
    // Library UI only needs identity/metadata — object_tree is large JSON.
    const { data, error } = await this.db()
      .from("creative_studio_scene_components")
      .select(
        "id, organization_id, component_kind, name, slug, description, version, is_system, default_bindings, metadata, created_at, updated_at, created_by, updated_by",
      )
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("name");

    if (error) return fail<SceneComponent[]>(error.message);
    return ok(
      (data ?? []).map((row) => ({
        ...(row as SceneComponent),
        object_tree: [],
      })),
    );
  }

  async ensureDefaults(organizationId: string, userId: string) {
    const { count } = await this.db()
      .from("creative_studio_scene_components")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("is_system", true);

    if ((count ?? 0) < DEFAULT_SYSTEM_COMPONENTS.length) {
      const { data: existing } = await this.db()
        .from("creative_studio_scene_components")
        .select("slug")
        .eq("organization_id", organizationId)
        .eq("is_system", true);

      const slugs = new Set((existing ?? []).map((row) => row.slug as string));
      const toInsert = DEFAULT_SYSTEM_COMPONENTS.filter((c) => !slugs.has(c.slug));

      if (toInsert.length > 0) {
        await this.db()
          .from("creative_studio_scene_components")
          .insert(
            toInsert.map((component) => ({
              organization_id: organizationId,
              component_kind: component.component_kind,
              name: component.name,
              slug: component.slug,
              is_system: true,
              object_tree: [],
              default_bindings: {},
              created_by: userId,
              updated_by: userId,
            })),
          );
      }
    }

    await this.ensureGnnDesignSystem(organizationId, userId);
    await this.ensureGnnComponentLibrary(organizationId, userId);
    await this.ensureGnnMotionPresets(organizationId);
    await this.ensureGnnMasterScenes(organizationId, userId);

    return ok(true);
  }

  async exportScene(sceneId: string) {
    const scene = await this.getComposerScene(sceneId);
    if (!scene.data) return fail<Record<string, unknown>>(scene.error ?? "Not found");
    const { exportComposerJson } = await import(
      "@/features/scene-composer/lib/object-factory"
    );
    return ok(exportComposerJson(scene.data));
  }

  private async syncComposerTables(
    organizationId: string,
    sceneId: string,
    patch: {
      composer_document: ComposerScene["composer_document"];
      composer_settings?: ComposerScene["composer_settings"];
      frame_rate?: number;
      duration_ms?: number;
    },
  ) {
    const doc = patch.composer_document;

    // Deduplicate by id — document bugs / dual seeds can otherwise trip pkey.
    const objectsById = new Map(
      doc.objects.map((obj) => [obj.id, obj] as const),
    );
    const objects = [...objectsById.values()];
    const objectIds = objects
      .map((obj) => toComposerUuid(obj.id))
      .filter((id): id is string => Boolean(id));

    // Upsert first so saves succeed even before DELETE is granted (migration 000018).
    // The old delete→insert path hit duplicate pkey because RLS blocked deletes.
    if (objects.length > 0) {
      const { error: objectsError } = await this.db()
        .from("creative_studio_scene_objects")
        .upsert(
          objects.map((obj) => ({
            id: requireComposerUuid(obj.id, "object id"),
            organization_id: organizationId,
            scene_id: sceneId,
            parent_object_id: toComposerUuid(obj.parent_object_id ?? null),
            component_id: toComposerUuid(obj.component_id ?? null),
            object_type: obj.object_type,
            name: obj.name,
            sort_order: obj.sort_order,
            start_ms: obj.start_ms,
            end_ms: obj.end_ms,
            offset_ms: obj.offset_ms,
            visible: obj.visible,
            locked: obj.locked,
            layer_color: obj.layer_color,
            transform: obj.transform,
            style: obj.style,
            content: obj.content,
            bindings: obj.bindings,
            metadata: obj.metadata,
          })),
          { onConflict: "id" },
        );
      if (objectsError) {
        throw new Error(`Object sync failed: ${objectsError.message}`);
      }
    }

    // Best-effort orphan cleanup (needs DELETE grant from migration 000018).
    // Until that migration is applied, Postgres returns permission denied — ignore it.
    {
      let orphanQuery = this.db()
        .from("creative_studio_scene_objects")
        .delete()
        .eq("scene_id", sceneId);
      if (objectIds.length > 0) {
        orphanQuery = orphanQuery.not("id", "in", `(${objectIds.join(",")})`);
      }
      await orphanQuery;
    }

    const bindingsById = new Map(
      doc.bindings.map((binding) => [binding.id, binding] as const),
    );
    const bindings = [...bindingsById.values()];
    const bindingIds = bindings
      .map((b) => toComposerUuid(b.id))
      .filter((id): id is string => Boolean(id));

    if (bindings.length > 0) {
      const { error: bindingsError } = await this.db()
        .from("creative_studio_scene_bindings")
        .upsert(
          bindings.map((binding) => ({
            id: requireComposerUuid(binding.id, "binding id"),
            organization_id: organizationId,
            scene_id: sceneId,
            object_id: toComposerUuid(binding.object_id ?? null),
            variable_key: binding.variable_key,
            binding_source: binding.binding_source,
            target_property: binding.target_property,
            token: binding.token,
            resolved_value: binding.resolved_value,
            auto_update: binding.auto_update,
            metadata: binding.metadata,
            sort_order: binding.sort_order,
          })),
          { onConflict: "id" },
        );
      if (bindingsError) {
        throw new Error(`Binding sync failed: ${bindingsError.message}`);
      }
    }

    {
      let orphanQuery = this.db()
        .from("creative_studio_scene_bindings")
        .delete()
        .eq("scene_id", sceneId);
      if (bindingIds.length > 0) {
        orphanQuery = orphanQuery.not("id", "in", `(${bindingIds.join(",")})`);
      }
      await orphanQuery;
    }

    const keyframesById = new Map(
      doc.keyframes.map((kf) => [kf.id, kf] as const),
    );
    const keyframes = [...keyframesById.values()];
    const keyframeIds = keyframes
      .map((kf) => toComposerUuid(kf.id))
      .filter((id): id is string => Boolean(id));

    if (keyframes.length > 0) {
      const { error: keyframesError } = await this.db()
        .from("creative_studio_scene_keyframes")
        .upsert(
          keyframes.map((kf) => ({
            id: requireComposerUuid(kf.id, "keyframe id"),
            organization_id: organizationId,
            scene_id: sceneId,
            object_id: toComposerUuid(kf.object_id ?? null),
            animation_id: toComposerUuid(kf.animation_id ?? null),
            property: kf.property,
            at_ms: kf.at_ms,
            value: kf.value,
            easing: kf.easing,
            bezier_curve: kf.bezier_curve ?? null,
            sort_order: kf.sort_order,
            metadata: kf.metadata,
          })),
          { onConflict: "id" },
        );
      if (keyframesError) {
        throw new Error(`Keyframe sync failed: ${keyframesError.message}`);
      }
    }

    {
      let orphanQuery = this.db()
        .from("creative_studio_scene_keyframes")
        .delete()
        .eq("scene_id", sceneId);
      if (keyframeIds.length > 0) {
        orphanQuery = orphanQuery.not(
          "id",
          "in",
          `(${keyframeIds.join(",")})`,
        );
      }
      await orphanQuery;
    }

    await this.db()
      .from("creative_studio_scene_timelines")
      .upsert(
        {
          organization_id: organizationId,
          scene_id: sceneId,
          duration_ms: patch.duration_ms ?? objects[0]?.end_ms ?? 5000,
          frame_rate: patch.frame_rate ?? 30,
          markers: [],
          tracks: objects.map((obj) => {
            const objectId = requireComposerUuid(obj.id, "object id");
            return {
              id: `track-${objectId}`,
              object_id: objectId,
              name: obj.name,
            };
          }),
        },
        { onConflict: "scene_id" },
      );
  }

  private async ensureGnnDesignSystem(organizationId: string, userId: string) {
    const { data: existing } = await this.db()
      .from("creative_studio_brand_kits")
      .select("id, metadata")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .eq("is_default", true)
      .maybeSingle();

    if (!existing) return;

    const metadata = (existing.metadata ?? {}) as Record<string, unknown>;
    if (metadata.gnn_broadcast_package === GNN_BROADCAST_PACKAGE_ID) return;

    await this.db()
      .from("creative_studio_brand_kits")
      .update({
        metadata: {
          ...metadata,
          gnn_broadcast_package: GNN_BROADCAST_PACKAGE_ID,
          gnn_design_system: GNN_DESIGN_SYSTEM,
          updated_by_module: "3.4",
        },
        updated_by: userId,
      })
      .eq("id", existing.id);
  }

  private async ensureGnnComponentLibrary(
    organizationId: string,
    userId: string,
  ) {
    const { data: existing } = await this.db()
      .from("creative_studio_scene_components")
      .select("id, slug, metadata")
      .eq("organization_id", organizationId)
      .is("deleted_at", null);

    const bySlug = new Map(
      (existing ?? []).map((row) => [
        String(row.slug),
        row as { id: string; slug: string; metadata: Record<string, unknown> | null },
      ]),
    );
    const slugs = new Set(bySlug.keys());
    const frameComponents = buildGnn001FrameComponentRecords();
    const mainVideoComponent = buildGnn001MainVideoComponentRecord();
    const candidates = [
      ...DEFAULT_SYSTEM_COMPONENTS,
      ...GNN_COMPONENT_LIBRARY,
      ...GNN_001_SKELETON_COMPONENTS.map((component) => ({
        slug: component.slug,
        name: component.name,
        component_kind: component.component_kind,
      })),
      {
        slug: GNN_001_BACKGROUND_COMPONENT_SLUG,
        name: "GNN-001 Background",
        component_kind: "background" as const,
      },
      ...frameComponents.map((component) => ({
        slug: component.slug,
        name: component.name,
        component_kind: component.component_kind,
      })),
      {
        slug: mainVideoComponent.slug,
        name: mainVideoComponent.name,
        component_kind: mainVideoComponent.component_kind,
      },
    ];
    const toInsert = candidates.filter((component) => !slugs.has(component.slug));

    if (toInsert.length > 0) {
      await this.db()
        .from("creative_studio_scene_components")
        .insert(
          toInsert.map((component) => ({
            organization_id: organizationId,
            component_kind: component.component_kind,
            name: component.name,
            slug: component.slug,
            description:
              "GNN Broadcast Package reusable component (editable in Scene Composer).",
            is_system: true,
            object_tree: buildGnn001ComponentObjectTree(component.slug),
            default_bindings: {},
            metadata: {
              package_id: GNN_BROADCAST_PACKAGE_ID,
              editable: true,
              ai_ready: true,
              skeleton: component.slug.startsWith("gnn-001-"),
            },
            created_by: userId,
            updated_by: userId,
          })),
        );
    }

    // Keep GNN-001 skeleton component trees in sync — only when version drifts.
    for (const component of GNN_001_SKELETON_COMPONENTS) {
      const row = bySlug.get(component.slug);
      const meta = (row?.metadata ?? {}) as Record<string, unknown>;
      if (meta.layout_skeleton_version === GNN_001_SKELETON_VERSION) continue;

      await this.db()
        .from("creative_studio_scene_components")
        .update({
          object_tree: buildGnn001ComponentObjectTree(component.slug),
          name: component.name,
          updated_by: userId,
          metadata: {
            package_id: GNN_BROADCAST_PACKAGE_ID,
            editable: true,
            ai_ready: true,
            skeleton: true,
            layout_skeleton_version: GNN_001_SKELETON_VERSION,
          },
        })
        .eq("organization_id", organizationId)
        .eq("slug", component.slug)
        .is("deleted_at", null);
    }

    // Keep GNN-001 Background Component in sync (Layer 1).
    const backgroundComponent = buildGnn001BackgroundComponentRecord();
    {
      const row = bySlug.get(GNN_001_BACKGROUND_COMPONENT_SLUG);
      const meta = (row?.metadata ?? {}) as Record<string, unknown>;
      if (meta.background_version !== GNN_001_BACKGROUND_LAYER_VERSION) {
        await this.db()
          .from("creative_studio_scene_components")
          .update({
            name: backgroundComponent.name,
            description: backgroundComponent.description,
            object_tree: backgroundComponent.object_tree,
            default_bindings: backgroundComponent.default_bindings,
            updated_by: userId,
            metadata: {
              ...backgroundComponent.metadata,
              background_version: GNN_001_BACKGROUND_LAYER_VERSION,
            },
          })
          .eq("organization_id", organizationId)
          .eq("slug", GNN_001_BACKGROUND_COMPONENT_SLUG)
          .is("deleted_at", null);
      }
    }

    // Keep GNN-001 Frame Components in sync (Layer 2).
    for (const frameComponent of frameComponents) {
      const row = bySlug.get(frameComponent.slug);
      const meta = (row?.metadata ?? {}) as Record<string, unknown>;
      if (meta.frame_version === GNN_001_FRAME_LAYER_VERSION) continue;

      await this.db()
        .from("creative_studio_scene_components")
        .update({
          name: frameComponent.name,
          description: frameComponent.description,
          object_tree: frameComponent.object_tree,
          default_bindings: frameComponent.default_bindings,
          updated_by: userId,
          metadata: {
            ...frameComponent.metadata,
            frame_version: GNN_001_FRAME_LAYER_VERSION,
          },
        })
        .eq("organization_id", organizationId)
        .eq("slug", frameComponent.slug)
        .is("deleted_at", null);
    }

    // Keep GNN-001 Main Video Container in sync (Layer 3).
    {
      const row = bySlug.get(GNN_001_MAIN_VIDEO_CONTAINER_SLUG);
      const meta = (row?.metadata ?? {}) as Record<string, unknown>;
      if (meta.main_video_version !== GNN_001_MAIN_VIDEO_LAYER_VERSION) {
        await this.db()
          .from("creative_studio_scene_components")
          .update({
            name: mainVideoComponent.name,
            description: mainVideoComponent.description,
            object_tree: mainVideoComponent.object_tree,
            default_bindings: mainVideoComponent.default_bindings,
            updated_by: userId,
            metadata: {
              ...mainVideoComponent.metadata,
              main_video_version: GNN_001_MAIN_VIDEO_LAYER_VERSION,
            },
          })
          .eq("organization_id", organizationId)
          .eq("slug", GNN_001_MAIN_VIDEO_CONTAINER_SLUG)
          .is("deleted_at", null);
      }
    }
  }

  private async ensureGnnMotionPresets(organizationId: string) {
    const { data: existing } = await this.db()
      .from("creative_studio_animation_presets")
      .select("name")
      .eq("organization_id", organizationId)
      .eq("is_system", true);

    const names = new Set((existing ?? []).map((row) => String(row.name)));
    const toInsert = GNN_MOTION_PRESETS.filter((preset) => !names.has(preset.name));
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
          metadata: {
            package_id: GNN_BROADCAST_PACKAGE_ID,
            module: "3.4",
          },
        })),
      );
  }

  private async ensureGnnMasterScenes(organizationId: string, userId: string) {
    const { data: existing } = await this.db()
      .from("creative_studio_motion_scenes")
      .select("id, name, metadata, updated_at, is_template, deleted_at")
      .eq("organization_id", organizationId);

    type ExistingRow = {
      id: string;
      name: string;
      metadata: Record<string, unknown>;
      updated_at: string;
      is_template: boolean;
      deleted_at: string | null;
    };

    const rows: ExistingRow[] = (existing ?? []).map((row) => ({
      id: row.id as string,
      name: String(row.name ?? ""),
      metadata: (row.metadata as Record<string, unknown> | null) ?? {},
      updated_at: String(row.updated_at ?? ""),
      is_template: Boolean(row.is_template),
      deleted_at: typeof row.deleted_at === "string" ? row.deleted_at : null,
    }));

    const isStoryInstanceRow = (row: ExistingRow) =>
      row.metadata.is_story_instance === true ||
      row.metadata.binding_model === "story-panel-v1" ||
      (typeof row.metadata.story_id === "string" &&
        row.metadata.story_id.length > 0 &&
        !row.is_template);

    // Masters only — never promote story scene clones into the GNN master slot.
    const liveTemplateRows = rows.filter(
      (row) => row.deleted_at == null && row.is_template && !isStoryInstanceRow(row),
    );

    // Prefer the most recently updated *template* for each package_code.
    const existingByCode = new Map<string, ExistingRow>();
    for (const row of liveTemplateRows) {
      const code = row.metadata.package_code;
      if (typeof code !== "string") continue;
      const prev = existingByCode.get(code);
      if (!prev || row.updated_at > prev.updated_at) {
        existingByCode.set(code, row);
      }
    }

    // Revive soft-deleted masters when no live master exists for the code.
    for (const code of GNN_MASTER_SCENE_CODES) {
      if (existingByCode.has(code)) continue;
      const softDeleted = rows
        .filter(
          (row) =>
            row.deleted_at != null &&
            row.is_template &&
            !isStoryInstanceRow(row) &&
            row.metadata.package_code === code,
        )
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
      const revive = softDeleted[0];
      if (!revive) continue;
      await this.db()
        .from("creative_studio_motion_scenes")
        .update({
          deleted_at: null,
          is_template: true,
          updated_by: userId,
        })
        .eq("id", revive.id);
      existingByCode.set(code, { ...revive, deleted_at: null });
    }

    const drafts = buildGnnBroadcastSceneDrafts();

    // Adopt latest same-named template when package_code is missing (old duplicates).
    for (const draft of drafts) {
      const code = String(draft.metadata.package_code ?? "");
      if (!code || existingByCode.has(code)) continue;
      const draftName = draft.name.trim().toLowerCase();
      const matches = liveTemplateRows
        .filter((row) => {
          const base = row.name
            .trim()
            .toLowerCase()
            .replace(/\s*\(copy\)\s*$/i, "")
            .trim();
          return (
            base === draftName ||
            row.name.toUpperCase().includes(code) ||
            String(row.metadata.package_code ?? "") === code
          );
        })
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
      const adopt = matches[0];
      if (!adopt) continue;
      existingByCode.set(code, adopt);
      await this.db()
        .from("creative_studio_motion_scenes")
        .update({
          name: draft.name,
          is_template: true,
          metadata: {
            ...adopt.metadata,
            ...draft.metadata,
          },
          updated_by: userId,
        })
        .eq("id", adopt.id);
    }

    for (const draft of drafts) {
      const code = String(draft.metadata.package_code ?? "");
      const existingScene = existingByCode.get(code);

      // Fast path: GNN-001 already at current skeleton version — skip
      // downloading the full scene_document on every library visit.
      if (
        code === "GNN-001" &&
        existingScene &&
        existingScene.metadata.layout_skeleton_version === GNN_001_SKELETON_VERSION
      ) {
        continue;
      }

      // Refresh GNN-001 when skeleton version changes or required layers are missing.
      const sceneDoc = existingScene
        ? (
            await this.db()
              .from("creative_studio_motion_scenes")
              .select("scene_document")
              .eq("id", existingScene.id)
              .maybeSingle()
          ).data?.scene_document
        : null;
      const docObjects =
        sceneDoc &&
        typeof sceneDoc === "object" &&
        Array.isArray((sceneDoc as { objects?: unknown[] }).objects)
          ? ((sceneDoc as { objects: Array<{ metadata?: Record<string, unknown> }> }).objects)
          : [];
      const hasBackgroundLayer = docObjects.some(
        (obj) =>
          obj.metadata?.component_slug === GNN_001_BACKGROUND_COMPONENT_SLUG ||
          obj.metadata?.layer === "background",
      );
      const hasFrameLayer = docObjects.some(
        (obj) =>
          obj.metadata?.layer === "frames" ||
          (typeof obj.metadata?.component_slug === "string" &&
            GNN_001_FRAME_DEFINITIONS.some(
              (frame) => frame.slug === obj.metadata?.component_slug,
            )),
      );
      const hasMainVideoContainer = docObjects.some(
        (obj) =>
          obj.metadata?.component_slug === GNN_001_MAIN_VIDEO_CONTAINER_SLUG ||
          obj.metadata?.layer === "main_video_container",
      );
      const mainVideoVersion = docObjects.find(
        (obj) =>
          obj.metadata?.component_slug === GNN_001_MAIN_VIDEO_CONTAINER_SLUG ||
          obj.metadata?.layer === "main_video_container",
      )?.metadata?.main_video_version;
      const mainVideoOutdated =
        hasMainVideoContainer &&
        mainVideoVersion !== GNN_001_MAIN_VIDEO_LAYER_VERSION;

      if (
        code === "GNN-001" &&
        existingScene &&
        (existingScene.metadata.layout_skeleton_version !==
          GNN_001_SKELETON_VERSION ||
          docObjects.length === 0 ||
          !hasBackgroundLayer ||
          !hasFrameLayer ||
          !hasMainVideoContainer ||
          mainVideoOutdated)
      ) {
        await this.db()
          .from("creative_studio_motion_scenes")
          .update({
            name: draft.name,
            description: draft.description,
            duration_ms: draft.duration_ms,
            scene_document: {
              ...draft.composer_document,
              layers: objectsToLayers(draft.composer_document.objects),
            },
            properties: {
              package_id: GNN_BROADCAST_PACKAGE_ID,
              responsive_documents: draft.responsive_documents,
              design_system: GNN_DESIGN_SYSTEM,
              layout_mode: "skeleton",
            },
            timeline: {
              duration_ms: draft.duration_ms,
              markers: [],
              tracks: draft.composer_document.objects.map((obj) => ({
                id: `track-${obj.id}`,
                layer_id: obj.id,
                name: obj.name,
              })),
            },
            metadata: draft.metadata,
            resolved_bindings: {},
            is_template: true,
            deleted_at: null,
            updated_by: userId,
          })
          .eq("id", existingScene.id);

        await this.syncComposerTables(organizationId, existingScene.id, {
          composer_document: draft.composer_document,
          duration_ms: draft.duration_ms,
          frame_rate: 30,
        });
        continue;
      }

      if (existingScene) continue;

      const { data: inserted, error } = await this.db()
        .from("creative_studio_motion_scenes")
        .insert({
          organization_id: organizationId,
          scene_type: draft.scene_type,
          name: draft.name,
          description: draft.description,
          aspect_format: "16:9",
          theme_mode: "channel",
          duration_ms: draft.duration_ms,
          canvas: {
            width: 1920,
            height: 1080,
            background: "#0B1220",
            safe_area: { top: 48, right: 48, bottom: 48, left: 48 },
            grid: { enabled: true, size: 16 },
            guides: [],
          },
          properties: {
            package_id: GNN_BROADCAST_PACKAGE_ID,
            responsive_documents: draft.responsive_documents,
            design_system: GNN_DESIGN_SYSTEM,
            ...(code === "GNN-001" ? { layout_mode: "skeleton" } : {}),
          },
          timeline: {
            duration_ms: draft.duration_ms,
            markers: [],
            tracks: draft.composer_document.objects.map((obj) => ({
              id: `track-${obj.id}`,
              layer_id: obj.id,
              name: obj.name,
            })),
          },
          transitions: { in: null, out: null },
          preview: { playhead_ms: 0, loop: false, safe_area_visible: true },
          scene_document: {
            ...draft.composer_document,
            layers: objectsToLayers(draft.composer_document.objects),
          },
          resolved_bindings: {},
          metadata: draft.metadata,
          is_template: true,
          created_by: userId,
          updated_by: userId,
        })
        .select("id")
        .single();

      if (error || !inserted) continue;

      existingByCode.set(code, {
        id: inserted.id as string,
        name: draft.name,
        metadata: draft.metadata as Record<string, unknown>,
        updated_at: new Date().toISOString(),
        is_template: true,
        deleted_at: null,
      });

      await this.syncComposerTables(organizationId, inserted.id, {
        composer_document: draft.composer_document,
        duration_ms: draft.duration_ms,
        frame_rate: 30,
      });
    }

    // Soft-delete retired template codes + duplicate *templates* only.
    // Never soft-delete story scene instances (even if they inherited package_code).
    const allowedCodes = new Set<string>(GNN_MASTER_SCENE_CODES);
    const keepIds = new Set(
      [...existingByCode.entries()]
        .filter(([code]) => allowedCodes.has(code as (typeof GNN_MASTER_SCENE_CODES)[number]))
        .map(([, row]) => row.id),
    );

    const masterNames = new Set(
      drafts.map((draft) => draft.name.trim().toLowerCase()),
    );

    const obsoleteIds = liveTemplateRows
      .filter((row) => {
        if (keepIds.has(row.id)) return false;
        if (isStoryInstanceRow(row)) return false;

        const packageId = row.metadata.package_id;
        const code = row.metadata.package_code;
        const isGnnPackage = packageId === GNN_BROADCAST_PACKAGE_ID;
        const normalizedName = row.name.trim().toLowerCase();
        const baseName = normalizedName.replace(/\s*\(copy\)\s*$/i, "").trim();

        if (isGnnPackage) {
          // Duplicate of an active master code, or a retired code.
          if (typeof code === "string") return true;
          // GNN-tagged row without code — remove if it looks like a master clone.
          return masterNames.has(baseName) || /^gnn-\d{3}\b/i.test(row.name);
        }

        // Orphan copies named like a master scene (missing package metadata).
        if (masterNames.has(baseName)) return true;

        return false;
      })
      .map((row) => row.id);

    if (obsoleteIds.length > 0) {
      await this.db()
        .from("creative_studio_motion_scenes")
        .update({
          deleted_at: new Date().toISOString(),
          updated_by: userId,
        })
        .in("id", obsoleteIds);
    }

    // Strip master package_code from story instances so they never compete again.
    const pollutedInstances = rows.filter(
      (row) =>
        row.deleted_at == null &&
        isStoryInstanceRow(row) &&
        (row.metadata.package_code === "GNN-001" ||
          row.metadata.package_id === GNN_BROADCAST_PACKAGE_ID),
    );
    for (const row of pollutedInstances) {
      const nextMeta = { ...row.metadata };
      delete nextMeta.package_code;
      delete nextMeta.package_id;
      nextMeta.is_story_instance = true;
      await this.db()
        .from("creative_studio_motion_scenes")
        .update({
          metadata: nextMeta,
          updated_by: userId,
        })
        .eq("id", row.id);
    }
  }
}

export function createSceneComposerService(client: Client) {
  return new SupabaseSceneComposerService(client);
}
