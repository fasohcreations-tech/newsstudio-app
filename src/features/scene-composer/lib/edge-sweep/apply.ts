import { createDefaultEdgeSweep } from "@/features/scene-composer/lib/edge-sweep/defaults";
import type {
  EdgeSweepConfig,
  EdgeSweepPreset,
} from "@/features/scene-composer/lib/edge-sweep/types";
import {
  BEHAVIORS_METADATA_KEY,
  EDGE_SWEEP_BEHAVIOR_KEY,
} from "@/features/scene-composer/lib/edge-sweep/types";
import type { SceneObject } from "@/features/scene-composer/types/scene-composer.types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function getEdgeSweepConfig(object: SceneObject): EdgeSweepConfig {
  const behaviors = object.metadata?.[BEHAVIORS_METADATA_KEY];
  if (!isRecord(behaviors)) return createDefaultEdgeSweep();
  const raw = behaviors[EDGE_SWEEP_BEHAVIOR_KEY];
  if (!isRecord(raw)) return createDefaultEdgeSweep();
  return createDefaultEdgeSweep(raw as Partial<EdgeSweepConfig>);
}

export function setEdgeSweepConfig(
  object: SceneObject,
  config: EdgeSweepConfig,
): SceneObject {
  const prev = isRecord(object.metadata?.[BEHAVIORS_METADATA_KEY])
    ? { ...(object.metadata?.[BEHAVIORS_METADATA_KEY] as Record<string, unknown>) }
    : {};

  return {
    ...object,
    metadata: {
      ...object.metadata,
      [BEHAVIORS_METADATA_KEY]: {
        ...prev,
        version: 1,
        [EDGE_SWEEP_BEHAVIOR_KEY]: config,
      },
    },
  };
}

export function patchEdgeSweepConfig(
  object: SceneObject,
  patch: Partial<EdgeSweepConfig>,
): SceneObject {
  const current = getEdgeSweepConfig(object);
  return setEdgeSweepConfig(object, { ...current, ...patch, version: 1 });
}

export function applyEdgeSweepPreset(
  object: SceneObject,
  preset: EdgeSweepPreset,
): SceneObject {
  return setEdgeSweepConfig(object, {
    ...preset.config,
    version: 1,
    enabled: true,
  });
}

function hasExplicitEdgeSweepConfig(object: SceneObject): boolean {
  const behaviors = object.metadata?.[BEHAVIORS_METADATA_KEY];
  if (!isRecord(behaviors)) return false;
  return isRecord(behaviors[EDGE_SWEEP_BEHAVIOR_KEY]);
}

/**
 * Attach demo Edge Sweep only when the object has no stored edge_sweep config.
 * Respects an explicit enabled:false from the Behaviors toggle.
 */
export function ensureEdgeSweepDemo(
  object: SceneObject,
  config: EdgeSweepConfig,
): SceneObject {
  if (hasExplicitEdgeSweepConfig(object)) return object;
  return setEdgeSweepConfig(object, { ...config, enabled: true });
}

function isMainVideoEdgeDemoTarget(object: SceneObject) {
  return (
    object.metadata?.layer === "main_video_container" ||
    object.metadata?.component_slug === "gnn-001-main-video-container" ||
    object.name === "Main Video Container"
  );
}

function isLowerPanelEdgeDemoTarget(object: SceneObject) {
  return (
    object.metadata?.region_key === "lower-info-panel" ||
    object.metadata?.component_slug === "gnn-001-lower-info-panel" ||
    object.name === "Lower Info Panel" ||
    object.name === "Lower Information Panel"
  );
}

export function needsGnn001EdgeSweepDemoPatch(objects: SceneObject[]): boolean {
  return objects.some(
    (object) =>
      (isMainVideoEdgeDemoTarget(object) || isLowerPanelEdgeDemoTarget(object)) &&
      !hasExplicitEdgeSweepConfig(object),
  );
}

/**
 * Ensures GNN demo Edge Sweep exists on Main Video / Lower Info Panel when
 * those layers have no stored edge_sweep config yet.
 * Identity-stable when demos are already present (avoids remount thrash).
 * Never overrides an explicit Behaviors toggle (including enabled:false).
 */
export function patchGnn001EdgeSweepDemos(
  objects: SceneObject[],
): SceneObject[] {
  if (!needsGnn001EdgeSweepDemoPatch(objects)) return objects;

  const broadcastBlue = createDefaultEdgeSweep({
    enabled: true,
    style: "broadcast_blue",
    color: "#5B8DEF",
    width: 3,
    length: 0.2,
    brightness: 1.2,
    opacity: 1,
    speed: 0.35,
    glowIntensity: 0.55,
    blendMode: "normal",
  });
  const lowerThird = createDefaultEdgeSweep({
    enabled: true,
    style: "single",
    color: "#1D4ED8",
    width: 2.75,
    length: 0.18,
    brightness: 1.1,
    opacity: 0.95,
    speed: 0.3,
    glowIntensity: 0.4,
    blendMode: "normal",
  });

  let changed = false;
  const next = objects.map((object) => {
    if (isMainVideoEdgeDemoTarget(object)) {
      const patched = ensureEdgeSweepDemo(object, broadcastBlue);
      if (patched !== object) changed = true;
      return patched;
    }
    if (isLowerPanelEdgeDemoTarget(object)) {
      const patched = ensureEdgeSweepDemo(object, lowerThird);
      if (patched !== object) changed = true;
      return patched;
    }
    return object;
  });
  return changed ? next : objects;
}

export function resolveCornerRadius(
  object: SceneObject,
  config: EdgeSweepConfig,
): number {
  if (config.cornerStyle === "sharp") return 0;
  if (typeof config.cornerRadius === "number") {
    return Math.max(0, config.cornerRadius);
  }
  return Math.max(0, Number(object.style.corner_radius ?? 0));
}

/** Approximate perimeter of a rounded rectangle. */
export function roundedRectPerimeter(
  width: number,
  height: number,
  radius: number,
): number {
  const r = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
  return 2 * (width + height - 2 * r) + 2 * Math.PI * r;
}
