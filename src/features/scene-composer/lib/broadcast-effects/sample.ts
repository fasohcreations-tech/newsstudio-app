import type { CSSProperties } from "react";

import type {
  BroadcastEffectInstance,
  BroadcastEffectStack,
  GlassEffectParams,
  GlowEffectParams,
  LightSweepEffectParams,
  ShadowEffectParams,
} from "@/features/scene-composer/lib/broadcast-effects/types";

export type SampledBroadcastEffects = {
  /** Combined CSS filter for the object wrapper. */
  filter: string;
  /** Box shadows (drop / outline approximations). */
  boxShadow: string;
  /** Extra opacity multiplier from glass etc. */
  opacityMultiplier: number;
  /** Overlay descriptors rendered as GPU layers. */
  overlays: BroadcastEffectOverlay[];
};

export type BroadcastEffectOverlay =
  | {
      kind: "light_sweep";
      effectId: string;
      params: LightSweepEffectParams;
    }
  | {
      kind: "glass";
      effectId: string;
      params: GlassEffectParams;
    }
  | {
      kind: "inner_glow";
      effectId: string;
      params: GlowEffectParams;
    }
  | {
      kind: "inner_shadow";
      effectId: string;
      params: ShadowEffectParams;
    }
  | {
      kind: "noise";
      effectId: string;
      opacity: number;
      scale: number;
    }
  | {
      kind: "particle_dust";
      effectId: string;
      opacity: number;
      density: number;
      speed: number;
      color: string;
    };

function shadowOffset(distance: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: Math.cos(rad) * distance,
    y: Math.sin(rad) * distance,
  };
}

function rgba(color: string, alpha: number): string {
  if (color.startsWith("rgba") || color.startsWith("rgb")) {
    return color;
  }
  const hex = color.replace("#", "");
  if (hex.length === 3) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  if (hex.length === 6) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return color;
}

/**
 * Resolve a stack into GPU-friendly CSS + overlay descriptors.
 * Pure function — preview applies result without layout reflow.
 */
export function sampleBroadcastEffects(
  stack: BroadcastEffectStack,
): SampledBroadcastEffects {
  const filters: string[] = [];
  const shadows: string[] = [];
  const overlays: BroadcastEffectOverlay[] = [];
  let opacityMultiplier = 1;

  for (const effect of stack.effects) {
    if (!effect.enabled) continue;

    switch (effect.type) {
      case "outer_glow": {
        const p = effect.params as GlowEffectParams;
        if (!p.enabled) break;
        const strength = Math.max(0, p.radius * p.intensity);
        shadows.push(
          `0 0 ${strength}px ${rgba(p.color, p.opacity * 0.55)}`,
          `0 0 ${strength * 1.8}px ${rgba(p.color, p.opacity * 0.28)}`,
        );
        break;
      }
      case "drop_shadow": {
        const p = effect.params as ShadowEffectParams;
        if (!p.enabled) break;
        const { x, y } = shadowOffset(p.distance, p.angle);
        shadows.push(`${x}px ${y}px ${p.blur}px ${rgba(p.color, p.opacity)}`);
        break;
      }
      case "blur": {
        const p = effect.params as { enabled: boolean; radius: number };
        if (!p.enabled) break;
        filters.push(`blur(${Math.max(0, p.radius)}px)`);
        break;
      }
      case "color_grade": {
        const p = effect.params as {
          enabled: boolean;
          brightness: number;
          contrast: number;
          saturate: number;
          hueRotate: number;
        };
        if (!p.enabled) break;
        filters.push(`brightness(${p.brightness})`);
        filters.push(`contrast(${p.contrast})`);
        filters.push(`saturate(${p.saturate})`);
        filters.push(`hue-rotate(${p.hueRotate}deg)`);
        break;
      }
      case "outline": {
        const p = effect.params as {
          enabled: boolean;
          color: string;
          width: number;
          opacity: number;
        };
        if (!p.enabled) break;
        const c = rgba(p.color, p.opacity);
        const w = Math.max(0, p.width);
        shadows.push(
          `${w}px 0 0 ${c}`,
          `-${w}px 0 0 ${c}`,
          `0 ${w}px 0 ${c}`,
          `0 -${w}px 0 ${c}`,
        );
        break;
      }
      case "light_sweep": {
        const p = effect.params as LightSweepEffectParams;
        if (!p.enabled) break;
        overlays.push({ kind: "light_sweep", effectId: effect.id, params: p });
        break;
      }
      case "glass": {
        const p = effect.params as GlassEffectParams;
        if (!p.enabled) break;
        overlays.push({ kind: "glass", effectId: effect.id, params: p });
        opacityMultiplier *= 1;
        break;
      }
      case "inner_glow": {
        const p = effect.params as GlowEffectParams;
        if (!p.enabled) break;
        overlays.push({ kind: "inner_glow", effectId: effect.id, params: p });
        break;
      }
      case "inner_shadow": {
        const p = effect.params as ShadowEffectParams;
        if (!p.enabled) break;
        overlays.push({ kind: "inner_shadow", effectId: effect.id, params: p });
        break;
      }
      case "noise": {
        const p = effect.params as {
          enabled: boolean;
          opacity: number;
          scale: number;
        };
        if (!p.enabled) break;
        overlays.push({
          kind: "noise",
          effectId: effect.id,
          opacity: p.opacity,
          scale: p.scale,
        });
        break;
      }
      case "particle_dust": {
        const p = effect.params as {
          enabled: boolean;
          opacity: number;
          density: number;
          speed: number;
          color: string;
        };
        if (!p.enabled) break;
        overlays.push({
          kind: "particle_dust",
          effectId: effect.id,
          opacity: p.opacity,
          density: p.density,
          speed: p.speed,
          color: p.color,
        });
        break;
      }
      default:
        break;
    }
  }

  return {
    filter: filters.length ? filters.join(" ") : "none",
    boxShadow: shadows.length ? shadows.join(", ") : "none",
    opacityMultiplier,
    overlays,
  };
}

export function mergeSampledEffectsIntoStyle(
  style: CSSProperties,
  sampled: SampledBroadcastEffects,
): CSSProperties {
  const existingFilter =
    typeof style.filter === "string" && style.filter !== "none"
      ? style.filter
      : "";
  const nextFilter =
    sampled.filter === "none"
      ? existingFilter || undefined
      : [existingFilter, sampled.filter].filter(Boolean).join(" ");

  const existingShadow =
    typeof style.boxShadow === "string" && style.boxShadow !== "none"
      ? style.boxShadow
      : "";
  const nextShadow =
    sampled.boxShadow === "none"
      ? existingShadow || undefined
      : [existingShadow, sampled.boxShadow].filter(Boolean).join(", ");

  return {
    ...style,
    filter: nextFilter,
    boxShadow: nextShadow,
    opacity:
      typeof style.opacity === "number"
        ? style.opacity * sampled.opacityMultiplier
        : style.opacity,
  };
}

/** Unused import guard helper for effect instance typing in UI. */
export function isEffectEnabled(effect: BroadcastEffectInstance) {
  return effect.enabled && Boolean((effect.params as { enabled?: boolean }).enabled);
}
