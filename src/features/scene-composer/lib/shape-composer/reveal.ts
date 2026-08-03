import type {
  ShapeBehaviorConfig,
  ShapeComposerConfig,
  ShapeRevealConfig,
  ShapeRevealExitDirection,
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

export type ResolvedRevealExit = {
  style: "fade" | "scale_out" | "wipe" | "slide" | "reverse";
  direction: ShapeRevealExitDirection;
  durationMs: number;
};

/** Map legacy combined styles (wipe_up, slide_left, …) into style + direction. */
export function normalizeRevealExit(
  style: ShapeRevealExitStyle | undefined,
  direction?: ShapeRevealExitDirection,
): Pick<ResolvedRevealExit, "style" | "direction"> {
  switch (style) {
    case "wipe_up":
      return { style: "wipe", direction: "up" };
    case "wipe_down":
      return { style: "wipe", direction: "down" };
    case "slide_left":
      return { style: "slide", direction: "left" };
    case "wipe":
      return {
        style: "wipe",
        direction: direction && direction !== "center" ? direction : "up",
      };
    case "slide":
      return {
        style: "slide",
        direction: direction && direction !== "center" ? direction : "left",
      };
    case "scale_out":
      return { style: "scale_out", direction: direction ?? "center" };
    case "reverse":
      return { style: "reverse", direction: direction ?? "down" };
    case "fade":
    default:
      return { style: "fade", direction: direction ?? "center" };
  }
}

export function createDefaultReveal(
  partial?: Partial<ShapeRevealConfig>,
): ShapeRevealConfig {
  const normalized = normalizeRevealExit(
    partial?.exitStyle ?? "fade",
    partial?.exitDirection,
  );
  return {
    enabled: true,
    entranceDurationMs: 900,
    holdMs: 400,
    exitDurationMs: 700,
    ...partial,
    exitStyle: normalized.style,
    exitDirection: normalized.direction,
  };
}

export function resolveRevealConfig(
  config: ShapeComposerConfig,
): ShapeRevealConfig {
  const raw = config.reveal;
  if (!raw) return createDefaultReveal({ enabled: false });
  return createDefaultReveal(raw);
}

/** Prefer reveal_exit behavior fields when present (kept in sync by inspector). */
export function resolveRevealExit(
  config: ShapeComposerConfig,
  reveal: ShapeRevealConfig = resolveRevealConfig(config),
): ResolvedRevealExit {
  const exitBehavior = (config.behaviors ?? []).find(
    (b) => b.type === "reveal_exit" && b.enabled,
  );
  // Behavior first: older main-video saves often only stored style on
  // reveal_exit while reveal.* stayed at the factory "fade" default.
  const normalized = normalizeRevealExit(
    exitBehavior?.exitStyle ?? reveal.exitStyle,
    exitBehavior?.exitDirection ?? reveal.exitDirection,
  );
  const durationMs = exitBehavior
    ? Math.max(
        200,
        exitBehavior.durationMs / Math.max(0.05, exitBehavior.speed),
      )
    : Math.max(200, reveal.exitDurationMs);
  return {
    ...normalized,
    durationMs,
  };
}

function smooth(t: number) {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

function isEntranceBehavior(behavior: ShapeBehaviorConfig) {
  return behavior.enabled && behavior.type !== "reveal_exit" && !behavior.loop;
}

function entranceDurationMs(config: ShapeComposerConfig, reveal: ShapeRevealConfig) {
  const fromBehaviors = (config.behaviors ?? [])
    .filter(isEntranceBehavior)
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
  const exit = resolveRevealExit(config, reveal).durationMs;
  return entrance + Math.max(0, reveal.holdMs) + exit;
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
  style: ResolvedRevealExit["style"],
  direction: ShapeRevealExitDirection,
  p: number,
  width: number,
  height: number,
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
  const dir = direction;
  // Clear the full frame so styles read clearly on large video layers.
  const slideX = Math.max(120, width * 1.15);
  const slideY = Math.max(120, height * 1.15);

  switch (style) {
    case "scale_out":
      return {
        // Keep fill readable — scale is the signal, not a second fade.
        shapeOpacity: Math.max(0.2, 1 - e * 0.35),
        shapeScaleX: Math.max(0.02, 1 - e),
        shapeScaleY: Math.max(0.02, 1 - e),
        shapeTranslateX: 0,
        shapeTranslateY: 0,
        transformOrigin: "center center",
      };
    case "wipe": {
      const clip =
        dir === "down"
          ? `inset(${e * 100}% 0 0 0)`
          : dir === "left"
            ? `inset(0 0 0 ${e * 100}%)`
            : dir === "right"
              ? `inset(0 ${e * 100}% 0 0)`
              : `inset(0 0 ${e * 100}% 0)`; // up (default)
      const origin =
        dir === "down"
          ? "center top"
          : dir === "left"
            ? "right center"
            : dir === "right"
              ? "left center"
              : "center bottom";
      return {
        shapeOpacity: 1,
        shapeScaleX: 1,
        shapeScaleY: 1,
        shapeTranslateX: 0,
        shapeTranslateY: 0,
        shapeClipPath: clip,
        transformOrigin: origin,
      };
    }
    case "slide": {
      const tx =
        dir === "right"
          ? e * slideX
          : dir === "left" || dir === "center"
            ? -e * slideX
            : 0;
      const ty =
        dir === "down" ? e * slideY : dir === "up" ? -e * slideY : 0;
      return {
        shapeOpacity: 1,
        shapeScaleX: 1,
        shapeScaleY: 1,
        shapeTranslateX: tx,
        shapeTranslateY: ty,
        transformOrigin: "center center",
      };
    }
    case "reverse": {
      const ty =
        dir === "up"
          ? -e * slideY * 0.35
          : dir === "left" || dir === "right"
            ? 0
            : e * slideY * 0.35;
      const tx =
        dir === "left"
          ? -e * slideX * 0.35
          : dir === "right"
            ? e * slideX * 0.35
            : 0;
      return {
        shapeOpacity: Math.max(0.15, 1 - e * 0.85),
        shapeScaleX: Math.max(0.04, 1 - e),
        shapeScaleY: Math.max(0.04, 1 - e),
        shapeTranslateX: tx,
        shapeTranslateY: ty,
        transformOrigin:
          dir === "up"
            ? "center top"
            : dir === "left"
              ? "left center"
              : dir === "right"
                ? "right center"
                : "center bottom",
      };
    }
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
  options?: { overlay?: boolean; width?: number; height?: number },
): SampledShapeReveal {
  const overlay = options?.overlay !== false;
  const layerWidth = Math.max(1, options?.width ?? 400);
  const layerHeight = Math.max(1, options?.height ?? 300);

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
  const exitResolved = resolveRevealExit(config, reveal);
  const exit = exitResolved.durationMs;
  const totalMs = entrance + hold + exit;
  const t = Math.max(0, timeMs);
  // When shape behaviors are active, they drive entrance motion — reveal
  // only gates original-layer visibility + exit. reveal_exit is exit-only.
  const behaviorsDriveEntrance = (config.behaviors ?? []).some(
    (b) => b.enabled && b.type !== "reveal_exit",
  );

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
    const exitMotion = applyExit(
      exitResolved.style,
      exitResolved.direction,
      phaseProgress,
      layerWidth,
      layerHeight,
    );
    return {
      phase: "exit",
      phaseProgress: smooth(phaseProgress),
      ...exitMotion,
      // Content sits under the exiting cover so there is no blank gap
      // between shape disappearing and the original layer showing.
      contentOpacity: 1,
      // Stay mounted for the whole exit so wipe/slide/scale can finish.
      shapeVisible: true,
      shapeOpacity: exitMotion.shapeOpacity,
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

  // Frame / stroke overlays stay after reveal only when Reveal is off
  // (rim mode). With Reveal on, the cover shape exits and video shows alone.
  const persistFrame =
    !reveal.enabled &&
    (config.kind === "video_frame" ||
      config.fillMode === "none" ||
      config.fill === "transparent");
  if (persistFrame) {
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

/** Default exit behavior — pairs with reveal original layer. */
export function defaultRevealExitBehavior(
  partial?: Partial<ShapeBehaviorConfig>,
) {
  return createShapeBehavior("reveal_exit", {
    durationMs: 700,
    loop: false,
    exitStyle: "fade",
    exitDirection: "center",
    ...partial,
  });
}

/** Keep reveal.* and reveal_exit behavior fields aligned. */
export function syncRevealExitBehavior(
  behaviors: ShapeBehaviorConfig[],
  reveal: ShapeRevealConfig,
): ShapeBehaviorConfig[] {
  const normalized = normalizeRevealExit(reveal.exitStyle, reveal.exitDirection);
  const existing = behaviors.find((b) => b.type === "reveal_exit");
  const nextExit: ShapeBehaviorConfig = existing
    ? {
        ...existing,
        enabled: reveal.enabled,
        durationMs: reveal.exitDurationMs,
        loop: false,
        exitStyle: normalized.style,
        exitDirection: normalized.direction,
      }
    : defaultRevealExitBehavior({
        enabled: reveal.enabled,
        durationMs: reveal.exitDurationMs,
        exitStyle: normalized.style,
        exitDirection: normalized.direction,
      });

  if (!reveal.enabled && !existing) return behaviors;

  return [
    ...behaviors.filter((b) => b.type !== "reveal_exit"),
    nextExit,
  ];
}
