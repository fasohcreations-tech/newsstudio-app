import type {
  LayerMotionConfig,
  MotionEasing,
  MotionEntranceType,
  MotionExitType,
  MotionIdleAxis,
  MotionIdlePivot,
  MotionIdleType,
} from "@/features/scene-composer/lib/motion-animation/types";

export const DEFAULT_ENTRANCE_DURATION_MS = 450;
export const DEFAULT_EXIT_DURATION_MS = 400;
export const DEFAULT_ENTRANCE_DELAY_MS = 0;

export const MOTION_EASING_OPTIONS: Array<{
  value: MotionEasing;
  label: string;
}> = [
  { value: "linear", label: "Linear" },
  { value: "ease_in", label: "Ease In" },
  { value: "ease_out", label: "Ease Out" },
  { value: "ease_in_out", label: "Ease In Out" },
  { value: "cubic", label: "Cubic" },
];

export const ENTRANCE_ANIMATION_OPTIONS: Array<{
  value: MotionEntranceType;
  label: string;
}> = [
  { value: "none", label: "None" },
  { value: "fade_in", label: "Fade In" },
  { value: "slide_left", label: "Slide Left" },
  { value: "slide_right", label: "Slide Right" },
  { value: "slide_up", label: "Slide Up" },
  { value: "slide_down", label: "Slide Down" },
  { value: "scale_in", label: "Scale In" },
  { value: "zoom", label: "Zoom" },
  { value: "mask_reveal", label: "Mask Reveal" },
  { value: "wipe_left", label: "Wipe Left" },
  { value: "wipe_right", label: "Wipe Right" },
  { value: "opacity", label: "Opacity" },
];

export const IDLE_ANIMATION_OPTIONS: Array<{
  value: MotionIdleType;
  label: string;
}> = [
  { value: "none", label: "None" },
  { value: "pulse", label: "Pulse" },
  { value: "glow", label: "Glow" },
  { value: "float", label: "Float" },
  { value: "parallax", label: "Parallax" },
  { value: "slow_zoom", label: "Slow Zoom" },
  { value: "swell", label: "Swell" },
  { value: "orbit", label: "Orbit Path" },
  { value: "swivel", label: "Swivel 3D" },
  { value: "rotate", label: "Rotate 3D" },
];

export const MOTION_IDLE_AXIS_OPTIONS: Array<{
  value: MotionIdleAxis;
  label: string;
  hint: string;
}> = [
  { value: "x", label: "X axis", hint: "Flip / tumble (pitch)" },
  { value: "y", label: "Y axis", hint: "Turn / door hinge (yaw)" },
  { value: "z", label: "Z axis", hint: "Spin in screen plane" },
];

export const MOTION_IDLE_PIVOT_OPTIONS: Array<{
  value: MotionIdlePivot;
  label: string;
}> = [
  { value: "center", label: "Center" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
];

/** Default strong swivel swing (±degrees) for noticeable 3D motion. */
export const DEFAULT_IDLE_SWIVEL_AMPLITUDE_DEG = 40;
export const DEFAULT_IDLE_ROTATE_DEG_PER_SEC = 36;
/** Default orbit path radius in pixels. */
export const DEFAULT_IDLE_PATH_RADIUS_PX = 48;

export const EXIT_ANIMATION_OPTIONS: Array<{
  value: MotionExitType;
  label: string;
}> = [
  { value: "none", label: "None" },
  { value: "fade_out", label: "Fade Out" },
  { value: "slide_left", label: "Slide Left" },
  { value: "slide_right", label: "Slide Right" },
  { value: "slide_up", label: "Slide Up" },
  { value: "slide_down", label: "Slide Down" },
  { value: "scale_out", label: "Scale Out" },
  { value: "mask_close", label: "Mask Close" },
  { value: "wipe", label: "Wipe" },
  { value: "opacity", label: "Opacity" },
];

export function createDefaultLayerMotion(
  partial?: Partial<LayerMotionConfig>,
): LayerMotionConfig {
  return {
    version: 1,
    entrance: {
      type: "fade_in",
      durationMs: DEFAULT_ENTRANCE_DURATION_MS,
      delayMs: DEFAULT_ENTRANCE_DELAY_MS,
      easing: "ease_out",
      ...partial?.entrance,
    },
    idle: {
      type: "none",
      speed: 1,
      loop: true,
      axis: "z",
      amplitude: DEFAULT_IDLE_SWIVEL_AMPLITUDE_DEG,
      offset: 0,
      pivot: "center",
      pathRadius: DEFAULT_IDLE_PATH_RADIUS_PX,
      ...partial?.idle,
    },
    exit: {
      type: "fade_out",
      durationMs: DEFAULT_EXIT_DURATION_MS,
      delayMs: 0,
      easing: "ease_in",
      ...partial?.exit,
    },
    speed: partial?.speed ?? 1,
  };
}

/**
 * GNN-001 default animations by region_key / role.
 * Sequence intent: Background → Header → Video → Reporter → Headline → Lower Third → Clock → Ticker
 */
export const GNN_001_MOTION_DEFAULTS: Record<string, Partial<LayerMotionConfig>> = {
  background: {
    entrance: { type: "fade_in", durationMs: 800, delayMs: 0, easing: "ease_out" },
    idle: { type: "none", speed: 1, loop: true },
    exit: { type: "fade_out", durationMs: 500, delayMs: 0, easing: "ease_in" },
  },
  "header-bar": {
    entrance: {
      type: "slide_down",
      durationMs: 500,
      delayMs: 120,
      easing: "ease_out",
    },
    idle: { type: "none", speed: 1, loop: true },
    exit: { type: "slide_up", durationMs: 350, delayMs: 0, easing: "ease_in" },
  },
  "main-video": {
    entrance: {
      type: "scale_in",
      durationMs: 600,
      delayMs: 200,
      easing: "ease_out",
    },
    idle: { type: "slow_zoom", speed: 0.35, loop: true },
    exit: { type: "scale_out", durationMs: 400, delayMs: 0, easing: "ease_in" },
  },
  /** Alias for main video container layer role */
  main_video_container: {
    entrance: {
      type: "scale_in",
      durationMs: 600,
      delayMs: 200,
      easing: "ease_out",
    },
    idle: { type: "slow_zoom", speed: 0.35, loop: true },
    exit: { type: "scale_out", durationMs: 400, delayMs: 0, easing: "ease_in" },
  },
  "left-side-panel": {
    entrance: {
      type: "fade_in",
      durationMs: 400,
      delayMs: 160,
      easing: "ease_out",
    },
    idle: { type: "none", speed: 1, loop: true },
    exit: { type: "fade_out", durationMs: 300, delayMs: 0, easing: "ease_in" },
  },
  "reporter-logo": {
    entrance: {
      type: "slide_left",
      durationMs: 550,
      delayMs: 280,
      easing: "ease_out",
    },
    idle: { type: "none", speed: 1, loop: true },
    exit: { type: "slide_left", durationMs: 350, delayMs: 0, easing: "ease_in" },
  },
  "optional-info-2": {
    entrance: {
      type: "fade_in",
      durationMs: 450,
      delayMs: 360,
      easing: "ease_out",
    },
    idle: { type: "float", speed: 0.6, loop: true },
    exit: { type: "fade_out", durationMs: 300, delayMs: 0, easing: "ease_in" },
  },
  "optional-info-1": {
    entrance: {
      type: "fade_in",
      durationMs: 450,
      delayMs: 360,
      easing: "ease_out",
    },
    idle: { type: "float", speed: 0.6, loop: true },
    exit: { type: "fade_out", durationMs: 300, delayMs: 0, easing: "ease_in" },
  },
  headline: {
    entrance: {
      type: "slide_up",
      durationMs: 500,
      delayMs: 420,
      easing: "ease_out",
    },
    idle: { type: "none", speed: 1, loop: true },
    exit: { type: "fade_out", durationMs: 320, delayMs: 0, easing: "ease_in" },
  },
  subheadline: {
    entrance: {
      type: "fade_in",
      durationMs: 450,
      delayMs: 520,
      easing: "ease_out",
    },
    idle: { type: "none", speed: 1, loop: true },
    exit: { type: "fade_out", durationMs: 280, delayMs: 0, easing: "ease_in" },
  },
  "lower-info-panel": {
    entrance: {
      type: "slide_up",
      durationMs: 450,
      delayMs: 380,
      easing: "ease_out",
    },
    idle: { type: "none", speed: 1, loop: true },
    exit: { type: "slide_down", durationMs: 350, delayMs: 0, easing: "ease_in" },
  },
  clock: {
    entrance: {
      type: "fade_in",
      durationMs: 350,
      delayMs: 100,
      easing: "ease_out",
    },
    idle: { type: "none", speed: 1, loop: true },
    exit: { type: "fade_out", durationMs: 250, delayMs: 0, easing: "ease_in" },
  },
  date: {
    entrance: {
      type: "fade_in",
      durationMs: 350,
      delayMs: 120,
      easing: "ease_out",
    },
    idle: { type: "none", speed: 1, loop: true },
    exit: { type: "fade_out", durationMs: 250, delayMs: 0, easing: "ease_in" },
  },
  "meta-info-bar": {
    entrance: {
      type: "fade_in",
      durationMs: 350,
      delayMs: 100,
      easing: "ease_out",
    },
    idle: { type: "none", speed: 1, loop: true },
    exit: { type: "fade_out", durationMs: 250, delayMs: 0, easing: "ease_in" },
  },
  place: {
    entrance: {
      type: "fade_in",
      durationMs: 350,
      delayMs: 140,
      easing: "ease_out",
    },
    idle: { type: "none", speed: 1, loop: true },
    exit: { type: "fade_out", durationMs: 250, delayMs: 0, easing: "ease_in" },
  },
  ticker: {
    entrance: {
      type: "slide_left",
      durationMs: 550,
      delayMs: 600,
      easing: "ease_out",
    },
    idle: { type: "parallax", speed: 0.4, loop: true },
    exit: { type: "slide_left", durationMs: 400, delayMs: 0, easing: "ease_in" },
  },
};
