/**
 * GNN-001 Layer 2 — Broadcast Frame factories & component records.
 */

import { createSceneObject } from "@/features/scene-composer/lib/object-factory";
import {
  GNN_001_FRAME_DEFAULTS,
  GNN_001_FRAME_DEFINITIONS,
  GNN_001_FRAME_EDITABLE_PROPERTIES,
  GNN_001_FRAME_LAYER_VERSION,
  type Gnn001FrameDefinition,
} from "@/features/scene-composer/lib/gnn-001-frame.constants";
import type { SceneObject } from "@/features/scene-composer/types/scene-composer.types";

/** Deterministic UUIDs for frame objects (a1000001-0002-…). */
export const GNN_001_FRAME_OBJECT_IDS: Record<string, string> = {
  composition: "a1000001-0002-4000-8000-000000000001",
  header: "a1000001-0002-4000-8000-000000000002",
  reporter: "a1000001-0002-4000-8000-000000000003",
  main_video: "a1000001-0002-4000-8000-000000000004",
  lower_info: "a1000001-0002-4000-8000-000000000005",
  ticker: "a1000001-0002-4000-8000-000000000006",
  clock_panel: "a1000001-0002-4000-8000-000000000007",
  live_indicator: "a1000001-0002-4000-8000-000000000008",
};

function isEnabledFrame(definition: Gnn001FrameDefinition): boolean {
  // Header / live strip / clock panel removed from current GNN-001 layout.
  return (
    definition.key !== "header" &&
    definition.key !== "live_indicator" &&
    definition.key !== "clock_panel"
  );
}

function createFrameObject(
  definition: Gnn001FrameDefinition,
  durationMs: number,
  sortOrder: number,
): SceneObject {
  const object = createSceneObject({
    objectType: "component",
    name: definition.name,
    durationMs,
    sortOrder,
    transform: {
      x: definition.x,
      y: definition.y,
      width: definition.width,
      height: definition.height,
    },
    content: {
      ...GNN_001_FRAME_DEFAULTS,
      frame_kind: definition.key,
      composition_border: Boolean(definition.composition_border),
      live_indicator: Boolean(definition.live_indicator),
      hide_chrome: true,
      glass: false,
      accent_strip: false,
      corner_marks: false,
      ...(definition.key === "lower_info" ? { solid_fill: "#FFFFFF" } : {}),
    },
  });

  return {
    ...object,
    id: GNN_001_FRAME_OBJECT_IDS[definition.key] ?? object.id,
    layer_color: "#93C5FD",
    locked: false,
    style: {
      fill: "transparent",
      corner_radius: GNN_001_FRAME_DEFAULTS.border_radius,
    },
    bindings: {
      border_color: "{{frame_border_color}}",
      border_width: "{{frame_border_width}}",
      border_radius: "{{frame_border_radius}}",
      glass_opacity: "{{frame_glass_opacity}}",
      shadow_strength: "{{frame_shadow_strength}}",
      accent_color: "{{frame_accent_color}}",
      accent_width: "{{frame_accent_width}}",
    },
    metadata: {
      component_slug: definition.slug,
      component_kind: "custom",
      layer: "frames",
      layer_index: 2,
      frame_kind: definition.key,
      reusable: true,
      editable_properties: [...GNN_001_FRAME_EDITABLE_PROPERTIES],
      frame_version: GNN_001_FRAME_LAYER_VERSION,
      skeleton: false,
    },
  };
}

export function createGnn001FrameObjects(durationMs = 12000): SceneObject[] {
  // Sort after background (0), before skeleton placeholders.
  return GNN_001_FRAME_DEFINITIONS.filter(isEnabledFrame).map((definition, index) =>
    createFrameObject(definition, durationMs, index + 1),
  );
}

export function buildGnn001FrameObjectTree(slug: string): SceneObject[] {
  const definition = GNN_001_FRAME_DEFINITIONS.find((item) => item.slug === slug);
  if (!definition || !isEnabledFrame(definition)) return [];
  const object = createFrameObject(definition, 12000, 0);
  return [
    {
      ...object,
      id: object.id,
      transform: {
        ...object.transform,
        x: 0,
        y: 0,
      },
    },
  ];
}

export function buildGnn001FrameComponentRecords() {
  return GNN_001_FRAME_DEFINITIONS.filter(isEnabledFrame).map((definition) => ({
    slug: definition.slug,
    name: definition.name,
    component_kind: "custom" as const,
    description:
      "GNN-001 Layer 2 broadcast frame — editable chrome, glass, and accent strip.",
    object_tree: buildGnn001FrameObjectTree(definition.slug),
    default_bindings: {
      frame_border_color: GNN_001_FRAME_DEFAULTS.border_color,
      frame_border_width: String(GNN_001_FRAME_DEFAULTS.border_width),
      frame_border_radius: String(GNN_001_FRAME_DEFAULTS.border_radius),
      frame_glass_opacity: String(GNN_001_FRAME_DEFAULTS.glass_opacity),
      frame_shadow_strength: String(GNN_001_FRAME_DEFAULTS.shadow_strength),
      frame_accent_color: GNN_001_FRAME_DEFAULTS.accent_color,
      frame_accent_width: String(GNN_001_FRAME_DEFAULTS.accent_width),
    },
    metadata: {
      package_id: "gnn-broadcast-v1",
      editable: true,
      ai_ready: true,
      layer: "frames",
      layer_index: 2,
      frame_kind: definition.key,
      frame_version: GNN_001_FRAME_LAYER_VERSION,
      editable_properties: [...GNN_001_FRAME_EDITABLE_PROPERTIES],
    },
  }));
}
