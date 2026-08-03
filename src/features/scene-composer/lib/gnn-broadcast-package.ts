import { createSceneObject, objectsToLayers } from "@/features/scene-composer/lib/object-factory";
import { buildGnn001SkeletonDocument } from "@/features/scene-composer/lib/gnn-001-full-news-story-skeleton";
import { buildAllResponsiveVariants } from "@/features/scene-composer/lib/responsive-layout";
import type {
  ComposerSceneDocument,
  SceneBinding,
  SceneObject,
} from "@/features/scene-composer/types/scene-composer.types";
import {
  GNN_BROADCAST_PACKAGE_ID,
  GNN_MASTER_SCENE_CODES,
  GNN_VARIABLES,
  type GnnMasterSceneDefinition,
  type GnnSceneDraft,
} from "@/features/scene-composer/constants/gnn-broadcast-package.constants";
import { GNN_001_SKELETON_VERSION } from "@/features/scene-composer/lib/gnn-001-full-news-story-skeleton";

function uid(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function buildCoreBindings(objects: SceneObject[]) {
  const textObject = objects.find((object) => object.object_type === "text");
  const objectId = textObject?.id ?? null;

  const bindings: SceneBinding[] = GNN_VARIABLES.map((key, index) => ({
    id: uid("bind"),
    object_id: objectId,
    variable_key: key,
    binding_source: "story",
    target_property: key === "logo" ? "content.logo" : "content.text",
    token: `{{${key}}}`,
    resolved_value: "",
    auto_update: true,
    metadata: {},
    sort_order: index,
  }));
  return bindings;
}

function buildCommonDocument(
  definition: GnnMasterSceneDefinition,
): ComposerSceneDocument {
  // GNN-001 is layout-skeleton only for this step (bordered placeholders).
  if (definition.code === "GNN-001") {
    return buildGnn001SkeletonDocument(definition.defaults.duration_ms);
  }

  const objects = definition.defaults.objects.map((item, index) =>
    createSceneObject({
      objectType: item.object_type,
      name: item.name,
      durationMs: definition.defaults.duration_ms,
      sortOrder: index,
      transform: {
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
      },
      content: item.text ? { text: item.text } : {},
    }),
  );

  objects.push(
    createSceneObject({
      objectType: "ticker",
      name: "Ticker",
      durationMs: definition.defaults.duration_ms,
      sortOrder: objects.length,
      transform: { x: 0, y: 1016, width: 1920, height: 64 },
      content: { text: "{{ticker}}" },
    }),
  );

  const bindings = buildCoreBindings(objects);

  return {
    version: "2.0",
    objects,
    layers: objectsToLayers(objects),
    placeholders: [],
    variables: GNN_VARIABLES.map((key, index) => ({
      id: uid("var"),
      variable_key: key,
      label: key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
      kind: "text",
      default_value: "",
      story_field: key,
      brand_field: null,
      auto_update: true,
      metadata: {},
      sort_order: index,
    })),
    animations: [],
    bindings,
    keyframes: [],
  };
}

export const GNN_MASTER_SCENES: GnnMasterSceneDefinition[] = [
  {
    code: "GNN-001",
    name: "GNN-001 Full News Story",
    scene_type: "story",
    description:
      "Full news story layout — the active GNN broadcast working template.",
    defaults: {
      duration_ms: 12000,
      // Geometry is owned by gnn-001-full-news-story-skeleton.ts
      objects: [],
    },
  },
];

export function buildGnnBroadcastSceneDrafts(): GnnSceneDraft[] {
  return GNN_MASTER_SCENES.map((definition, index) => {
    const composer_document = buildCommonDocument(definition);
    const responsive_documents = buildAllResponsiveVariants(composer_document);

    return {
      scene_type: definition.scene_type,
      name: definition.name,
      description: definition.description,
      duration_ms: definition.defaults.duration_ms,
      composer_document,
      responsive_documents,
      metadata: {
        package_id: GNN_BROADCAST_PACKAGE_ID,
        package_version: "1.0.0",
        package_code: GNN_MASTER_SCENE_CODES[index],
        ai_ready: true,
        editable: true,
        ...(definition.code === "GNN-001"
          ? {
              layout_mode: "skeleton",
              layout_skeleton_version: GNN_001_SKELETON_VERSION,
            }
          : {}),
      },
    };
  });
}
