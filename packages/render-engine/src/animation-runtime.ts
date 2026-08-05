/**
 * Animation Runtime — evaluates layer motion + shape behaviours from playheadMs.
 * Prefer injecting MediaOS samplers (sampleLayerMotion / sampleShapeBehaviors)
 * so Canvas and Story Preview share one motion math.
 */

import type {
  MotionSampler,
  RuntimeLayer,
  RuntimeShape,
  SampledMotion,
  ShapeSampler,
} from "./types";

export function identityMotion(layer: RuntimeLayer): SampledMotion {
  return {
    opacity: layer.transform.opacity,
    translateX: 0,
    translateY: 0,
    scale: layer.transform.scale || 1,
    rotateZ: layer.transform.rotation || 0,
    visible: layer.visible,
  };
}

/**
 * Lightweight built-in sampler used when MediaOS motion libs are not injected.
 * Enough for smoke tests; production should inject sampleLayerMotion.
 */
export function builtinMotionSampler(
  layer: RuntimeLayer,
  playheadMs: number,
): SampledMotion {
  const base = identityMotion(layer);
  const local = Math.max(0, playheadMs - layer.startMs);
  const entranceMs = 400;
  if (local < entranceMs) {
    const t = local / entranceMs;
    const eased = 1 - Math.pow(1 - t, 3);
    return {
      ...base,
      opacity: base.opacity * eased,
      translateY: (1 - eased) * 24,
      scale: 0.92 + 0.08 * eased,
    };
  }
  return base;
}

export type AnimationRuntime = {
  sampleMotion: MotionSampler;
  sampleShape: ShapeSampler;
};

export function createAnimationRuntime(opts?: {
  sampleMotion?: MotionSampler;
  sampleShape?: ShapeSampler;
}): AnimationRuntime {
  return {
    sampleMotion: opts?.sampleMotion ?? builtinMotionSampler,
    sampleShape:
      opts?.sampleShape ??
      ((layer: RuntimeLayer): RuntimeShape | null => layer.shape ?? null),
  };
}
