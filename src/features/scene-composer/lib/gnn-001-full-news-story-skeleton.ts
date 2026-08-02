/**
 * GNN-001 Full News Story — layout skeleton only.
 * 1920×1080 bordered placeholder regions. No colors, gradients, shadows, fonts, or animations.
 */

import { createSceneObject, objectsToLayers } from "@/features/scene-composer/lib/object-factory";
import {
  buildGnn001BackgroundObjectTree,
  createGnn001BackgroundObject,
} from "@/features/scene-composer/lib/gnn-001-background.factory";
import { GNN_001_BACKGROUND_COMPONENT_SLUG } from "@/features/scene-composer/lib/gnn-001-background.constants";
import {
  buildGnn001FrameObjectTree,
  createGnn001FrameObjects,
} from "@/features/scene-composer/lib/gnn-001-frame.factory";
import { GNN_001_FRAME_DEFINITIONS } from "@/features/scene-composer/lib/gnn-001-frame.constants";
import {
  buildGnn001MainVideoObjectTree,
  createGnn001MainVideoContainerObject,
} from "@/features/scene-composer/lib/gnn-001-main-video.factory";
import { GNN_001_MAIN_VIDEO_CONTAINER_SLUG } from "@/features/scene-composer/lib/gnn-001-main-video.constants";
import {
  GNN_001_OBJECT_IDS,
  type Gnn001ObjectKey,
} from "@/features/scene-composer/lib/gnn-001-object-ids";
import {
  EDGE_SWEEP_PRESETS,
  ensureEdgeSweepDemo,
} from "@/features/scene-composer/lib/edge-sweep";
import { ensureObjectMotionDefaults } from "@/features/scene-composer/lib/motion-animation/engine";
import { storyTokensForRegion } from "@/features/story-production/lib/story-binding-engine";
import type {
  ComposerSceneDocument,
  SceneObject,
} from "@/features/scene-composer/types/scene-composer.types";
import type { SceneComponentKind } from "@/features/scene-composer/types/scene-composer.types";
import { GNN_VARIABLES } from "@/features/scene-composer/constants/gnn-broadcast-package.constants";

export const GNN_001_SKELETON_VERSION = "gnn-001-skeleton-v22";
export const GNN_001_CANVAS = { width: 1920, height: 1080 } as const;

type SkeletonRegion = {
  key: string;
  name: string;
  label: string;
  object_type: SceneObject["object_type"];
  x: number;
  y: number;
  width: number;
  height: number;
  component_slug: string;
};

/** Absolute layout for 1920×1080 matching the GNN-001 reference composition. */
export const GNN_001_SKELETON_REGIONS: SkeletonRegion[] = [
  {
    key: "left-side-panel",
    name: "Left Side Panel",
    label: "Left Side Panel",
    object_type: "rectangle",
    x: 40,
    y: 96,
    width: 480,
    height: 616,
    component_slug: "gnn-001-left-side-panel",
  },
  {
    key: "reporter-logo",
    name: "Reporter/Logo Placeholder",
    label: "Reporter / Logo",
    object_type: "image",
    x: 72,
    y: 128,
    width: 416,
    height: 231,
    component_slug: "gnn-001-reporter-logo",
  },
  {
    key: "optional-info-2",
    name: "Optional Information Area 2",
    label: "Optional Information Area 2",
    object_type: "image",
    x: 72,
    y: 392,
    width: 416,
    height: 294,
    component_slug: "gnn-001-optional-info",
  },
  {
    key: "main-video",
    name: "Main Video",
    label: "Main Video",
    object_type: "video",
    // ~70% width (1344); height reduced to clear expanded lower info panel.
    x: 560,
    y: 96,
    width: 1344,
    height: 616,
    component_slug: "gnn-001-main-video",
  },
  {
    key: "lower-info-panel",
    name: "Lower Information Panel",
    label: "Lower Information Panel",
    object_type: "rectangle",
    x: 40,
    y: 728,
    width: 1840,
    height: 280,
    component_slug: "gnn-001-lower-info-panel",
  },
  {
    key: "headline",
    name: "Headline",
    label: "Headline",
    object_type: "text",
    x: 72,
    y: 804,
    width: 1320,
    height: 72,
    component_slug: "gnn-001-headline",
  },
  {
    key: "subheadline",
    name: "Subheadline",
    label: "Subheadline",
    object_type: "text",
    x: 72,
    y: 886,
    width: 1320,
    height: 52,
    component_slug: "gnn-001-subheadline",
  },
  {
    key: "ticker",
    name: "Ticker",
    label: "Ticker",
    object_type: "ticker",
    x: 0,
    y: 1020,
    width: 1920,
    height: 60,
    component_slug: "gnn-001-ticker",
  },
  {
    key: "meta-info-bar",
    name: "Date / Time / Place",
    label: "Date / Time / Place",
    object_type: "text",
    x: 1504,
    y: 28,
    width: 376,
    height: 44,
    component_slug: "gnn-001-meta-info-bar",
  },
];

export const GNN_001_SKELETON_COMPONENTS: Array<{
  slug: string;
  name: string;
  component_kind: SceneComponentKind;
  regionKeys: string[];
}> = [
  {
    slug: "gnn-001-main-video",
    name: "GNN-001 Main Video",
    component_kind: "custom",
    regionKeys: ["main-video"],
  },
  {
    slug: "gnn-001-left-side-panel",
    name: "GNN-001 Left Side Panel",
    component_kind: "custom",
    regionKeys: [
      "left-side-panel",
      "reporter-logo",
      "optional-info-2",
    ],
  },
  {
    slug: "gnn-001-reporter-logo",
    name: "GNN-001 Reporter/Logo",
    component_kind: "logo",
    regionKeys: ["reporter-logo"],
  },
  {
    slug: "gnn-001-optional-info",
    name: "GNN-001 Optional Information",
    component_kind: "custom",
    regionKeys: ["optional-info-2"],
  },
  {
    slug: "gnn-001-lower-info-panel",
    name: "GNN-001 Lower Information Panel",
    component_kind: "lower_third",
    regionKeys: ["lower-info-panel", "headline", "subheadline"],
  },
  {
    slug: "gnn-001-headline",
    name: "GNN-001 Headline",
    component_kind: "title",
    regionKeys: ["headline"],
  },
  {
    slug: "gnn-001-subheadline",
    name: "GNN-001 Subheadline",
    component_kind: "title",
    regionKeys: ["subheadline"],
  },
  {
    slug: "gnn-001-ticker",
    name: "GNN-001 Ticker",
    component_kind: "ticker",
    regionKeys: ["ticker"],
  },
  {
    slug: "gnn-001-meta-info-bar",
    name: "GNN-001 Meta Info Bar",
    component_kind: "custom",
    regionKeys: ["meta-info-bar"],
  },
];

function createSkeletonObject(
  region: SkeletonRegion,
  durationMs: number,
  sortOrder: number,
  idOverride?: string | null,
): SceneObject {
  const tokens = storyTokensForRegion(region.key);
  const object = createSceneObject({
    objectType: region.object_type,
    name: region.name,
    durationMs,
    sortOrder,
    transform: {
      x: region.x,
      y: region.y,
      width: region.width,
      height: region.height,
    },
    content: {
      text: tokens.text,
      // Story-driven — no static placeholder copy in content.
      bound: true,
    },
  });

  const stableId =
    idOverride === null
      ? object.id
      : (idOverride ??
        GNN_001_OBJECT_IDS[region.key as Gnn001ObjectKey] ??
        object.id);

  return ensureObjectMotionDefaults({
    ...object,
    id: stableId,
    layer_color: "#FFFFFF",
    style: {
      fill:
        region.key === "lower-info-panel"
          ? "#FFFFFF"
          : "transparent",
      corner_radius:
        region.key === "meta-info-bar"
          ? 10
          : 0,
      border_width: region.key === "meta-info-bar" ? 0 : 1,
      border_color:
        region.key === "lower-info-panel"
          ? "rgba(0,0,0,0.08)"
          : region.key === "meta-info-bar"
            ? "transparent"
          : "#FFFFFF",
      border_style: "solid",
      font_size:
        region.key === "headline"
          ? 48
          : region.key === "subheadline"
            ? 28
            : region.key === "place"
              ? 24
              : 22,
      font_weight: region.key === "headline" ? 800 : region.key === "place" ? 700 : 600,
      color:
        region.key === "headline" || region.key === "subheadline"
          ? "#000000"
          : region.key === "meta-info-bar"
            ? "#FFFFFF"
          : "#FFFFFF",
      alignment:
        region.key === "headline" || region.key === "subheadline"
          ? "left"
          : region.key === "meta-info-bar"
            ? "right"
          : region.key === "clock" || region.key === "date" || region.key === "place"
            ? "right"
          : undefined,
      vertical_alignment:
        region.key === "headline" || region.key === "subheadline"
          ? "center"
          : undefined,
    },
    bindings: {
      ...tokens.bindings,
      story_field:
        tokens.bindings.src?.replace(/^\{\{|\}\}$/g, "") ||
        tokens.text.replace(/^\{\{|\}\}$/g, "") ||
        "",
    },
    metadata: {
      skeleton: true,
      layout_mode: "skeleton",
      placeholder_label: region.label,
      component_slug: region.component_slug,
      region_key: region.key,
      story_bound: true,
      story_engine_version: "3.7",
    },
  });
}

export function buildGnn001SkeletonObjects(durationMs = 12000): SceneObject[] {
  // Layer 1 background → Layer 2 frames → Layer 3 main video → layout placeholders.
  const background = ensureObjectMotionDefaults(
    createGnn001BackgroundObject(durationMs),
  );
  const frames = createGnn001FrameObjects(durationMs).map((frame) =>
    ensureObjectMotionDefaults(frame),
  );
  const broadcastBlue =
    EDGE_SWEEP_PRESETS.find((p) => p.id === "edge.broadcast-blue")?.config ??
    EDGE_SWEEP_PRESETS[0].config;
  const premiumWhite =
    EDGE_SWEEP_PRESETS.find((p) => p.id === "edge.premium-white")?.config ??
    EDGE_SWEEP_PRESETS[1].config;

  const mainVideo = ensureEdgeSweepDemo(
    ensureObjectMotionDefaults(
      createGnn001MainVideoContainerObject(durationMs, frames.length + 1),
    ),
    broadcastBlue,
  );
  const baseOrder = frames.length + 2;
  const regions = GNN_001_SKELETON_REGIONS.map((region, index) => {
    const object = createSkeletonObject(region, durationMs, baseOrder + index);
    if (region.key === "lower-info-panel") {
      return ensureEdgeSweepDemo(object, premiumWhite);
    }
    return object;
  });
  return [background, ...frames, mainVideo, ...regions];
}

export function buildGnn001SkeletonDocument(
  durationMs = 12000,
): ComposerSceneDocument {
  const objects = buildGnn001SkeletonObjects(durationMs);

  return {
    version: "2.0",
    objects,
    layers: objectsToLayers(objects),
    placeholders: [],
    variables: GNN_VARIABLES.map((key, index) => ({
      id: `var-gnn001-${key}`,
      variable_key: key,
      label: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      kind: "text",
      default_value: "",
      story_field: key,
      brand_field: null,
      auto_update: true,
      metadata: {},
      sort_order: index,
    })),
    animations: [],
    bindings: [],
    keyframes: [],
  };
}

export function buildGnn001ComponentObjectTree(slug: string) {
  if (slug === GNN_001_BACKGROUND_COMPONENT_SLUG) {
    return buildGnn001BackgroundObjectTree();
  }

  if (slug === GNN_001_MAIN_VIDEO_CONTAINER_SLUG) {
    return buildGnn001MainVideoObjectTree();
  }

  if (GNN_001_FRAME_DEFINITIONS.some((frame) => frame.slug === slug)) {
    return buildGnn001FrameObjectTree(slug);
  }

  const definition = GNN_001_SKELETON_COMPONENTS.find((c) => c.slug === slug);
  if (!definition) return [];

  const regions = GNN_001_SKELETON_REGIONS.filter((r) =>
    definition.regionKeys.includes(r.key),
  );
  if (regions.length === 0) return [];

  const originX = Math.min(...regions.map((r) => r.x));
  const originY = Math.min(...regions.map((r) => r.y));

  return regions.map((region, index) => ({
    ...createSkeletonObject(
      {
        ...region,
        x: region.x - originX,
        y: region.y - originY,
      },
      12000,
      index,
      null,
    ),
  }));
}
