/**
 * Module 4.3 – Edge Sweep Behavior types.
 * Perimeter highlight travels around object borders (broadcast-elegant, not neon).
 */

export type EdgeSweepDirection = "clockwise" | "counterclockwise";

export type EdgeSweepLoopMode =
  | "continuous"
  | "once"
  | "on_hover"
  | "on_scene_start";

export type EdgeSweepCornerStyle = "rounded" | "sharp";

export type EdgeSweepBlendMode =
  | "normal"
  | "screen"
  | "overlay"
  | "soft-light"
  | "plus-lighter";

export type EdgeSweepStyle =
  | "single"
  | "dual"
  | "four_corner"
  | "dashed"
  | "metallic"
  | "gold"
  | "broadcast_blue";

/** Per-side path inset from the layer edges (px). Positive = inward. */
export type EdgeSweepSideMargins = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type EdgeSweepConfig = {
  version: 1;
  enabled: boolean;
  style: EdgeSweepStyle;
  color: string;
  /** Stroke thickness in px. */
  width: number;
  /** Highlight arc length as fraction of perimeter (0–1). */
  length: number;
  brightness: number;
  opacity: number;
  /** Revolutions per second. */
  speed: number;
  direction: EdgeSweepDirection;
  loop: EdgeSweepLoopMode;
  cornerStyle: EdgeSweepCornerStyle;
  /** Override corner radius; null = use object.style.corner_radius. */
  cornerRadius: number | null;
  blendMode: EdgeSweepBlendMode;
  glowIntensity: number;
  /** Trail fraction relative to primary length. */
  trailLength: number;
  trailFade: number;
  /**
   * Uniform extra inset of the sweep path from the item edges (px).
   * Positive pulls the run inward; negative pushes it outward.
   * Ignored when `margins` is set.
   */
  margin: number;
  /** Per-side path insets; null = use uniform `margin` on all sides. */
  margins: EdgeSweepSideMargins | null;
};

export type EdgeSweepBehaviorState = {
  version: 1;
  edge_sweep: EdgeSweepConfig;
};

export type EdgeSweepPreset = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  config: EdgeSweepConfig;
};

export const BEHAVIORS_METADATA_KEY = "behaviors" as const;
export const EDGE_SWEEP_BEHAVIOR_KEY = "edge_sweep" as const;
