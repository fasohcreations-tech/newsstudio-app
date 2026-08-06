import type {
  BlurEffectParams,
  BroadcastEffectType,
  ColorGradeEffectParams,
  GlassEffectParams,
  GlowEffectParams,
  LightSweepEffectParams,
  NoiseEffectParams,
  OutlineEffectParams,
  ParticleEffectParams,
  ShadowEffectParams,
} from "@/features/scene-composer/lib/broadcast-effects/types";

export const DEFAULT_LIGHT_SWEEP: LightSweepEffectParams = {
  enabled: true,
  path: "diagonal",
  angle: 45,
  start: 0,
  end: 100,
  width: 18,
  opacity: 0.55,
  speed: 0.55,
  softness: 0.45,
  color: "#FFFFFF",
  repeatDelayMs: 900,
  loop: true,
  blendMode: "screen",
  direction: "forward",
};

export const DEFAULT_OUTER_GLOW: GlowEffectParams = {
  enabled: true,
  color: "#38BDF8",
  radius: 18,
  intensity: 0.85,
  opacity: 0.75,
  blendMode: "screen",
};

export const DEFAULT_INNER_GLOW: GlowEffectParams = {
  enabled: true,
  color: "#FFFFFF",
  radius: 12,
  intensity: 0.55,
  opacity: 0.45,
  blendMode: "overlay",
};

export const DEFAULT_DROP_SHADOW: ShadowEffectParams = {
  enabled: true,
  color: "#000000",
  distance: 10,
  blur: 18,
  opacity: 0.45,
  angle: 225,
};

export const DEFAULT_INNER_SHADOW: ShadowEffectParams = {
  enabled: true,
  color: "#000000",
  distance: 4,
  blur: 10,
  opacity: 0.35,
  angle: 225,
};

export const DEFAULT_GLASS: GlassEffectParams = {
  enabled: true,
  opacity: 0.28,
  blur: 10,
  noise: 0.12,
  reflection: 0.35,
  tint: "rgba(255,255,255,0.18)",
};

export const DEFAULT_BLUR: BlurEffectParams = {
  enabled: true,
  radius: 4,
};

export const DEFAULT_COLOR_GRADE: ColorGradeEffectParams = {
  enabled: true,
  brightness: 1,
  contrast: 1,
  saturate: 1,
  hueRotate: 0,
};

export const DEFAULT_OUTLINE: OutlineEffectParams = {
  enabled: true,
  color: "#FFFFFF",
  width: 2,
  opacity: 0.9,
};

export const DEFAULT_NOISE: NoiseEffectParams = {
  enabled: true,
  opacity: 0.12,
  scale: 1,
};

export const DEFAULT_PARTICLE: ParticleEffectParams = {
  enabled: true,
  opacity: 0.35,
  density: 0.4,
  speed: 0.5,
  color: "#FFFFFF",
};

export const EFFECT_CATALOG: Array<{
  type: BroadcastEffectType;
  name: string;
  category:
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
  description: string;
}> = [
  {
    type: "light_sweep",
    name: "Light Sweep",
    category: "lighting",
    description: "Diagonal animated highlight band",
  },
  {
    type: "outer_glow",
    name: "Outer Glow",
    category: "glow",
    description: "Soft outer light glow",
  },
  {
    type: "inner_glow",
    name: "Inner Glow",
    category: "glow",
    description: "Inner edge glow",
  },
  {
    type: "drop_shadow",
    name: "Drop Shadow",
    category: "shadow",
    description: "Outer drop shadow",
  },
  {
    type: "inner_shadow",
    name: "Inner Shadow",
    category: "shadow",
    description: "Inset shadow",
  },
  {
    type: "glass",
    name: "Glass Overlay",
    category: "glass",
    description: "Frosted glass + reflection",
  },
  {
    type: "blur",
    name: "Blur",
    category: "blur",
    description: "Gaussian blur",
  },
  {
    type: "color_grade",
    name: "Color Grade",
    category: "color",
    description: "Brightness / contrast / hue",
  },
  {
    type: "outline",
    name: "Outline",
    category: "outline",
    description: "Stroke outline around object",
  },
  {
    type: "noise",
    name: "Noise",
    category: "noise",
    description: "Film grain overlay",
  },
  {
    type: "particle_dust",
    name: "Particle Dust",
    category: "particle",
    description: "Soft floating particle dust",
  },
];
