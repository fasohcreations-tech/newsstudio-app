/**
 * Module 4.2 – Broadcast Effects Engine types.
 * Effects are reusable, stackable, and independent of object content.
 */

export type BroadcastEffectCategory =
  | "lighting"
  | "glow"
  | "shadow"
  | "glass"
  | "reflection"
  | "blur"
  | "color"
  | "outline"
  | "noise"
  | "particle";

export type BroadcastBlendMode =
  | "normal"
  | "screen"
  | "overlay"
  | "soft-light"
  | "hard-light"
  | "multiply"
  | "plus-lighter";

export type BroadcastEffectType =
  | "light_sweep"
  | "outer_glow"
  | "inner_glow"
  | "drop_shadow"
  | "inner_shadow"
  | "glass"
  | "blur"
  | "color_grade"
  | "outline"
  | "noise"
  | "particle_dust";

/** Travel axis preset. `custom` uses `angle` degrees. */
export type LightSweepPath =
  | "horizontal"
  | "vertical"
  | "diagonal"
  | "diagonal_alt"
  | "custom";

export type LightSweepEffectParams = {
  enabled: boolean;
  /**
   * Travel path preset. Presets write a matching `angle`; `custom` keeps
   * whatever angle the user set.
   */
  path: LightSweepPath;
  /** Degrees — used when path is `custom`, or synced from a preset. */
  angle: number;
  /**
   * Where the highlight enters, 0–100 along the travel axis
   * (0 = just before the near edge, 100 = just past the far edge).
   */
  start: number;
  /**
   * Where the highlight exits, 0–100 along the travel axis.
   * Can be less than `start` to reverse travel without flipping direction.
   */
  end: number;
  /** Highlight peak thickness (0–80). */
  width: number;
  opacity: number;
  /** Cycles per second. */
  speed: number;
  softness: number;
  color: string;
  /** Pause between loops in ms. */
  repeatDelayMs: number;
  loop: boolean;
  blendMode: BroadcastBlendMode;
  direction: "forward" | "reverse";
};

export type GlowEffectParams = {
  enabled: boolean;
  color: string;
  radius: number;
  intensity: number;
  opacity: number;
  blendMode: BroadcastBlendMode;
};

export type ShadowEffectParams = {
  enabled: boolean;
  color: string;
  distance: number;
  blur: number;
  opacity: number;
  angle: number;
};

export type GlassEffectParams = {
  enabled: boolean;
  opacity: number;
  blur: number;
  noise: number;
  reflection: number;
  tint: string;
};

export type BlurEffectParams = {
  enabled: boolean;
  radius: number;
};

export type ColorGradeEffectParams = {
  enabled: boolean;
  brightness: number;
  contrast: number;
  saturate: number;
  hueRotate: number;
};

export type OutlineEffectParams = {
  enabled: boolean;
  color: string;
  width: number;
  opacity: number;
};

export type NoiseEffectParams = {
  enabled: boolean;
  opacity: number;
  scale: number;
};

export type ParticleEffectParams = {
  enabled: boolean;
  opacity: number;
  density: number;
  speed: number;
  color: string;
};

export type BroadcastEffectParamsByType = {
  light_sweep: LightSweepEffectParams;
  outer_glow: GlowEffectParams;
  inner_glow: GlowEffectParams;
  drop_shadow: ShadowEffectParams;
  inner_shadow: ShadowEffectParams;
  glass: GlassEffectParams;
  blur: BlurEffectParams;
  color_grade: ColorGradeEffectParams;
  outline: OutlineEffectParams;
  noise: NoiseEffectParams;
  particle_dust: ParticleEffectParams;
};

export type BroadcastEffectInstance<
  T extends BroadcastEffectType = BroadcastEffectType,
> = {
  id: string;
  type: T;
  name: string;
  category: BroadcastEffectCategory;
  enabled: boolean;
  params: BroadcastEffectParamsByType[T];
};

export type BroadcastEffectStack = {
  version: 1;
  effects: BroadcastEffectInstance[];
};

export const EFFECTS_METADATA_KEY = "effects" as const;
