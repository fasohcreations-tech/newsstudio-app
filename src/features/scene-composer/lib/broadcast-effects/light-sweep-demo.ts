/**
 * GNN-001 morning demo: Light Sweep on Headline (covers Lower Information Panel).
 * Additive only — never clears Shape Composer or other effect types.
 */

import { DEFAULT_LIGHT_SWEEP } from "@/features/scene-composer/lib/broadcast-effects/defaults";
import {
  getObjectEffectStack,
  setObjectEffectStack,
} from "@/features/scene-composer/lib/broadcast-effects/stack";
import type {
  BroadcastEffectInstance,
  LightSweepEffectParams,
} from "@/features/scene-composer/lib/broadcast-effects/types";
import type { SceneObject } from "@/features/scene-composer/types/scene-composer.types";

export const GNN_001_HEADLINE_LIGHT_SWEEP_ID = "fx-gnn001-headline-light-sweep";

const DEMO_LIGHT_SWEEP_PARAMS: LightSweepEffectParams = {
  ...DEFAULT_LIGHT_SWEEP,
  enabled: true,
  angle: 35,
  width: 22,
  opacity: 0.5,
  speed: 0.45,
  softness: 0.5,
  color: "#FFFFFF",
  repeatDelayMs: 1100,
  loop: true,
  blendMode: "screen",
  direction: "forward",
};

function isHeadlineObject(object: SceneObject) {
  const regionKey = object.metadata?.region_key;
  if (regionKey === "headline") return true;
  if (regionKey === "subheadline") return false;
  if (object.metadata?.component_slug === "gnn-001-headline") return true;
  return /headline/i.test(object.name) && !/subheadline/i.test(object.name);
}

function hasLightSweepEffect(object: SceneObject) {
  return getObjectEffectStack(object).effects.some(
    (effect) => effect.type === "light_sweep",
  );
}

/**
 * Attach Light Sweep only when Headline has no light_sweep yet.
 * Respects an explicit user effect (including disabled) so toggles are not inverted.
 */
export function ensureHeadlineLightSweepDemo(object: SceneObject): SceneObject {
  if (!isHeadlineObject(object)) return object;
  if (hasLightSweepEffect(object)) return object;

  const stack = getObjectEffectStack(object);
  const effect: BroadcastEffectInstance = {
    id: GNN_001_HEADLINE_LIGHT_SWEEP_ID,
    type: "light_sweep",
    name: "Light Sweep",
    category: "lighting",
    enabled: true,
    params: { ...DEMO_LIGHT_SWEEP_PARAMS },
  };

  return setObjectEffectStack(object, {
    ...stack,
    version: 1,
    effects: [...stack.effects, effect],
  });
}

export function needsGnn001LightSweepDemoPatch(objects: SceneObject[]): boolean {
  return objects.some(
    (object) => isHeadlineObject(object) && !hasLightSweepEffect(object),
  );
}

/**
 * Restores this-morning Light Sweep on Headline without touching Shape metadata.
 */
export function patchGnn001LightSweepDemos(
  objects: SceneObject[],
): SceneObject[] {
  if (!needsGnn001LightSweepDemoPatch(objects)) return objects;

  let changed = false;
  const next = objects.map((object) => {
    const patched = ensureHeadlineLightSweepDemo(object);
    if (patched !== object) changed = true;
    return patched;
  });
  return changed ? next : objects;
}
