import {
  createDefaultLayerMotion,
  DEFAULT_IDLE_PATH_RADIUS_PX,
  DEFAULT_IDLE_ROTATE_DEG_PER_SEC,
  DEFAULT_IDLE_SWIVEL_AMPLITUDE_DEG,
  GNN_001_MOTION_DEFAULTS,
} from "@/features/scene-composer/lib/motion-animation/constants";
import { applyEasing, clamp01 } from "@/features/scene-composer/lib/motion-animation/easing";
import type {
  LayerMotionConfig,
  MotionEntranceType,
  MotionExitType,
  MotionIdleAxis,
  MotionIdlePivot,
  MotionIdleType,
  MotionPhaseConfig,
  SampledMotionStyle,
} from "@/features/scene-composer/lib/motion-animation/types";
import { MOTION_METADATA_KEY } from "@/features/scene-composer/lib/motion-animation/types";
import type { SceneObject } from "@/features/scene-composer/types/scene-composer.types";

const SLIDE_DISTANCE = 48;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readPhase<T extends string>(
  raw: unknown,
  fallback: MotionPhaseConfig & { type: T },
): MotionPhaseConfig & { type: T } {
  if (!isRecord(raw)) return fallback;
  return {
    type: (typeof raw.type === "string" ? raw.type : fallback.type) as T,
    durationMs: Math.max(
      0,
      Number(raw.durationMs ?? fallback.durationMs) || fallback.durationMs,
    ),
    delayMs: Math.max(0, Number(raw.delayMs ?? fallback.delayMs) || 0),
    easing: (typeof raw.easing === "string"
      ? raw.easing
      : fallback.easing) as MotionPhaseConfig["easing"],
  };
}

/** Read motion config from object.metadata.motion (or apply region defaults). */
export function getLayerMotionConfig(object: SceneObject): LayerMotionConfig {
  const regionKey =
    typeof object.metadata?.region_key === "string"
      ? object.metadata.region_key
      : undefined;
  const role =
    typeof object.metadata?.layer === "string"
      ? object.metadata.layer
      : undefined;
  const presetKey =
    regionKey && GNN_001_MOTION_DEFAULTS[regionKey]
      ? regionKey
      : role && GNN_001_MOTION_DEFAULTS[role]
        ? role
        : object.name.toLowerCase().includes("background")
          ? "background"
          : undefined;
  const defaults = createDefaultLayerMotion(
    presetKey ? GNN_001_MOTION_DEFAULTS[presetKey] : undefined,
  );

  const raw = object.metadata?.[MOTION_METADATA_KEY];
  if (!isRecord(raw)) return defaults;

  const entrance = readPhase(raw.entrance, defaults.entrance);
  const exit = readPhase(raw.exit, defaults.exit);
  const idleRaw = isRecord(raw.idle) ? raw.idle : {};
  const axisRaw = typeof idleRaw.axis === "string" ? idleRaw.axis : defaults.idle.axis;
  const axis: MotionIdleAxis =
    axisRaw === "x" || axisRaw === "y" || axisRaw === "z"
      ? axisRaw
      : "z";
  const pivotRaw =
    typeof idleRaw.pivot === "string" ? idleRaw.pivot : defaults.idle.pivot;
  const pivot: MotionIdlePivot =
    pivotRaw === "center" ||
    pivotRaw === "left" ||
    pivotRaw === "right" ||
    pivotRaw === "top" ||
    pivotRaw === "bottom"
      ? pivotRaw
      : "center";
  const amplitude = Math.max(
    1,
    Number(
      idleRaw.amplitude ??
        defaults.idle.amplitude ??
        DEFAULT_IDLE_SWIVEL_AMPLITUDE_DEG,
    ) || DEFAULT_IDLE_SWIVEL_AMPLITUDE_DEG,
  );
  const offset = Number(idleRaw.offset ?? defaults.idle.offset ?? 0) || 0;
  const pathRadius = Math.max(
    4,
    Number(
      idleRaw.pathRadius ??
        defaults.idle.pathRadius ??
        DEFAULT_IDLE_PATH_RADIUS_PX,
    ) || DEFAULT_IDLE_PATH_RADIUS_PX,
  );
  return {
    version: 1,
    entrance,
    exit,
    idle: {
      type: (typeof idleRaw.type === "string"
        ? idleRaw.type
        : defaults.idle.type) as MotionIdleType,
      speed: Math.max(0.05, Number(idleRaw.speed ?? defaults.idle.speed) || 1),
      loop:
        typeof idleRaw.loop === "boolean" ? idleRaw.loop : defaults.idle.loop,
      axis,
      amplitude,
      offset,
      pivot,
      pathRadius,
    },
    speed: Math.max(0.05, Number(raw.speed ?? defaults.speed) || 1),
  };
}

export function setLayerMotionConfig(
  object: SceneObject,
  motion: LayerMotionConfig,
): SceneObject {
  return {
    ...object,
    metadata: {
      ...object.metadata,
      [MOTION_METADATA_KEY]: motion,
    },
  };
}

export function patchLayerMotionConfig(
  object: SceneObject,
  patch: {
    speed?: number;
    entrance?: Partial<LayerMotionConfig["entrance"]>;
    idle?: Partial<LayerMotionConfig["idle"]>;
    exit?: Partial<LayerMotionConfig["exit"]>;
  },
): SceneObject {
  const current = getLayerMotionConfig(object);
  const next: LayerMotionConfig = {
    version: 1,
    speed: patch.speed ?? current.speed,
    entrance: { ...current.entrance, ...patch.entrance },
    idle: { ...current.idle, ...patch.idle },
    exit: { ...current.exit, ...patch.exit },
  };
  return setLayerMotionConfig(object, next);
}

/** Apply GNN/region default motion onto skeleton objects missing metadata.motion. */
export function ensureObjectMotionDefaults(object: SceneObject): SceneObject {
  if (isRecord(object.metadata?.[MOTION_METADATA_KEY])) return object;
  return setLayerMotionConfig(object, getLayerMotionConfig(object));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function entranceDelta(
  type: MotionEntranceType,
  progress: number,
): Pick<
  SampledMotionStyle,
  "opacity" | "translateX" | "translateY" | "scale" | "clipPath"
> {
  const inv = 1 - progress;
  switch (type) {
    case "none":
      return { opacity: 1, translateX: 0, translateY: 0, scale: 1 };
    case "fade_in":
    case "opacity":
      return { opacity: progress, translateX: 0, translateY: 0, scale: 1 };
    case "slide_left":
      return {
        opacity: progress,
        translateX: -SLIDE_DISTANCE * inv,
        translateY: 0,
        scale: 1,
      };
    case "slide_right":
      return {
        opacity: progress,
        translateX: SLIDE_DISTANCE * inv,
        translateY: 0,
        scale: 1,
      };
    case "slide_up":
      return {
        opacity: progress,
        translateX: 0,
        translateY: SLIDE_DISTANCE * inv,
        scale: 1,
      };
    case "slide_down":
      return {
        opacity: progress,
        translateX: 0,
        translateY: -SLIDE_DISTANCE * inv,
        scale: 1,
      };
    case "scale_in":
      return {
        opacity: progress,
        translateX: 0,
        translateY: 0,
        scale: lerp(0.86, 1, progress),
      };
    case "zoom":
      return {
        opacity: progress,
        translateX: 0,
        translateY: 0,
        scale: lerp(1.12, 1, progress),
      };
    case "mask_reveal":
      return {
        opacity: 1,
        translateX: 0,
        translateY: 0,
        scale: 1,
        clipPath: `inset(0 ${Math.round((1 - progress) * 100)}% 0 0)`,
      };
    case "wipe_left":
      return {
        opacity: 1,
        translateX: 0,
        translateY: 0,
        scale: 1,
        clipPath: `inset(0 0 0 ${Math.round((1 - progress) * 100)}%)`,
      };
    case "wipe_right":
      return {
        opacity: 1,
        translateX: 0,
        translateY: 0,
        scale: 1,
        clipPath: `inset(0 ${Math.round((1 - progress) * 100)}% 0 0)`,
      };
    default:
      return { opacity: progress, translateX: 0, translateY: 0, scale: 1 };
  }
}

function exitDelta(
  type: MotionExitType,
  progress: number,
): Pick<
  SampledMotionStyle,
  "opacity" | "translateX" | "translateY" | "scale" | "clipPath"
> {
  // progress 0 = start of exit (fully visible), 1 = finished exit
  switch (type) {
    case "none":
      return { opacity: 1, translateX: 0, translateY: 0, scale: 1 };
    case "fade_out":
    case "opacity":
      return { opacity: 1 - progress, translateX: 0, translateY: 0, scale: 1 };
    case "slide_left":
      return {
        opacity: 1 - progress * 0.5,
        translateX: -SLIDE_DISTANCE * progress,
        translateY: 0,
        scale: 1,
      };
    case "slide_right":
      return {
        opacity: 1 - progress * 0.5,
        translateX: SLIDE_DISTANCE * progress,
        translateY: 0,
        scale: 1,
      };
    case "slide_up":
      return {
        opacity: 1 - progress * 0.5,
        translateX: 0,
        translateY: -SLIDE_DISTANCE * progress,
        scale: 1,
      };
    case "slide_down":
      return {
        opacity: 1 - progress * 0.5,
        translateX: 0,
        translateY: SLIDE_DISTANCE * progress,
        scale: 1,
      };
    case "scale_out":
      return {
        opacity: 1 - progress,
        translateX: 0,
        translateY: 0,
        scale: lerp(1, 0.88, progress),
      };
    case "mask_close":
      return {
        opacity: 1,
        translateX: 0,
        translateY: 0,
        scale: 1,
        clipPath: `inset(0 ${Math.round(progress * 50)}% 0 ${Math.round(progress * 50)}%)`,
      };
    case "wipe":
      return {
        opacity: 1,
        translateX: 0,
        translateY: 0,
        scale: 1,
        clipPath: `inset(0 0 0 ${Math.round(progress * 100)}%)`,
      };
    default:
      return { opacity: 1 - progress, translateX: 0, translateY: 0, scale: 1 };
  }
}

function pivotToOrigin(pivot: MotionIdlePivot): string {
  switch (pivot) {
    case "left":
      return "left center";
    case "right":
      return "right center";
    case "top":
      return "center top";
    case "bottom":
      return "center bottom";
    case "center":
    default:
      return "center center";
  }
}

function idleDelta(
  type: MotionIdleType,
  localMs: number,
  speed: number,
  options?: {
    axis?: MotionIdleAxis;
    amplitude?: number;
    offset?: number;
    pivot?: MotionIdlePivot;
    pathRadius?: number;
  },
): Pick<
  SampledMotionStyle,
  | "opacity"
  | "translateX"
  | "translateY"
  | "scale"
  | "rotate"
  | "rotateX"
  | "rotateY"
  | "rotateZ"
  | "filter"
  | "transformOrigin"
> {
  const axis = options?.axis ?? "z";
  const amplitude = Math.max(
    1,
    options?.amplitude ?? DEFAULT_IDLE_SWIVEL_AMPLITUDE_DEG,
  );
  const offset = options?.offset ?? 0;
  const pathRadius = Math.max(
    4,
    options?.pathRadius ?? DEFAULT_IDLE_PATH_RADIUS_PX,
  );
  const pivot = options?.pivot ?? "center";
  const origin = pivotToOrigin(pivot);
  const t = (localMs / 1000) * speed;
  const flat = {
    opacity: 1,
    translateX: 0,
    translateY: 0,
    scale: 1,
    rotate: 0,
    rotateX: 0,
    rotateY: 0,
    rotateZ: 0,
    transformOrigin: origin,
  };

  const alongAxis = (amount: number) => ({
    rotateX: axis === "x" ? amount : 0,
    rotateY: axis === "y" ? amount : 0,
    rotateZ: axis === "z" ? amount : 0,
    rotate: axis === "z" ? amount : 0,
    transformOrigin: origin,
  });

  switch (type) {
    case "pulse": {
      const wave = 0.5 + 0.5 * Math.sin(t * Math.PI * 2);
      return {
        ...flat,
        opacity: lerp(0.86, 1, wave),
        scale: lerp(0.985, 1.015, wave),
      };
    }
    case "glow": {
      const wave = 0.5 + 0.5 * Math.sin(t * Math.PI * 1.4);
      return {
        ...flat,
        filter: `drop-shadow(0 0 ${Math.round(4 + wave * 10)}px rgba(56,189,248,${0.25 + wave * 0.35}))`,
      };
    }
    case "float": {
      const wave = Math.sin(t * Math.PI * 1.2);
      return { ...flat, translateY: wave * 6 };
    }
    case "parallax": {
      const wave = Math.sin(t * Math.PI * 0.6);
      return { ...flat, translateX: wave * 10 };
    }
    case "slow_zoom": {
      const wave = 0.5 + 0.5 * Math.sin(t * Math.PI * 0.35);
      return { ...flat, scale: lerp(1, 1.04, wave) };
    }
    case "swell": {
      const wave = 0.5 + 0.5 * Math.sin(t * Math.PI * 1.1);
      return { ...flat, scale: lerp(0.92, 1.1, wave) };
    }
    case "orbit": {
      // Continuous circular path — object keeps moving, never rests at center.
      // speed 1 ≈ one full loop every ~2.5s; offset = start angle in degrees.
      const angle =
        (offset * Math.PI) / 180 + t * ((Math.PI * 2) / 2.5);
      return {
        ...flat,
        translateX: Math.cos(angle) * pathRadius,
        translateY: Math.sin(angle) * pathRadius,
      };
    }
    case "swivel": {
      // Strong oscillating 3D tilt: rest offset ± amplitude (default ±40°).
      const wave = Math.sin(t * Math.PI * 1.35);
      return { ...flat, ...alongAxis(offset + wave * amplitude) };
    }
    case "rotate": {
      // Continuous 3D spin; amplitude = °/sec when provided.
      const degPerSec =
        options?.amplitude && options.amplitude > 0
          ? options.amplitude
          : DEFAULT_IDLE_ROTATE_DEG_PER_SEC;
      return { ...flat, ...alongAxis(offset + ((t * degPerSec) % 360)) };
    }
    case "none":
    default:
      return flat;
  }
}

function composeTransform(
  translateX: number,
  translateY: number,
  scale: number,
  rotateX = 0,
  rotateY = 0,
  rotateZ = 0,
) {
  const needsPerspective =
    Math.abs(rotateX) > 0.01 || Math.abs(rotateY) > 0.01;
  // Stronger perspective so Y/X swivel reads clearly as 3D.
  const perspective = needsPerspective ? "perspective(700px) " : "";
  return `${perspective}translate(${translateX}px, ${translateY}px) scale(${scale}) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`;
}

function sampledFromIdle(
  idle: ReturnType<typeof idleDelta>,
): SampledMotionStyle {
  return {
    opacity: idle.opacity,
    translateX: idle.translateX,
    translateY: idle.translateY,
    scale: idle.scale,
    rotate: idle.rotateZ,
    rotateX: idle.rotateX,
    rotateY: idle.rotateY,
    rotateZ: idle.rotateZ,
    filter: idle.filter,
    transformOrigin: idle.transformOrigin,
    transform: composeTransform(
      idle.translateX,
      idle.translateY,
      idle.scale,
      idle.rotateX,
      idle.rotateY,
      idle.rotateZ,
    ),
    visible: true,
  };
}

/**
 * Sample motion style for an object at absolute scene playhead.
 * Uses object.start_ms/end_ms windows; entrance/idle/exit are independent of content.
 *
 * @param options.mode
 *   - `playback` — sample entrance/idle/exit at the playhead (live preview)
 *   - `edit` — post-entrance resting pose so the canvas stays visible while paused
 * @param options.gateAfterMs
 *   Hold an identity pose for this many ms after object.start_ms (used so shape
 *   reveal / behavior exit can finish before layer motion entrance begins).
 */
export function sampleLayerMotion(
  object: SceneObject,
  playheadMs: number,
  options?: { mode?: "playback" | "edit"; gateAfterMs?: number },
): SampledMotionStyle {
  const mode = options?.mode ?? "playback";
  const gateAfterMs = Math.max(0, options?.gateAfterMs ?? 0);
  const motion = getLayerMotionConfig(object);
  const speed = motion.speed;
  const start = object.start_ms;
  const end = object.end_ms;
  const span = Math.max(1, end - start);

  if (playheadMs < start || playheadMs > end || !object.visible) {
    return {
      opacity: 0,
      translateX: 0,
      translateY: 0,
      scale: 1,
      rotate: 0,
      rotateX: 0,
      rotateY: 0,
      rotateZ: 0,
      transform: composeTransform(0, 0, 1),
      visible: false,
    };
  }

  const entranceDur = Math.max(0, motion.entrance.durationMs / speed);
  const entranceDelay = Math.max(0, motion.entrance.delayMs / speed);
  const exitDur = Math.max(0, motion.exit.durationMs / speed);
  const exitStart = span - exitDur;
  const local = playheadMs - start;

  // Shape reveal / behavior gate runs in both edit + playback so scrubbing
  // mid-intro cannot start layer entrance early.
  if (gateAfterMs > 0 && local < gateAfterMs) {
    return {
      opacity: 1,
      translateX: 0,
      translateY: 0,
      scale: 1,
      rotate: 0,
      rotateX: 0,
      rotateY: 0,
      rotateZ: 0,
      transform: composeTransform(0, 0, 1),
      visible: true,
    };
  }

  // Edit mode: fully visible resting pose (entrance done, exit not started).
  if (mode === "edit") {
    const idleLocal = Math.max(0, span * 0.35 - entranceDelay - entranceDur);
    return sampledFromIdle(
      idleDelta(
        motion.idle.type,
        motion.idle.loop ? idleLocal : 0,
        motion.idle.speed * speed,
        {
          axis: motion.idle.axis ?? "z",
          amplitude: motion.idle.amplitude,
          offset: motion.idle.offset,
          pivot: motion.idle.pivot,
          pathRadius: motion.idle.pathRadius,
        },
      ),
    );
  }

  // Entrance / idle clocks start after the gate; exit still uses layer end.
  const motionLocal = local - gateAfterMs;
  // Shape exit already revealed the layer — don't fade it in again.
  const afterShapeGate = gateAfterMs > 0;
  const entranceType =
    afterShapeGate &&
    (motion.entrance.type === "fade_in" || motion.entrance.type === "opacity")
      ? "none"
      : motion.entrance.type;

  // Pre-entrance (delay)
  if (motionLocal < entranceDelay && entranceType !== "none") {
    if (afterShapeGate) {
      // Hold full opacity; transform entrance starts after delay.
      return {
        opacity: 1,
        translateX: 0,
        translateY: 0,
        scale: 1,
        rotate: 0,
        rotateX: 0,
        rotateY: 0,
        rotateZ: 0,
        transform: composeTransform(0, 0, 1),
        visible: true,
      };
    }
    const hidden = entranceDelta(entranceType, 0);
    return {
      ...hidden,
      rotate: 0,
      rotateX: 0,
      rotateY: 0,
      rotateZ: 0,
      opacity: 0,
      transform: composeTransform(
        hidden.translateX,
        hidden.translateY,
        hidden.scale,
      ),
      visible: false,
    };
  }

  // Entrance
  if (entranceType !== "none" && motionLocal < entranceDelay + entranceDur) {
    const raw = clamp01(
      (motionLocal - entranceDelay) / Math.max(1, entranceDur),
    );
    const t = applyEasing(raw, motion.entrance.easing);
    const delta = entranceDelta(entranceType, t);
    return {
      // Keep fully opaque after shape reveal; still allow slide/scale/wipe.
      opacity: afterShapeGate ? 1 : delta.opacity,
      translateX: delta.translateX,
      translateY: delta.translateY,
      scale: delta.scale,
      rotate: 0,
      rotateX: 0,
      rotateY: 0,
      rotateZ: 0,
      clipPath: delta.clipPath,
      transform: composeTransform(
        delta.translateX,
        delta.translateY,
        delta.scale,
      ),
      visible: true,
    };
  }

  // Exit
  if (motion.exit.type !== "none" && local >= exitStart) {
    const raw = clamp01((local - exitStart) / Math.max(1, exitDur));
    const t = applyEasing(raw, motion.exit.easing);
    const delta = exitDelta(motion.exit.type, t);
    return {
      opacity: delta.opacity,
      translateX: delta.translateX,
      translateY: delta.translateY,
      scale: delta.scale,
      rotate: 0,
      rotateX: 0,
      rotateY: 0,
      rotateZ: 0,
      clipPath: delta.clipPath,
      transform: composeTransform(
        delta.translateX,
        delta.translateY,
        delta.scale,
      ),
      visible: delta.opacity > 0.02,
    };
  }

  // Idle (between entrance end and exit start)
  const idleLocal = motionLocal - entranceDelay - entranceDur;
  return sampledFromIdle(
    idleDelta(
      motion.idle.type,
      motion.idle.loop ? Math.max(0, idleLocal) : 0,
      motion.idle.speed * speed,
      {
        axis: motion.idle.axis ?? "z",
        amplitude: motion.idle.amplitude,
        offset: motion.idle.offset,
        pivot: motion.idle.pivot,
        pathRadius: motion.idle.pathRadius,
      },
    ),
  );
}

/** Timeline helper: entrance bar absolute range. */
export function getEntranceWindow(object: SceneObject) {
  const motion = getLayerMotionConfig(object);
  const speed = motion.speed;
  const start = object.start_ms + motion.entrance.delayMs / speed;
  const end = start + motion.entrance.durationMs / speed;
  return { startMs: start, endMs: Math.min(object.end_ms, end) };
}

/** Timeline helper: exit bar absolute range. */
export function getExitWindow(object: SceneObject) {
  const motion = getLayerMotionConfig(object);
  const speed = motion.speed;
  const exitDur = motion.exit.durationMs / speed;
  const start = object.end_ms - exitDur;
  return { startMs: Math.max(object.start_ms, start), endMs: object.end_ms };
}
