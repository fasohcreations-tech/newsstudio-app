import type { SupabaseClient } from "@supabase/supabase-js";

import { DEFAULT_SYSTEM_COMPONENTS } from "@/features/scene-composer/constants/scene-composer.constants";
import {
  GNN_BROADCAST_PACKAGE_ID,
  GNN_COMPONENT_LIBRARY,
  GNN_DESIGN_SYSTEM,
  GNN_MOTION_PRESETS,
} from "@/features/scene-composer/constants/gnn-broadcast-package.constants";
import { composerDb } from "@/features/scene-composer/lib/composer-db";
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
import type {
  ComposerScene,
  ComposerServiceResult,
  SceneComponent,
} from "@/features/scene-composer/types/scene-composer.types";
import type { MotionSceneWithRelations } from "@/features/motion-scene-engine/types/motion-scene.types";
import { createMotionSceneService } from "@/features/motion-scene-engine/services/motion-scene.service.impl";

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
  ) {
    const syncedLayers = objectsToLayers(patch.composer_document.objects);
    const document = {
      ...patch.composer_document,
      layers: syncedLayers,
    };

    const motion = createMotionSceneService(this.client);
    const existing = await motion.getScene(sceneId);
    const mergedProperties = {
      ...(existing.data?.properties ?? {}),
      composer_settings: patch.composer_settings ?? existing.data?.properties?.composer_settings,
    };

    const result = await motion.updateScene(
      sceneId,
      {
        name: patch.name,
        duration_ms: patch.duration_ms,
        scene_document: document,
        properties: mergedProperties,
        resolved_bindings: patch.resolved_bindings,
        metadata: patch.metadata
          ? {
              ...(existing.data?.metadata ?? {}),
              ...patch.metadata,
            }
          : undefined,
      },
      userId,
    );

    if (!result.data) return fail<ComposerScene>(result.error ?? "Save failed");

    await this.syncComposerTables(result.data.organization_id, sceneId, patch);

    const { error: wfError } = await this.db()
      .from("creative_studio_motion_scenes")
      .update({
        workflow_state: patch.workflow_state,
        frame_rate: patch.frame_rate,
        composer_settings: patch.composer_settings,
        updated_by: userId,
      })
      .eq("id", sceneId);

    if (wfError) return fail<ComposerScene>(wfError.message);

    return this.getComposerScene(sceneId);
  }

  async listComponents(organizationId: string) {
    const { data, error } = await this.db()
      .from("creative_studio_scene_components")
      .select("*")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("name");

    if (error) return fail<SceneComponent[]>(error.message);
    return ok((data ?? []) as SceneComponent[]);
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

    await this.db()
      .from("creative_studio_scene_objects")
      .delete()
      .eq("scene_id", sceneId);

    if (doc.objects.length > 0) {
      await this.db()
        .from("creative_studio_scene_objects")
        .insert(
          doc.objects.map((obj) => ({
            id: obj.id,
            organization_id: organizationId,
            scene_id: sceneId,
            parent_object_id: obj.parent_object_id ?? null,
            component_id: obj.component_id ?? null,
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
        );
    }

    await this.db()
      .from("creative_studio_scene_bindings")
      .delete()
      .eq("scene_id", sceneId);

    if (doc.bindings.length > 0) {
      await this.db()
        .from("creative_studio_scene_bindings")
        .insert(
          doc.bindings.map((binding) => ({
            id: binding.id,
            organization_id: organizationId,
            scene_id: sceneId,
            object_id: binding.object_id ?? null,
            variable_key: binding.variable_key,
            binding_source: binding.binding_source,
            target_property: binding.target_property,
            token: binding.token,
            resolved_value: binding.resolved_value,
            auto_update: binding.auto_update,
            metadata: binding.metadata,
            sort_order: binding.sort_order,
          })),
        );
    }

    await this.db()
      .from("creative_studio_scene_keyframes")
      .delete()
      .eq("scene_id", sceneId);

    if (doc.keyframes.length > 0) {
      await this.db()
        .from("creative_studio_scene_keyframes")
        .insert(
          doc.keyframes.map((kf) => ({
            id: kf.id,
            organization_id: organizationId,
            scene_id: sceneId,
            object_id: kf.object_id ?? null,
            animation_id: kf.animation_id ?? null,
            property: kf.property,
            at_ms: kf.at_ms,
            value: kf.value,
            easing: kf.easing,
            bezier_curve: kf.bezier_curve ?? null,
            sort_order: kf.sort_order,
            metadata: kf.metadata,
          })),
        );
    }

    await this.db()
      .from("creative_studio_scene_timelines")
      .upsert(
        {
          organization_id: organizationId,
          scene_id: sceneId,
          duration_ms: patch.duration_ms ?? doc.objects[0]?.end_ms ?? 5000,
          frame_rate: patch.frame_rate ?? 30,
          markers: [],
          tracks: doc.objects.map((obj) => ({
            id: `track-${obj.id}`,
            object_id: obj.id,
            name: obj.name,
          })),
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
      .select("id, slug")
      .eq("organization_id", organizationId)
      .is("deleted_at", null);

    const slugs = new Set((existing ?? []).map((row) => String(row.slug)));
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

    // Keep GNN-001 skeleton component trees in sync.
    for (const component of GNN_001_SKELETON_COMPONENTS) {
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

    // Keep GNN-001 Frame Components in sync (Layer 2).
    for (const frameComponent of frameComponents) {
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
      .select("id, metadata")
      .eq("organization_id", organizationId)
      .is("deleted_at", null);

    const existingByCode = new Map<string, { id: string; metadata: Record<string, unknown> }>();
    for (const row of existing ?? []) {
      const meta = (row.metadata as Record<string, unknown> | null) ?? {};
      const code = meta.package_code;
      if (typeof code === "string") {
        existingByCode.set(code, { id: row.id as string, metadata: meta });
      }
    }

    const drafts = buildGnnBroadcastSceneDrafts();

    for (const draft of drafts) {
      const code = String(draft.metadata.package_code ?? "");
      const existingScene = existingByCode.get(code);

      // Refresh GNN-001 when skeleton/background version changes or background layer is missing.
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

      await this.syncComposerTables(organizationId, inserted.id, {
        composer_document: draft.composer_document,
        duration_ms: draft.duration_ms,
        frame_rate: 30,
      });
    }
  }
}

export function createSceneComposerService(client: Client) {
  return new SupabaseSceneComposerService(client);
}
