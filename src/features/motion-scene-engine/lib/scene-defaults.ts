import {
  ASPECT_DIMENSIONS,
  SCENE_VARIABLE_TOKENS,
} from "@/features/motion-scene-engine/constants/motion-scene.constants";
import type {
  MotionScene,
  MotionSceneDocument,
  MotionSceneType,
  MotionSceneWithRelations,
  SceneAspectFormat,
  SceneCanvas,
  SceneLayer,
  ScenePlaceholder,
  SceneVariable,
} from "@/features/motion-scene-engine/types/motion-scene.types";

function uid(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function createDefaultCanvas(
  aspect: SceneAspectFormat = "16:9",
): SceneCanvas {
  const dims = ASPECT_DIMENSIONS[aspect];
  return {
    width: dims.width,
    height: dims.height,
    background: "#0B1220",
    safe_area: { top: 48, right: 48, bottom: 48, left: 48 },
    grid: { enabled: true, size: 16 },
    guides: [],
  };
}

export function createEmptySceneDocument(): MotionSceneDocument {
  return {
    version: "1.0",
    layers: [],
    placeholders: [],
    variables: [],
    animations: [],
  };
}

export function createDefaultPlaceholders(): ScenePlaceholder[] {
  return SCENE_VARIABLE_TOKENS.slice(0, 8).map((token, index) => ({
    id: uid("ph"),
    placeholder_kind: token.key as ScenePlaceholder["placeholder_kind"],
    variable_key: token.key,
    label: token.label,
    default_value: "",
    token: token.token,
    binding_source: "story",
    constraints: {},
    metadata: { auto_update: true },
    sort_order: index,
  }));
}

export function createDefaultVariables(): SceneVariable[] {
  return SCENE_VARIABLE_TOKENS.map((token, index) => ({
    id: uid("var"),
    variable_key: token.key,
    label: token.label,
    kind: "text",
    default_value: "",
    story_field: token.key,
    brand_field: null,
    auto_update: true,
    metadata: {},
    sort_order: index,
  }));
}

export function createStarterLayer(
  sceneType: MotionSceneType,
  canvas: SceneCanvas,
): SceneLayer {
  const isLowerThird = sceneType === "lower_third" || sceneType === "reporter";
  return {
    id: uid("layer"),
    name: isLowerThird ? "Lower Third Bar" : "Background",
    layer_type: isLowerThird ? "rectangle" : "gradient",
    sort_order: 0,
    start_ms: 0,
    end_ms: 5000,
    offset_ms: 0,
    visible: true,
    locked: false,
    transform: {
      x: isLowerThird ? 80 : 0,
      y: isLowerThird ? canvas.height - 160 : 0,
      scale: 1,
      rotation: 0,
      opacity: 1,
    },
    style: {
      fill: isLowerThird ? "rgba(15,23,42,0.92)" : "linear-gradient(180deg,#0B1220,#1E293B)",
      corner_radius: isLowerThird ? 8 : 0,
    },
    content: {},
    metadata: {},
  };
}

export function createHeadlineLayer(canvas: SceneCanvas): SceneLayer {
  return {
    id: uid("layer"),
    name: "Headline Placeholder",
    layer_type: "text",
    sort_order: 1,
    start_ms: 0,
    end_ms: 5000,
    offset_ms: 0,
    visible: true,
    locked: false,
    transform: {
      x: 120,
      y: canvas.height - 130,
      scale: 1,
      rotation: 0,
      opacity: 1,
    },
    style: {
      font_family: "Noto Sans Malayalam",
      font_size: 32,
      font_weight: 700,
      color: "#FFFFFF",
      unicode_script: "malayalam",
      input_mode: "unicode",
    },
    content: { text: "{{headline}}" },
    metadata: { placeholder_key: "headline" },
  };
}

export function buildNewMotionScene(input: {
  sceneType: MotionSceneType;
  name: string;
  aspectFormat?: SceneAspectFormat;
  durationMs?: number;
}): Pick<
  MotionScene,
  | "scene_type"
  | "name"
  | "aspect_format"
  | "duration_ms"
  | "canvas"
  | "scene_document"
  | "timeline"
  | "transitions"
  | "preview"
  | "properties"
  | "resolved_bindings"
> {
  const aspect = input.aspectFormat ?? "16:9";
  const canvas = createDefaultCanvas(aspect);
  const baseLayer = createStarterLayer(input.sceneType, canvas);
  const layers: SceneLayer[] = [baseLayer];

  if (
    ["headline", "breaking_news", "lower_third", "reporter", "story"].includes(
      input.sceneType,
    )
  ) {
    layers.push(createHeadlineLayer(canvas));
  }

  const placeholders = createDefaultPlaceholders();
  const variables = createDefaultVariables();
  const duration = input.durationMs ?? 5000;

  for (const layer of layers) {
    layer.end_ms = duration;
  }

  return {
    scene_type: input.sceneType,
    name: input.name,
    aspect_format: aspect,
    duration_ms: duration,
    canvas,
    properties: { theme_tokens: {} },
    timeline: { duration_ms: duration, markers: [], tracks: [] },
    transitions: { in: null, out: null },
    preview: { playhead_ms: 0, loop: false, safe_area_visible: true },
    resolved_bindings: {},
    scene_document: {
      version: "1.0",
      layers,
      placeholders,
      variables,
      animations: [],
    },
  };
}

export function toMotionSceneWithRelations(
  scene: MotionScene,
): MotionSceneWithRelations {
  const doc = scene.scene_document;
  return {
    ...scene,
    tags: (scene.metadata.tags as string[] | undefined) ?? [],
    layers: doc.layers,
    placeholders: doc.placeholders,
    variables: doc.variables,
    animations: doc.animations,
  };
}

export function exportSceneJson(scene: MotionSceneWithRelations) {
  return {
    id: scene.id,
    version: scene.version,
    scene_type: scene.scene_type,
    name: scene.name,
    aspect_format: scene.aspect_format,
    theme_mode: scene.theme_mode,
    duration_ms: scene.duration_ms,
    canvas: scene.canvas,
    properties: scene.properties,
    timeline: scene.timeline,
    transitions: scene.transitions,
    preview: scene.preview,
    scene_document: scene.scene_document,
    resolved_bindings: scene.resolved_bindings,
    metadata: scene.metadata,
  };
}
