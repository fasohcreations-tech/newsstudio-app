import { getObjectEffectStack } from "@/features/scene-composer/lib/broadcast-effects/stack";
import type { SceneObject } from "@/features/scene-composer/types/scene-composer.types";

/** Coverage rect relative to the host object's top-left (scene units). */
export type EffectCoverageRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

function isLowerInfoPanelObject(object: SceneObject) {
  return (
    object.metadata?.region_key === "lower-info-panel" ||
    object.metadata?.component_slug === "gnn-001-lower-info-panel"
  );
}

function isHeadlineObject(object: SceneObject) {
  const regionKey = object.metadata?.region_key;
  if (regionKey === "headline") return true;
  if (regionKey === "subheadline") return false;
  if (object.metadata?.component_slug === "gnn-001-headline") return true;
  return (
    /headline/i.test(object.name) && !/subheadline/i.test(object.name)
  );
}

export function findLowerInfoPanelObject(
  objects: SceneObject[],
): SceneObject | undefined {
  return objects.find(isLowerInfoPanelObject);
}

/** Keep panel edge-sweep stroke clear of the headline light wash. */
const LOWER_PANEL_LIGHT_SWEEP_INSET = 8;

/**
 * Headline light sweep covers the Lower Information Panel box,
 * inset so the panel perimeter edge sweep stays visible.
 */
export function resolveHeadlineLightSweepCoverage(
  object: SceneObject,
  lowerPanel: SceneObject | null | undefined,
): EffectCoverageRect | undefined {
  if (!lowerPanel || !isHeadlineObject(object)) return undefined;

  const hasLightSweep = getObjectEffectStack(object).effects.some(
    (effect) => effect.type === "light_sweep" && effect.enabled !== false,
  );
  if (!hasLightSweep) return undefined;

  const inset = LOWER_PANEL_LIGHT_SWEEP_INSET;
  return {
    left: lowerPanel.transform.x - object.transform.x + inset,
    top: lowerPanel.transform.y - object.transform.y + inset,
    width: Math.max(1, lowerPanel.transform.width - inset * 2),
    height: Math.max(1, lowerPanel.transform.height - inset * 2),
  };
}
