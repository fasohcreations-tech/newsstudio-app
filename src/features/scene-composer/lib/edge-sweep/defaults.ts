import type {
  EdgeSweepConfig,
  EdgeSweepPreset,
} from "@/features/scene-composer/lib/edge-sweep/types";

export function createDefaultEdgeSweep(
  partial?: Partial<EdgeSweepConfig>,
): EdgeSweepConfig {
  const margins =
    partial?.margins == null
      ? null
      : {
          top: Number(partial.margins.top) || 0,
          right: Number(partial.margins.right) || 0,
          bottom: Number(partial.margins.bottom) || 0,
          left: Number(partial.margins.left) || 0,
        };

  return {
    version: 1,
    enabled: false,
    style: "single",
    color: "#94A3B8",
    width: 2.5,
    length: 0.18,
    brightness: 1.1,
    opacity: 0.85,
    speed: 0.35,
    direction: "clockwise",
    loop: "continuous",
    cornerStyle: "rounded",
    cornerRadius: null,
    blendMode: "normal",
    glowIntensity: 0.55,
    trailLength: 0.55,
    trailFade: 0.55,
    margin: 0,
    ...partial,
    version: 1,
    margin: Number.isFinite(partial?.margin) ? Number(partial?.margin) : 0,
    margins,
  };
}

/** Broadcast-elegant built-in Edge Sweep presets. */
export const EDGE_SWEEP_PRESETS: EdgeSweepPreset[] = [
  {
    id: "edge.broadcast-blue",
    name: "Broadcast Blue",
    description: "Soft channel-blue perimeter sweep",
    tags: ["broadcast", "blue", "video"],
    config: createDefaultEdgeSweep({
      enabled: true,
      style: "broadcast_blue",
      color: "#5B8DEF",
      width: 3,
      length: 0.2,
      brightness: 1.2,
      opacity: 1,
      speed: 0.35,
      glowIntensity: 0.55,
      trailLength: 0.5,
      trailFade: 0.55,
      blendMode: "normal",
    }),
  },
  {
    id: "edge.premium-white",
    name: "Premium White",
    description: "Clean white highlight for lower thirds",
    tags: ["premium", "white", "panel"],
    config: createDefaultEdgeSweep({
      enabled: true,
      style: "single",
      color: "#1D4ED8",
      width: 2.75,
      length: 0.18,
      brightness: 1.1,
      opacity: 0.95,
      speed: 0.3,
      glowIntensity: 0.4,
      trailLength: 0.45,
      trailFade: 0.6,
      blendMode: "normal",
    }),
  },
  {
    id: "edge.breaking-red",
    name: "Breaking Red",
    description: "Restrained breaking-news accent",
    tags: ["breaking", "red"],
    config: createDefaultEdgeSweep({
      enabled: true,
      style: "dual",
      color: "#C23B3B",
      width: 2.5,
      length: 0.12,
      brightness: 1.2,
      opacity: 0.95,
      speed: 0.48,
      glowIntensity: 0.5,
      trailLength: 0.4,
      trailFade: 0.55,
      blendMode: "normal",
    }),
  },
  {
    id: "edge.gold-premium",
    name: "Gold Premium",
    description: "Subtle gold accent sweep",
    tags: ["gold", "premium"],
    config: createDefaultEdgeSweep({
      enabled: true,
      style: "gold",
      color: "#C6A15B",
      width: 2.5,
      length: 0.16,
      brightness: 1.15,
      opacity: 0.95,
      speed: 0.3,
      glowIntensity: 0.45,
      trailLength: 0.55,
      trailFade: 0.6,
      blendMode: "normal",
    }),
  },
  {
    id: "edge.glass-reflection",
    name: "Glass Reflection",
    description: "Metallic glass reflection along the rim",
    tags: ["glass", "metallic", "reflection"],
    config: createDefaultEdgeSweep({
      enabled: true,
      style: "metallic",
      color: "#94A3B8",
      width: 2.5,
      length: 0.22,
      brightness: 1.2,
      opacity: 0.9,
      speed: 0.4,
      glowIntensity: 0.4,
      trailLength: 0.7,
      trailFade: 0.7,
      blendMode: "soft-light",
    }),
  },
  {
    id: "edge.live-pulse",
    name: "Live Pulse Sweep",
    description: "Steady live-badge pulse around the frame",
    tags: ["live", "pulse"],
    config: createDefaultEdgeSweep({
      enabled: true,
      style: "four_corner",
      color: "#3B82F6",
      width: 2.5,
      length: 0.1,
      brightness: 1.2,
      opacity: 1,
      speed: 0.55,
      glowIntensity: 0.5,
      trailLength: 0.35,
      trailFade: 0.5,
      blendMode: "normal",
    }),
  },
];

export const EDGE_SWEEP_STYLE_OPTIONS: Array<{
  value: EdgeSweepConfig["style"];
  label: string;
}> = [
  { value: "single", label: "Single moving highlight" },
  { value: "dual", label: "Dual opposite highlights" },
  { value: "four_corner", label: "Four-corner chasing lights" },
  { value: "dashed", label: "Dashed sweep" },
  { value: "metallic", label: "Metallic reflection sweep" },
  { value: "gold", label: "Gold accent sweep" },
  { value: "broadcast_blue", label: "Blue broadcast sweep" },
];
