/**
 * Module 4.0 – Motion Animation Framework types.
 * Animations are independent of scene object content/visual identity.
 */

export type MotionEntranceType =
  | "none"
  | "fade_in"
  | "slide_left"
  | "slide_right"
  | "slide_up"
  | "slide_down"
  | "scale_in"
  | "zoom"
  | "mask_reveal"
  | "wipe_left"
  | "wipe_right"
  | "opacity";

export type MotionIdleType =
  | "none"
  | "pulse"
  | "glow"
  | "float"
  | "parallax"
  | "slow_zoom"
  | "rotate"
  | "swivel"
  | "swell"
  | "orbit";

/** 3D rotation axis for rotate / swivel idle motions. */
export type MotionIdleAxis = "x" | "y" | "z";

/** Hinge / transform-origin for 3D rotate & swivel. */
export type MotionIdlePivot =
  | "center"
  | "left"
  | "right"
  | "top"
  | "bottom";

export type MotionExitType =
  | "none"
  | "fade_out"
  | "slide_left"
  | "slide_right"
  | "slide_up"
  | "slide_down"
  | "scale_out"
  | "mask_close"
  | "wipe"
  | "opacity";

export type MotionEasing =
  | "linear"
  | "ease_in"
  | "ease_out"
  | "ease_in_out"
  | "cubic";

export type MotionPhaseConfig = {
  type: string;
  durationMs: number;
  delayMs: number;
  easing: MotionEasing;
};

export type LayerMotionConfig = {
  /** Schema version for metadata.motion */
  version: 1;
  entrance: MotionPhaseConfig & { type: MotionEntranceType };
  idle: {
    type: MotionIdleType;
    speed: number;
    loop: boolean;
    /** Used by rotate / swivel — which 3D axis to spin around. Defaults to z. */
    axis?: MotionIdleAxis;
    /**
     * Swivel peak swing in degrees (±amplitude).
     * Rotate: degrees per second when set (else ~36°/s).
     * Default strong 3D = 40.
     */
    amplitude?: number;
    /** Rest / base angle offset along the chosen axis (degrees). */
    offset?: number;
    /** Hinge point for 3D rotation. Defaults to center. */
    pivot?: MotionIdlePivot;
    /** Orbit / path radius in pixels. Defaults to 48. */
    pathRadius?: number;
  };
  exit: MotionPhaseConfig & { type: MotionExitType };
  /** Global speed multiplier (1 = normal). */
  speed: number;
};

/** GPU-friendly sampled state applied at a playhead. */
export type SampledMotionStyle = {
  opacity: number;
  translateX: number;
  translateY: number;
  scale: number;
  /** @deprecated Prefer rotateZ — kept for older call sites. */
  rotate: number;
  rotateX: number;
  rotateY: number;
  rotateZ: number;
  /** Optional CSS transform-origin for 3D pivot. */
  transformOrigin?: string;
  clipPath?: string;
  filter?: string;
  /** Combined CSS transform string (translate + scale + 3D rotate). */
  transform: string;
  visible: boolean;
};

export const MOTION_METADATA_KEY = "motion" as const;
