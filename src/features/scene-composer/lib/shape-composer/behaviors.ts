import type {
  ShapeBehaviorConfig,
  ShapeBehaviorType,
  ShapeComposerConfig,
} from "@/features/scene-composer/lib/shape-composer/types";

export type SampledShapeBehaviorStyle = {
  /** 0–1 progress of the dominant behavior. */
  progress: number;
  opacity: number;
  scaleX: number;
  scaleY: number;
  translateX: number;
  translateY: number;
  clipPath?: string;
  strokeDasharray?: string;
  strokeDashoffset?: number;
  transformOrigin: string;
  lightSweepProgress?: number;
  lightSweepOpacity?: number;
  activeTypes: ShapeBehaviorType[];
};

const DEFAULT_SAMPLE: SampledShapeBehaviorStyle = {
  progress: 1,
  opacity: 1,
  scaleX: 1,
  scaleY: 1,
  translateX: 0,
  translateY: 0,
  transformOrigin: "center center",
  activeTypes: [],
};

function behaviorProgress(
  behavior: ShapeBehaviorConfig,
  timeMs: number,
): { progress: number; active: boolean } {
  if (!behavior.enabled) return { progress: 1, active: false };
  const duration = Math.max(200, behavior.durationMs / Math.max(0.05, behavior.speed));
  const delay = Math.max(0, behavior.delayMs);
  const cycle = duration + (behavior.loop ? delay : 0);
  const local = behavior.loop
    ? (timeMs % Math.max(1, cycle + delay)) - delay
    : timeMs - delay;
  if (local < 0) return { progress: 0, active: true };
  if (!behavior.loop && local >= duration) return { progress: 1, active: false };
  const raw = Math.min(1, Math.max(0, local / duration));
  // Smoothstep for broadcast-friendly motion.
  const progress = raw * raw * (3 - 2 * raw);
  return { progress, active: true };
}

/**
 * Sample shape behaviors at an absolute clock time (ms).
 * Used by ShapeRenderer for live preview / playback.
 */
export function sampleShapeBehaviors(
  config: ShapeComposerConfig,
  timeMs: number,
  _box?: { width: number; height: number },
): SampledShapeBehaviorStyle {
  const behaviors = (config.behaviors ?? []).filter((b) => b.enabled);
  if (!config.enabled || behaviors.length === 0) {
    return DEFAULT_SAMPLE;
  }

  let opacity = 1;
  let scaleX = 1;
  let scaleY = 1;
  let translateX = 0;
  let translateY = 0;
  let clipPath: string | undefined;
  let strokeDasharray: string | undefined;
  let strokeDashoffset: number | undefined;
  let transformOrigin = "center center";
  let lightSweepProgress: number | undefined;
  let lightSweepOpacity: number | undefined;
  let progress = 1;
  const activeTypes: ShapeBehaviorType[] = [];
  // Normalized path length used with SVG pathLength={1000} in ShapeRenderer.
  const PATH_LEN = 1000;

  for (const behavior of behaviors) {
    const sampled = behaviorProgress(behavior, timeMs);
    if (!sampled.active && sampled.progress >= 1 && !behavior.loop) {
      // Finished one-shot — keep resting pose contributions below.
    }
    activeTypes.push(behavior.type);
    progress = Math.min(progress, sampled.progress);
    const p = sampled.progress;

    switch (behavior.type) {
      case "draw_on":
      case "border_build":
      case "outline_sweep":
      case "trace":
      case "edge_sweep": {
        // Draw the stroke on as progress advances (dashoffset → 0).
        strokeDasharray = `${PATH_LEN}`;
        strokeDashoffset = PATH_LEN * (1 - p);
        if (behavior.type === "draw_on" || behavior.type === "border_build") {
          opacity = Math.min(opacity, 0.35 + p * 0.65);
        }
        break;
      }
      case "corner_build": {
        const inset = (1 - p) * 50;
        clipPath = `inset(${inset}% ${inset}% ${inset}% ${inset}% round 12px)`;
        opacity = Math.min(opacity, 0.4 + p * 0.6);
        break;
      }
      case "panel_grow": {
        scaleX = Math.min(scaleX, 0.15 + p * 0.85);
        scaleY = Math.min(scaleY, 0.15 + p * 0.85);
        transformOrigin = "center bottom";
        opacity = Math.min(opacity, 0.25 + p * 0.75);
        break;
      }
      case "ribbon_expand": {
        scaleX = Math.min(scaleX, p);
        transformOrigin = "left center";
        opacity = Math.min(opacity, 0.3 + p * 0.7);
        break;
      }
      case "morph": {
        const pulse = 1 + Math.sin(p * Math.PI * 2) * 0.04;
        scaleX = Math.min(scaleX, pulse);
        scaleY = Math.min(scaleY, pulse);
        break;
      }
      case "split": {
        const gap = (1 - p) * 40;
        clipPath = `inset(0 ${gap}% 0 ${gap}%)`;
        break;
      }
      case "merge": {
        const gap = p * 40;
        clipPath = `inset(0 ${Math.max(0, 40 - gap)}% 0 ${Math.max(0, 40 - gap)}%)`;
        scaleX = Math.min(scaleX, 0.7 + p * 0.3);
        break;
      }
      case "light_sweep": {
        lightSweepProgress = p;
        lightSweepOpacity = 0.25 + (sampled.active || behavior.loop ? 0.55 : 0);
        break;
      }
      default:
        break;
    }
  }

  return {
    progress,
    opacity,
    scaleX,
    scaleY,
    translateX,
    translateY,
    clipPath,
    strokeDasharray,
    strokeDashoffset,
    transformOrigin,
    lightSweepProgress,
    lightSweepOpacity,
    activeTypes,
  };
}

export function createShapeBehavior(
  type: ShapeBehaviorType,
  partial?: Partial<ShapeBehaviorConfig>,
): ShapeBehaviorConfig {
  const looping = [
    "trace",
    "outline_sweep",
    "edge_sweep",
    "light_sweep",
    "morph",
  ].includes(type);
  return {
    type,
    enabled: true,
    durationMs: looping ? 1600 : 900,
    delayMs: 0,
    speed: 1,
    loop: looping,
    ...partial,
  };
}
