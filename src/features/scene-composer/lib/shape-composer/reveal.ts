import type {
  ShapeComposerConfig,
  ShapeRevealConfig,
  ShapeRevealExitStyle,
} from "@/features/scene-composer/lib/shape-composer/types";
import { createShapeBehavior } from "@/features/scene-composer/lib/shape-composer/behaviors";

export type ShapeRevealPhase = "entrance" | "hold" | "exit" | "revealed";

export type SampledShapeReveal = {
  phase: ShapeRevealPhase;
  phaseProgress: number;
  shapeOpacity: number;
  shapeScaleX: number;
  shapeScaleY: number;
  shapeTranslateX: number;
  shapeTranslateY: number;
  shapeClipPath?: string;
  /** Original layer content (0 while covered, 1 after exit). */
  contentOpacity: number;
  shapeVisible: boolean;
  transformOrigin: string;
  /** Total timeline length until original layer is fully shown. */
  totalMs: number;
};

export function createDefaultReveal(
  partial?: Partial<ShapeRevealConfig>,
): ShapeRevealConfig {
  return {
    enabled: true,
    entranceDurationMs: 900,
    holdMs: 400,
    exitDurationMs: 700,
    exitStyle: "fade",
    ...partial,
  };
}

export function resolveRevealConfig(
  config: ShapeComposerConfig,
): ShapeRevealConfig {
  const raw = config.reveal;
  if (!raw) return createDefaultReveal({ enabled: false });
  return createDefaultReveal(raw);
}

function smooth(t: number) {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

function entranceDurationMs(config: ShapeComposerConfig, reveal: ShapeRevealConfig) {
  const fromBehaviors = (config.behaviors ?? [])
    .filter((b) => b.enabled && !b.loop)
    .reduce(
      (max, b) =>
        Math.max(max, b.delayMs + b.durationMs / Math.max(0.05, b.speed)),
      0,
    );
  return Math.max(300, fromBehaviors || reveal.entranceDurationMs);
}

export function shapeRevealTotalMs(config: ShapeComposerConfig): number {
  const reveal = resolveRevealConfig(config);
  if (!reveal.enabled) return 0;
  const entrance = entranceDurationMs(config, reveal);
  return entrance + Math.max(0, reveal.holdMs) + Math.max(200, reveal.exitDurationMs);
}

/** Longest one-shot behavior duration (for preview clocks). */
export function shapeBehaviorDurationMs(config: ShapeComposerConfig): number {
  return (config.behaviors ?? [])
    .filter((b) => b.enabled)
    .reduce(
      (max, b) =>
        Math.max(max, b.delayMs + b.durationMs / Math.max(0.05, b.speed)),
      0,
    );
}

/** Preview clock length: reveal timeline and/or behaviors. */
export function shapePreviewDurationMs(config: ShapeComposerConfig): number {
  const revealMs = shapeRevealTotalMs(config);
  const behaviorMs = shapeBehaviorDurationMs(config);
  const hasLoop = (config.behaviors ?? []).some((b) => b.enabled && b.loop);
  // Looping behaviors need a continuous clock; use a long window when reveal is off.
  if (hasLoop && !resolveRevealConfig(config).enabled) {
    return Math.max(behaviorMs, 12_000);
  }
  return Math.max(revealMs, behaviorMs, 0);
}

function applyExit(
  style: ShapeRevealExitStyle,
  p: number,
): Pick<
  SampledShapeReveal,
  | "shapeOpacity"
  | "shapeScaleX"
  | "shapeScaleY"
  | "shapeTranslateX"
  | "shapeTranslateY"
  | "shapeClipPath"
  | "transformOrigin"
> {
  const e = smooth(p);
  switch (style) {
    case "scale_out":
      return {
        shapeOpacity: 1 - e,
        shapeScaleX: 1 - e * 0.85,
        shapeScaleY: 1 - e * 0.85,
        shapeTranslateX: 0,
        shapeTranslateY: 0,
        transformOrigin: "center center",
      };
    case "wipe_up":
      return {
        shapeOpacity: 1,
        shapeScaleX: 1,
        shapeScaleY: 1,
        shapeTranslateX: 0,
        shapeTranslateY: 0,
        shapeClipPath: `inset(0 0 ${e * 100}% 0)`,
        transformOrigin: "center bottom",
      };
    case "wipe_down":
      return {
        shapeOpacity: 1,
        shapeScaleX: 1,
        shapeScaleY: 1,
        shapeTranslateX: 0,
        shapeTranslateY: 0,
        shapeClipPath: `inset(${e * 100}% 0 0 0)`,
        transformOrigin: "center top",
      };
    case "slide_left":
      return {
        shapeOpacity: 1 - e * 0.35,
        shapeScaleX: 1,
        shapeScaleY: 1,
        shapeTranslateX: -e * 120,
        shapeTranslateY: 0,
        transformOrigin: "center center",
      };
    case "reverse":
      return {
        shapeOpacity: 1 - e,
        shapeScaleX: 1 - e * 0.7,
        shapeScaleY: 1 - e * 0.7,
        shapeTranslateX: 0,
        shapeTranslateY: e * 24,
        transformOrigin: "center bottom",
      };
    case "fade":
    default:
      return {
        shapeOpacity: 1 - e,
        shapeScaleX: 1,
        shapeScaleY: 1,
        shapeTranslateX: 0,
        shapeTranslateY: 0,
        transformOrigin: "center center",
      };
  }
}

const IDLE_REVEALED: SampledShapeReveal = {
  phase: "revealed",
  phaseProgress: 1,
  shapeOpacity: 0,
  shapeScaleX: 1,
  shapeScaleY: 1,
  shapeTranslateX: 0,
  shapeTranslateY: 0,
  contentOpacity: 1,
  shapeVisible: false,
  transformOrigin: "center center",
  totalMs: 0,
};

/**
 * Shape → hold → exit → original layer.
 * When reveal is off, shape stays (content fully visible underneath/alongside).
 * For non-overlay (pure shape) layers, the shape remains after the timeline —
 * there is no separate "original" content to reveal.
 */
export function sampleShapeReveal(
  config: ShapeComposerConfig,
  timeMs: number,
  options?: { overlay?: boolean },
): SampledShapeReveal {
  const overlay = options?.overlay !== false;

  if (!config.enabled) {
    return { ...IDLE_REVEALED, contentOpacity: 1, shapeVisible: false };
  }

  const reveal = resolveRevealConfig(config);
  if (!reveal.enabled) {
    return {
      phase: "hold",
      phaseProgress: 1,
      shapeOpacity: 1,
      shapeScaleX: 1,
      shapeScaleY: 1,
      shapeTranslateX: 0,
      shapeTranslateY: 0,
      contentOpacity: 1,
      shapeVisible: true,
      transformOrigin: "center center",
      totalMs: 0,
    };
  }

  const entrance = entranceDurationMs(config, reveal);
  const hold = Math.max(0, reveal.holdMs);
  const exit = Math.max(200, reveal.exitDurationMs);
  const totalMs = entrance + hold + exit;
  const t = Math.max(0, timeMs);
  // When shape behaviors are active, they drive entrance motion — reveal
  // only gates original-layer visibility + exit.
  const behaviorsDriveEntrance = (config.behaviors ?? []).some((b) => b.enabled);

  if (t < entrance) {
    const phaseProgress = smooth(t / entrance);
    if (behaviorsDriveEntrance) {
      return {
        phase: "entrance",
        phaseProgress,
        shapeOpacity: 1,
        shapeScaleX: 1,
        shapeScaleY: 1,
        shapeTranslateX: 0,
        shapeTranslateY: 0,
        contentOpacity: 0,
        shapeVisible: true,
        transformOrigin: "center center",
        totalMs,
      };
    }
    return {
      phase: "entrance",
      phaseProgress,
      shapeOpacity: 0.2 + phaseProgress * 0.8,
      shapeScaleX: 0.2 + phaseProgress * 0.8,
      shapeScaleY: 0.2 + phaseProgress * 0.8,
      shapeTranslateX: 0,
      shapeTranslateY: (1 - phaseProgress) * 18,
      // Original layer stays fully hidden until shape has exited.
      contentOpacity: 0,
      shapeVisible: true,
      transformOrigin: "center bottom",
      totalMs,
    };
  }

  if (t < entrance + hold) {
    return {
      phase: "hold",
      phaseProgress: 1,
      shapeOpacity: 1,
      shapeScaleX: 1,
      shapeScaleY: 1,
      shapeTranslateX: 0,
      shapeTranslateY: 0,
      contentOpacity: 0,
      shapeVisible: true,
      transformOrigin: "center center",
      totalMs,
    };
  }

  if (t < totalMs) {
    const phaseProgress = (t - entrance - hold) / exit;
    const exitMotion = applyExit(reveal.exitStyle, phaseProgress);
    return {
      phase: "exit",
      phaseProgress: smooth(phaseProgress),
      ...exitMotion,
      // Keep original hidden for the whole exit — show only after.
      contentOpacity: 0,
      shapeVisible: overlay
        ? exitMotion.shapeOpacity > 0.02
        : true,
      shapeOpacity: overlay
        ? exitMotion.shapeOpacity
        : Math.max(0.35, exitMotion.shapeOpacity),
      totalMs,
    };
  }

  if (!overlay) {
    return {
      phase: "revealed",
      phaseProgress: 1,
      shapeOpacity: 1,
      shapeScaleX: 1,
      shapeScaleY: 1,
      shapeTranslateX: 0,
      shapeTranslateY: 0,
      contentOpacity: 1,
      shapeVisible: true,
      transformOrigin: "center center",
      totalMs,
    };
  }

  return {
    ...IDLE_REVEALED,
    contentOpacity: 1,
    totalMs,
  };
}

/** Default entrance behavior when enabling reveal with an empty behavior list. */
export function defaultRevealEntranceBehavior() {
  return createShapeBehavior("panel_grow", {
    durationMs: 900,
    loop: false,
  });
}
