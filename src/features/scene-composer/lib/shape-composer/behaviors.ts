import type {
  ShapeBehaviorConfig,
  ShapeBehaviorType,
  ShapeComposerConfig,
  ShapeTravelDirection,
} from "@/features/scene-composer/lib/shape-composer/types";

export type TravelShapeInstance = {
  id: string;
  /** Top-left X in layer-local px. */
  x: number;
  /** Top-left Y in layer-local px. */
  y: number;
  width: number;
  height: number;
  opacity: number;
  rotation: number;
  scale: number;
};

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
  /** Fill multiplier 0–1 (border_build / draw_on delay fill). */
  fillOpacity?: number;
  /** Multi-clone travel / cascade instances (layer-local px). */
  travelInstances?: TravelShapeInstance[];
  /** When true, hide the host shape (convoy replaces it). */
  hideHostShape?: boolean;
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
  fillOpacity: 1,
  activeTypes: [],
};

/** One-shot entrances — only one should drive at a time so toggles look distinct. */
export const ENTRANCE_BEHAVIOR_TYPES: ShapeBehaviorType[] = [
  "draw_on",
  "border_build",
  "corner_build",
  "panel_grow",
  "ribbon_expand",
  "split",
  "merge",
  "trace",
  "outline_sweep",
  "edge_sweep",
];

export const TRAVEL_BEHAVIOR_TYPES: ShapeBehaviorType[] = [
  "travel_across",
  "shape_cascade",
];

export function isEntranceBehaviorType(type: ShapeBehaviorType): boolean {
  return ENTRANCE_BEHAVIOR_TYPES.includes(type);
}

export function isTravelBehaviorType(type: ShapeBehaviorType): boolean {
  return TRAVEL_BEHAVIOR_TYPES.includes(type);
}

function behaviorProgress(
  behavior: ShapeBehaviorConfig,
  timeMs: number,
): { progress: number; active: boolean; raw: number } {
  if (!behavior.enabled) return { progress: 1, active: false, raw: 1 };
  const duration = Math.max(200, behavior.durationMs / Math.max(0.05, behavior.speed));
  const delay = Math.max(0, behavior.delayMs);
  const cycle = duration + (behavior.loop ? delay : 0);
  const local = behavior.loop
    ? (timeMs % Math.max(1, cycle + delay)) - delay
    : timeMs - delay;
  if (local < 0) return { progress: 0, active: true, raw: 0 };
  if (!behavior.loop && local >= duration) return { progress: 1, active: false, raw: 1 };
  const raw = Math.min(1, Math.max(0, local / duration));
  // Smoothstep for broadcast-friendly motion (travel uses raw for even spacing).
  const progress = raw * raw * (3 - 2 * raw);
  return { progress, active: true, raw };
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function edgeFade(t: number, fade = 0.14): number {
  if (t <= 0 || t >= 1) return 0;
  if (t < fade) return t / fade;
  if (t > 1 - fade) return (1 - t) / fade;
  return 1;
}

function resolveTravelParams(behavior: ShapeBehaviorConfig) {
  return {
    direction: (behavior.travelDirection ?? "right") as ShapeTravelDirection,
    count: clamp(Math.round(behavior.travelCount ?? 5), 2, 16),
    size: clamp(behavior.travelSize ?? 0.28, 0.12, 0.7),
    spread: clamp(behavior.travelSpread ?? 0.4, 0, 1),
  };
}

/**
 * Convoy: clones enter from one edge, travel across, exit the opposite edge.
 * Uses looping raw progress so spacing stays even.
 */
function sampleTravelAcross(
  behavior: ShapeBehaviorConfig,
  timeMs: number,
  box: { width: number; height: number },
): TravelShapeInstance[] {
  const { direction, count, size, spread } = resolveTravelParams(behavior);
  const duration = Math.max(
    400,
    behavior.durationMs / Math.max(0.05, behavior.speed),
  );
  const delay = Math.max(0, behavior.delayMs);
  const cycle = duration + (behavior.loop ? delay : 0);
  const local = behavior.loop
    ? (((timeMs - delay) % Math.max(1, cycle)) + Math.max(1, cycle)) %
      Math.max(1, cycle)
    : timeMs - delay;
  if (local < 0) return [];

  const horizontal = direction === "left" || direction === "right";
  const cloneW = Math.max(8, box.width * (horizontal ? size : size * 0.85));
  const cloneH = Math.max(8, box.height * (horizontal ? size * 0.85 : size));
  const travelSpan = horizontal
    ? box.width + cloneW * 2
    : box.height + cloneH * 2;
  const instances: TravelShapeInstance[] = [];

  for (let i = 0; i < count; i += 1) {
    const offset = i / count;
    // Stagger clones evenly along the looping timeline.
    const phase = behavior.loop
      ? (local / duration + offset) % 1
      : clamp(local / duration - offset * 0.55, 0, 1);
    if (!behavior.loop && (phase <= 0 || phase >= 1)) continue;

    const t = phase;
    const opacity = edgeFade(t, 0.12);
    if (opacity <= 0.01) continue;

    const lane = count <= 1 ? 0.5 : i / (count - 1);
    const laneJitter = (lane - 0.5) * spread;

    let x = 0;
    let y = 0;
    if (direction === "right") {
      x = -cloneW + t * travelSpan;
      y = box.height * (0.5 + laneJitter * 0.55) - cloneH / 2;
    } else if (direction === "left") {
      x = box.width + cloneW - t * travelSpan - cloneW;
      y = box.height * (0.5 + laneJitter * 0.55) - cloneH / 2;
    } else if (direction === "down") {
      y = -cloneH + t * travelSpan;
      x = box.width * (0.5 + laneJitter * 0.55) - cloneW / 2;
    } else {
      y = box.height + cloneH - t * travelSpan - cloneH;
      x = box.width * (0.5 + laneJitter * 0.55) - cloneW / 2;
    }

    const pulse = 0.92 + Math.sin(t * Math.PI) * 0.1;
    instances.push({
      id: `travel-${i}`,
      x,
      y,
      width: cloneW,
      height: cloneH,
      opacity,
      rotation: horizontal ? (laneJitter * 8) : (laneJitter * -8),
      scale: pulse,
    });
  }

  return instances;
}

/**
 * Cascade: staggered wave of clones sweeping through, then fading out.
 */
function sampleShapeCascade(
  behavior: ShapeBehaviorConfig,
  timeMs: number,
  box: { width: number; height: number },
): TravelShapeInstance[] {
  const { direction, count, size, spread } = resolveTravelParams(behavior);
  const sampled = behaviorProgress(behavior, timeMs);
  if (!sampled.active && sampled.raw >= 1 && !behavior.loop) {
    return [];
  }

  const horizontal = direction === "left" || direction === "right";
  const cols = horizontal ? Math.max(2, Math.ceil(count / 2)) : Math.max(2, Math.round(Math.sqrt(count)));
  const rows = Math.max(1, Math.ceil(count / cols));
  const cloneW = Math.max(8, (box.width / cols) * size * 1.6);
  const cloneH = Math.max(8, (box.height / rows) * size * 1.6);
  const instances: TravelShapeInstance[] = [];
  let index = 0;

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (index >= count) break;
      const stagger = (r * cols + c) / Math.max(1, count);
      const localT = behavior.loop
        ? (sampled.raw + stagger * 0.85) % 1
        : clamp((sampled.raw - stagger * 0.65) / 0.55, 0, 1);
      const opacity = edgeFade(localT, 0.18);
      if (opacity <= 0.01) {
        index += 1;
        continue;
      }

      const cellX = (c + 0.5) / cols;
      const cellY = (r + 0.5) / rows;
      const drift = (localT - 0.5) * (0.35 + spread * 0.5);

      let x = cellX * box.width - cloneW / 2;
      let y = cellY * box.height - cloneH / 2;
      if (direction === "right") x += drift * box.width;
      else if (direction === "left") x -= drift * box.width;
      else if (direction === "down") y += drift * box.height;
      else y -= drift * box.height;

      // Enter from off-edge then settle toward cell.
      const enter = 1 - edgeFade(Math.min(1, localT / 0.35), 1);
      if (direction === "right") x -= enter * (cloneW + box.width * 0.15);
      if (direction === "left") x += enter * (cloneW + box.width * 0.15);
      if (direction === "down") y -= enter * (cloneH + box.height * 0.15);
      if (direction === "up") y += enter * (cloneH + box.height * 0.15);

      instances.push({
        id: `cascade-${index}`,
        x,
        y,
        width: cloneW,
        height: cloneH,
        opacity,
        rotation: (c - cols / 2) * 3 * spread,
        scale: 0.75 + localT * 0.35,
      });
      index += 1;
    }
  }

  return instances;
}

/**
 * Sample shape behaviors at an absolute clock time (ms).
 * Used by ShapeRenderer for live preview / playback.
 */
export function sampleShapeBehaviors(
  config: ShapeComposerConfig,
  timeMs: number,
  box?: { width: number; height: number },
): SampledShapeBehaviorStyle {
  const behaviors = (config.behaviors ?? []).filter((b) => b.enabled);
  if (!config.enabled || behaviors.length === 0) {
    return DEFAULT_SAMPLE;
  }

  const width = Math.max(1, box?.width ?? 100);
  const height = Math.max(1, box?.height ?? 100);

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
  let fillOpacity = 1;
  let progress = 1;
  let travelInstances: TravelShapeInstance[] | undefined;
  let hideHostShape = false;
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
      case "draw_on": {
        strokeDasharray = `${PATH_LEN}`;
        strokeDashoffset = PATH_LEN * (1 - p);
        fillOpacity = Math.min(fillOpacity, 0.15 + p * 0.85);
        opacity = Math.min(opacity, 0.4 + p * 0.6);
        break;
      }
      case "border_build": {
        strokeDasharray = `${PATH_LEN}`;
        strokeDashoffset = PATH_LEN * (1 - p);
        fillOpacity = Math.min(fillOpacity, p < 0.72 ? 0 : (p - 0.72) / 0.28);
        opacity = Math.min(opacity, 0.55 + p * 0.45);
        break;
      }
      case "outline_sweep": {
        const window = 180;
        const head = p * (PATH_LEN + window);
        strokeDasharray = `${window} ${PATH_LEN}`;
        strokeDashoffset = PATH_LEN - head;
        fillOpacity = Math.min(fillOpacity, 0.85);
        break;
      }
      case "trace": {
        const window = 90;
        const head = p * (PATH_LEN + window);
        strokeDasharray = `${window} ${PATH_LEN}`;
        strokeDashoffset = PATH_LEN - head;
        fillOpacity = Math.min(fillOpacity, 0.35 + p * 0.4);
        opacity = Math.min(opacity, 0.7 + p * 0.3);
        break;
      }
      case "edge_sweep": {
        const window = 260;
        const head = p * (PATH_LEN + window);
        strokeDasharray = `${window} ${PATH_LEN}`;
        strokeDashoffset = PATH_LEN - head;
        fillOpacity = Math.min(fillOpacity, 0.2 + p * 0.8);
        opacity = Math.min(opacity, 0.5 + p * 0.5);
        break;
      }
      case "corner_build": {
        const inset = (1 - p) * 48;
        clipPath = `inset(${inset}% ${inset}% ${inset}% ${inset}% round 12px)`;
        opacity = Math.min(opacity, 0.35 + p * 0.65);
        scaleX = Math.min(scaleX, 0.92 + p * 0.08);
        scaleY = Math.min(scaleY, 0.92 + p * 0.08);
        transformOrigin = "center center";
        break;
      }
      case "panel_grow": {
        scaleX = Math.min(scaleX, 0.12 + p * 0.88);
        scaleY = Math.min(scaleY, 0.08 + p * 0.92);
        translateY = (1 - p) * 28;
        transformOrigin = "center bottom";
        opacity = Math.min(opacity, 0.2 + p * 0.8);
        break;
      }
      case "ribbon_expand": {
        scaleX = Math.min(scaleX, Math.max(0.02, p));
        scaleY = Math.min(scaleY, 0.85 + p * 0.15);
        translateX = (1 - p) * -40;
        transformOrigin = "left center";
        opacity = Math.min(opacity, 0.25 + p * 0.75);
        clipPath = `inset(0 ${(1 - p) * 100}% 0 0)`;
        break;
      }
      case "morph": {
        const pulse = 1 + Math.sin(p * Math.PI * 2) * 0.12;
        const skew = Math.sin(p * Math.PI * 2) * 10;
        scaleX = Math.min(scaleX, pulse);
        scaleY = Math.min(scaleY, 2 - pulse);
        translateX = skew;
        transformOrigin = "center center";
        break;
      }
      case "split": {
        const gap = (1 - p) * 45;
        clipPath = `inset(0 ${gap}% 0 ${gap}%)`;
        scaleX = Math.min(scaleX, 0.55 + p * 0.45);
        opacity = Math.min(opacity, 0.4 + p * 0.6);
        break;
      }
      case "merge": {
        const gap = Math.max(0, 42 - p * 42);
        clipPath = `inset(${gap * 0.35}% ${gap}% ${gap * 0.35}% ${gap}%)`;
        scaleX = Math.min(scaleX, 0.65 + p * 0.35);
        scaleY = Math.min(scaleY, 0.75 + p * 0.25);
        opacity = Math.min(opacity, 0.35 + p * 0.65);
        break;
      }
      case "light_sweep": {
        lightSweepProgress = p;
        lightSweepOpacity = 0.25 + (sampled.active || behavior.loop ? 0.55 : 0);
        break;
      }
      case "travel_across": {
        travelInstances = sampleTravelAcross(behavior, timeMs, {
          width,
          height,
        });
        hideHostShape = true;
        break;
      }
      case "shape_cascade": {
        travelInstances = sampleShapeCascade(behavior, timeMs, {
          width,
          height,
        });
        hideHostShape = true;
        break;
      }
      case "reveal_exit": {
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
    fillOpacity,
    travelInstances,
    hideHostShape,
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
    "travel_across",
    "shape_cascade",
  ].includes(type);
  const isExit = type === "reveal_exit";
  const isTravel = isTravelBehaviorType(type);
  return {
    type,
    enabled: true,
    durationMs: isExit ? 700 : isTravel ? 3200 : looping ? 1600 : 900,
    delayMs: 0,
    speed: 1,
    loop: isExit ? false : looping,
    ...(isExit
      ? {
          exitStyle: "fade" as const,
          exitDirection: "center" as const,
        }
      : {}),
    ...(isTravel
      ? {
          travelDirection: "right" as const,
          travelCount: type === "shape_cascade" ? 8 : 5,
          travelSize: type === "shape_cascade" ? 0.34 : 0.28,
          travelSpread: 0.45,
        }
      : {}),
    ...partial,
  };
}

/**
 * Enable `next` and turn off other entrance one-shots so each toggle
 * previews a distinct behavior (reveal_exit / light_sweep / travel stay).
 */
export function withExclusiveEntranceBehavior(
  behaviors: ShapeBehaviorConfig[],
  next: ShapeBehaviorConfig,
): ShapeBehaviorConfig[] {
  if (!isEntranceBehaviorType(next.type)) {
    // Travel behaviors are also exclusive with each other.
    if (isTravelBehaviorType(next.type)) {
      return [
        ...behaviors
          .filter((b) => b.type !== next.type)
          .map((b) =>
            isTravelBehaviorType(b.type) ? { ...b, enabled: false } : b,
          ),
        next,
      ];
    }
    return [...behaviors.filter((b) => b.type !== next.type), next];
  }
  return [
    ...behaviors
      .filter((b) => b.type !== next.type)
      .map((b) =>
        isEntranceBehaviorType(b.type) ? { ...b, enabled: false } : b,
      ),
    next,
  ];
}
