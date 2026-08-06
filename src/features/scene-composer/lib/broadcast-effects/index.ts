/**
 * Module 4.2 – Broadcast Effects Engine
 */

export type * from "@/features/scene-composer/lib/broadcast-effects/types";
export { EFFECTS_METADATA_KEY } from "@/features/scene-composer/lib/broadcast-effects/types";

export {
  DEFAULT_LIGHT_SWEEP,
  DEFAULT_OUTER_GLOW,
  DEFAULT_INNER_GLOW,
  DEFAULT_DROP_SHADOW,
  DEFAULT_INNER_SHADOW,
  DEFAULT_GLASS,
  EFFECT_CATALOG,
} from "@/features/scene-composer/lib/broadcast-effects/defaults";

export {
  createEmptyEffectStack,
  createEffectInstance,
  getObjectEffectStack,
  setObjectEffectStack,
  addEffect,
  removeEffect,
  duplicateEffect,
  reorderEffect,
  setEffectEnabled,
  updateEffectParams,
} from "@/features/scene-composer/lib/broadcast-effects/stack";

export {
  sampleBroadcastEffects,
  mergeSampledEffectsIntoStyle,
  type SampledBroadcastEffects,
  type BroadcastEffectOverlay,
} from "@/features/scene-composer/lib/broadcast-effects/sample";

export {
  findLowerInfoPanelObject,
  resolveHeadlineLightSweepCoverage,
  type EffectCoverageRect,
} from "@/features/scene-composer/lib/broadcast-effects/light-sweep-coverage";

export {
  GNN_001_HEADLINE_LIGHT_SWEEP_ID,
  ensureHeadlineLightSweepDemo,
  needsGnn001LightSweepDemoPatch,
  patchGnn001LightSweepDemos,
} from "@/features/scene-composer/lib/broadcast-effects/light-sweep-demo";

export {
  LIGHT_SWEEP_PATH_ANGLES,
  LIGHT_SWEEP_PATH_OPTIONS,
  normalizeLightSweepParams,
  resolveLightSweepAngle,
  lightSweepCssPosition,
  lightSweepCanvasCenter,
  angleForLightSweepPath,
} from "@/features/scene-composer/lib/broadcast-effects/resolve-light-sweep";
