/**
 * Builds the reusable GNN-001 Background Component instance + object tree.
 */

import { GNN_001_OBJECT_IDS } from "@/features/scene-composer/lib/gnn-001-object-ids";
import { createSceneObject } from "@/features/scene-composer/lib/object-factory";
import {
  GNN_001_BACKGROUND_COMPONENT_SLUG,
  GNN_001_BACKGROUND_DEFAULTS,
  GNN_001_BACKGROUND_LAYER_VERSION,
} from "@/features/scene-composer/lib/gnn-001-background.constants";
import type { SceneObject } from "@/features/scene-composer/types/scene-composer.types";

export function createGnn001BackgroundObject(durationMs = 12000): SceneObject {
  const object = createSceneObject({
    objectType: "component",
    name: "Background",
    durationMs,
    sortOrder: 0,
    transform: {
      x: 0,
      y: 0,
      width: 1920,
      height: 1080,
    },
    content: {
      ...GNN_001_BACKGROUND_DEFAULTS,
    },
  });

  return {
    ...object,
    id: GNN_001_OBJECT_IDS.background,
    layer_color: "#1D4ED8",
    locked: true,
    style: {
      fill: "transparent",
      corner_radius: 0,
    },
    bindings: {
      primary_color: "{{primary_color}}",
      secondary_color: "{{secondary_color}}",
      accent_color: "{{accent_color}}",
      world_map_opacity: "{{world_map_opacity}}",
      glow_intensity: "{{glow_intensity}}",
      grid_visibility: "{{grid_visibility}}",
    },
    metadata: {
      component_slug: GNN_001_BACKGROUND_COMPONENT_SLUG,
      component_kind: "background",
      layer: "background",
      layer_index: 1,
      reusable: true,
      editable_properties: [
        "primary_color",
        "secondary_color",
        "accent_color",
        "world_map_opacity",
        "glow_intensity",
        "grid_visibility",
      ],
      background_version: GNN_001_BACKGROUND_LAYER_VERSION,
      skeleton: false,
    },
  };
}

export function buildGnn001BackgroundObjectTree(): SceneObject[] {
  return [createGnn001BackgroundObject()];
}

export function buildGnn001BackgroundComponentRecord() {
  return {
    slug: GNN_001_BACKGROUND_COMPONENT_SLUG,
    name: "GNN-001 Background",
    component_kind: "background" as const,
    description:
      "Premium broadcast background — navy gradient, world map, glow, and grid texture.",
    object_tree: buildGnn001BackgroundObjectTree(),
    default_bindings: {
      primary_color: GNN_001_BACKGROUND_DEFAULTS.primary_color,
      secondary_color: GNN_001_BACKGROUND_DEFAULTS.secondary_color,
      accent_color: GNN_001_BACKGROUND_DEFAULTS.accent_color,
      world_map_opacity: String(GNN_001_BACKGROUND_DEFAULTS.world_map_opacity),
      glow_intensity: String(GNN_001_BACKGROUND_DEFAULTS.glow_intensity),
      grid_visibility: String(GNN_001_BACKGROUND_DEFAULTS.grid_visibility),
    },
    metadata: {
      package_id: "gnn-broadcast-v1",
      editable: true,
      ai_ready: true,
      layer: "background",
      background_version: GNN_001_BACKGROUND_LAYER_VERSION,
      editable_properties: [
        "primary_color",
        "secondary_color",
        "accent_color",
        "world_map_opacity",
        "glow_intensity",
        "grid_visibility",
      ],
    },
  };
}
