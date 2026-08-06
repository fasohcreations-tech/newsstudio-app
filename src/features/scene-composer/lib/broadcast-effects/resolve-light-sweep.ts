/**
 * Shared Light Sweep travel helpers — preview CSS and canvas export must agree.
 */

import { DEFAULT_LIGHT_SWEEP } from "@/features/scene-composer/lib/broadcast-effects/defaults";
import type {
  LightSweepEffectParams,
  LightSweepPath,
} from "@/features/scene-composer/lib/broadcast-effects/types";

/** CSS deg for each non-custom path preset. */
export const LIGHT_SWEEP_PATH_ANGLES: Record<
  Exclude<LightSweepPath, "custom">,
  number
> = {
  horizontal: 90,
  vertical: 180,
  diagonal: 45,
  diagonal_alt: 135,
};

export const LIGHT_SWEEP_PATH_OPTIONS: {
  value: LightSweepPath;
  label: string;
}[] = [
  { value: "horizontal", label: "Horizontal (L → R)" },
  { value: "vertical", label: "Vertical (T → B)" },
  { value: "diagonal", label: "Diagonal (↘)" },
  { value: "diagonal_alt", label: "Diagonal (↙)" },
  { value: "custom", label: "Custom angle" },
];

/** Oversized-gradient travel range used by the CSS overlay (matches legacy). */
const CSS_TRAVEL_MIN = -40;
const CSS_TRAVEL_SPAN = 180;

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function clampPercent(value: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(100, Math.max(0, value));
}

/** Fill missing fields on older scenes that predate path/start/end. */
export function normalizeLightSweepParams(
  params: Partial<LightSweepEffectParams> | Record<string, unknown>,
): LightSweepEffectParams {
  const raw = params as Partial<LightSweepEffectParams>;
  const path = (raw.path ?? DEFAULT_LIGHT_SWEEP.path) as LightSweepPath;
  const knownPath =
    path === "horizontal" ||
    path === "vertical" ||
    path === "diagonal" ||
    path === "diagonal_alt" ||
    path === "custom"
      ? path
      : DEFAULT_LIGHT_SWEEP.path;

  return {
    ...DEFAULT_LIGHT_SWEEP,
    ...raw,
    path: knownPath,
    angle: Number.isFinite(raw.angle)
      ? Number(raw.angle)
      : DEFAULT_LIGHT_SWEEP.angle,
    start: clampPercent(
      Number(raw.start ?? DEFAULT_LIGHT_SWEEP.start),
      DEFAULT_LIGHT_SWEEP.start,
    ),
    end: clampPercent(
      Number(raw.end ?? DEFAULT_LIGHT_SWEEP.end),
      DEFAULT_LIGHT_SWEEP.end,
    ),
  };
}

/** Effective CSS/canvas angle from path preset or custom angle. */
export function resolveLightSweepAngle(
  params: Pick<LightSweepEffectParams, "path" | "angle">,
): number {
  const path = params.path ?? "custom";
  if (path !== "custom" && path in LIGHT_SWEEP_PATH_ANGLES) {
    return LIGHT_SWEEP_PATH_ANGLES[path as Exclude<LightSweepPath, "custom">];
  }
  return Number.isFinite(params.angle) ? params.angle : 45;
}

/**
 * CSS `background-position` percent for a given progress (0–1) and start/end.
 * Start/end are 0–100 along the travel axis.
 */
export function lightSweepCssPosition(
  progress: number,
  start = 0,
  end = 100,
): number {
  const from =
    CSS_TRAVEL_MIN + (clampPercent(start, 0) / 100) * CSS_TRAVEL_SPAN;
  const to = CSS_TRAVEL_MIN + (clampPercent(end, 100) / 100) * CSS_TRAVEL_SPAN;
  return from + clamp01(progress) * (to - from);
}

/**
 * Canvas travel center along the projected axis.
 * `minP`/`span`/`bandHalf` match `drawLightSweep` geometry.
 */
export function lightSweepCanvasCenter(
  progress: number,
  minP: number,
  span: number,
  bandHalf: number,
  start = 0,
  end = 100,
): number {
  const travel = span + bandHalf * 2;
  const from = minP - bandHalf + (clampPercent(start, 0) / 100) * travel;
  const to = minP - bandHalf + (clampPercent(end, 100) / 100) * travel;
  return from + clamp01(progress) * (to - from);
}

/** Angle to write when the user picks a path preset. */
export function angleForLightSweepPath(path: LightSweepPath): number | null {
  if (path === "custom") return null;
  return LIGHT_SWEEP_PATH_ANGLES[path];
}
