import type { SceneLayer } from "@/features/motion-scene-engine/types/motion-scene.types";
import type {
  ComposerSceneDocument,
  ComposerSettings,
  ObjectTransform,
  SceneBinding,
  SceneKeyframe,
  SceneObject,
  SceneObjectType,
} from "@/features/scene-composer/types/scene-composer.types";
import { LAYER_COLORS, SCENE_OBJECT_TYPE_LABELS } from "@/features/scene-composer/constants/scene-composer.constants";
import {
  createDefaultShapeConfig,
  shapeKindFromObjectType,
} from "@/features/scene-composer/lib/shape-composer/defaults";
import { SHAPE_METADATA_KEY } from "@/features/scene-composer/lib/shape-composer/types";

function uid(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function createDefaultComposerSettings(): ComposerSettings {
  return {
    resolution_preset: "1920x1080",
    custom_width: 1920,
    custom_height: 1080,
    background: "#0B1220",
    output_profile: "broadcast_hd",
    snap_enabled: true,
    grid_size: 16,
    rulers_visible: true,
    guides_visible: true,
  };
}

export function createDefaultTransform(
  overrides: Partial<ObjectTransform> = {},
): ObjectTransform {
  return {
    x: 120,
    y: 120,
    width: 320,
    height: 80,
    scale: 1,
    rotation: 0,
    opacity: 1,
    ...overrides,
  };
}

export function createSceneObject(input: {
  objectType: SceneObjectType;
  name?: string;
  transform?: Partial<ObjectTransform>;
  content?: Record<string, unknown>;
  durationMs?: number;
  sortOrder?: number;
}): SceneObject {
  const isText = ["text", "rich_text", "ticker"].includes(input.objectType);
  const isCircle = ["circle", "ellipse"].includes(input.objectType);
  const isShapeTool = [
    "rectangle",
    "rounded_rectangle",
    "circle",
    "ellipse",
    "line",
    "polygon",
    "gradient",
    "svg",
    "mask",
  ].includes(input.objectType);
  const shapeConfig = isShapeTool
    ? createDefaultShapeConfig(shapeKindFromObjectType(input.objectType))
    : null;

  return {
    id: uid("obj"),
    name: input.name ?? SCENE_OBJECT_TYPE_LABELS[input.objectType] ?? "Object",
    object_type: input.objectType,
    sort_order: input.sortOrder ?? 0,
    start_ms: 0,
    end_ms: input.durationMs ?? 5000,
    offset_ms: 0,
    visible: true,
    locked: false,
    layer_color: LAYER_COLORS[Math.floor(Math.random() * LAYER_COLORS.length)],
    transform: createDefaultTransform(
      isCircle
        ? { width: 120, height: 120, ...input.transform }
        : isText
          ? { width: 640, height: 96, ...input.transform }
          : input.transform,
    ),
    style: isText
      ? {
          font_family: "Noto Sans Malayalam",
          font_size: 32,
          font_weight: 700,
          color: "#FFFFFF",
          line_height: 1.35,
          letter_spacing: 0,
          alignment: "left",
          vertical_alignment: "middle",
          unicode_script: "malayalam",
          input_mode: "unicode",
          auto_resize: true,
          wrap: true,
          corner_radius: input.objectType === "rounded_rectangle" ? 12 : 4,
          fill: "rgba(15,23,42,0.92)",
        }
      : {
          fill:
            input.objectType === "gradient"
              ? "linear-gradient(180deg,#0B1220,#1E293B)"
              : shapeConfig?.fill ?? "rgba(99,102,241,0.85)",
          corner_radius:
            input.objectType === "rounded_rectangle"
              ? 12
              : shapeConfig?.cornerRadii.topLeft ?? 0,
          stroke_width: shapeConfig?.strokeWidth,
          stroke_color: shapeConfig?.strokeColor,
          stroke_style: shapeConfig?.strokeStyle,
        },
    content: input.content ?? (isText ? { text: "{{headline}}" } : {}),
    bindings: isText ? { text: "{{headline}}" } : {},
    metadata: shapeConfig
      ? { [SHAPE_METADATA_KEY]: shapeConfig }
      : {},
  };
}

export function objectToLayer(object: SceneObject): SceneLayer {
  return {
    id: object.id,
    name: object.name,
    layer_type: mapObjectTypeToLayerType(object.object_type),
    parent_layer_id: object.parent_object_id ?? null,
    sort_order: object.sort_order,
    start_ms: object.start_ms,
    end_ms: object.end_ms,
    offset_ms: object.offset_ms,
    visible: object.visible,
    locked: object.locked,
    group_id: object.component_id ?? null,
    transform: {
      x: object.transform.x,
      y: object.transform.y,
      scale: object.transform.scale,
      rotation: object.transform.rotation,
      opacity: object.transform.opacity,
    },
    style: {
      ...object.style,
      width: object.transform.width,
      height: object.transform.height,
      layer_color: object.layer_color,
    },
    content: object.content,
    metadata: {
      ...object.metadata,
      object_type: object.object_type,
      bindings: object.bindings,
    },
  };
}

export function layerToObject(layer: SceneLayer): SceneObject {
  const objectType =
    (layer.metadata.object_type as SceneObjectType | undefined) ??
    "rectangle";
  const width = Number(layer.style.width ?? 320);
  const height = Number(layer.style.height ?? 80);

  return {
    id: layer.id,
    name: layer.name,
    object_type: objectType,
    parent_object_id: layer.parent_layer_id ?? null,
    component_id: layer.group_id ?? null,
    sort_order: layer.sort_order,
    start_ms: layer.start_ms,
    end_ms: layer.end_ms,
    offset_ms: layer.offset_ms,
    visible: layer.visible,
    locked: layer.locked,
    layer_color: String(layer.style.layer_color ?? LAYER_COLORS[0]),
    transform: {
      x: layer.transform.x,
      y: layer.transform.y,
      width,
      height,
      scale: layer.transform.scale,
      rotation: layer.transform.rotation,
      opacity: layer.transform.opacity,
    },
    style: layer.style,
    content: layer.content,
    bindings:
      (layer.metadata.bindings as Record<string, string> | undefined) ?? {},
    metadata: layer.metadata,
  };
}

function mapObjectTypeToLayerType(objectType: SceneObjectType): SceneLayer["layer_type"] {
  const map: Partial<Record<SceneObjectType, SceneLayer["layer_type"]>> = {
    rectangle: "rectangle",
    rounded_rectangle: "rectangle",
    circle: "circle",
    ellipse: "circle",
    line: "line",
    gradient: "gradient",
    text: "text",
    rich_text: "text",
    image: "image",
    video: "video",
    logo: "logo",
    svg: "svg",
    ticker: "ticker_placeholder",
    clock: "clock_placeholder",
    countdown: "countdown_placeholder",
    particle_placeholder: "particle_placeholder",
    mask: "mask",
    group: "shape",
    component: "shape",
  };
  return map[objectType] ?? "rectangle";
}

export function layersToObjects(layers: SceneLayer[]): SceneObject[] {
  return layers.map(layerToObject);
}

export function objectsToLayers(objects: SceneObject[]): SceneLayer[] {
  return objects.map(objectToLayer);
}

export function upgradeToComposerDocument(
  doc: {
    version: string;
    layers: SceneLayer[];
    placeholders: ComposerSceneDocument["placeholders"];
    variables: ComposerSceneDocument["variables"];
    animations: ComposerSceneDocument["animations"];
    objects?: SceneObject[];
    bindings?: SceneBinding[];
    keyframes?: SceneKeyframe[];
  },
): ComposerSceneDocument {
  const objects =
    doc.objects && doc.objects.length > 0
      ? doc.objects
      : layersToObjects(doc.layers);

  return {
    version: "2.0",
    layers: objectsToLayers(objects),
    objects,
    placeholders: doc.placeholders,
    variables: doc.variables,
    animations: doc.animations,
    bindings: doc.bindings ?? [],
    keyframes: doc.keyframes ?? [],
  };
}

export function exportComposerJson(scene: {
  id: string;
  name: string;
  version: number;
  workflow_state?: string;
  frame_rate?: number;
  composer_settings?: ComposerSettings;
  composer_document: ComposerSceneDocument;
  canvas: unknown;
  resolved_bindings: Record<string, string>;
}) {
  return {
    id: scene.id,
    name: scene.name,
    version: scene.version,
    workflow_state: scene.workflow_state ?? "draft",
    frame_rate: scene.frame_rate ?? 30,
    composer_settings: scene.composer_settings,
    canvas: scene.canvas,
    scene_document: scene.composer_document,
    resolved_bindings: scene.resolved_bindings,
    exported_at: new Date().toISOString(),
  };
}
