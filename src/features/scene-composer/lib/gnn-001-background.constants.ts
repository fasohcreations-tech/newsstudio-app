/**
 * GNN-001 Layer 1 — reusable Broadcast Background Component.
 * Editable props only. No text, logos, or animations.
 */

export const GNN_001_BACKGROUND_COMPONENT_SLUG = "gnn-001-background";
export const GNN_001_BACKGROUND_LAYER_VERSION = "gnn-001-background-v2";

export type Gnn001BackgroundProps = {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  /** 0–1, intended range 0.05–0.10 */
  world_map_opacity: number;
  /** 0–1 soft radial glow strength behind main video */
  glow_intensity: number;
  grid_visibility: boolean;
};

export const GNN_001_BACKGROUND_DEFAULTS: Gnn001BackgroundProps = {
  primary_color: "#071225",
  secondary_color: "#0B1F3A",
  accent_color: "#1D4ED8",
  world_map_opacity: 0.08,
  glow_intensity: 0.42,
  grid_visibility: true,
};

/** Main video region — used only to place the soft radial glow. */
export const GNN_001_VIDEO_GLOW_ANCHOR = {
  x: 560,
  y: 96,
  width: 1344,
  height: 616,
} as const;

export const GNN_001_BACKGROUND_EDITABLE_PROPERTIES = [
  {
    key: "primary_color",
    label: "Primary Color",
    type: "color",
  },
  {
    key: "secondary_color",
    label: "Secondary Color",
    type: "color",
  },
  {
    key: "accent_color",
    label: "Accent Color",
    type: "color",
  },
  {
    key: "world_map_opacity",
    label: "World Map Opacity",
    type: "number",
    min: 0.05,
    max: 0.1,
    step: 0.01,
  },
  {
    key: "glow_intensity",
    label: "Glow Intensity",
    type: "number",
    min: 0,
    max: 1,
    step: 0.05,
  },
  {
    key: "grid_visibility",
    label: "Grid Visibility",
    type: "boolean",
  },
] as const;

export function resolveGnn001BackgroundProps(
  content: Record<string, unknown> = {},
  bindings: Record<string, string> = {},
): Gnn001BackgroundProps {
  const parseOpacity = (value: unknown, fallback: number) => {
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(1, Math.max(0, n));
  };

  const parseBool = (value: unknown, fallback: boolean) => {
    if (typeof value === "boolean") return value;
    if (value === "true" || value === "1") return true;
    if (value === "false" || value === "0") return false;
    return fallback;
  };

  return {
    primary_color:
      (typeof bindings.primary_color === "string" && bindings.primary_color) ||
      (typeof content.primary_color === "string" && content.primary_color) ||
      GNN_001_BACKGROUND_DEFAULTS.primary_color,
    secondary_color:
      (typeof bindings.secondary_color === "string" && bindings.secondary_color) ||
      (typeof content.secondary_color === "string" && content.secondary_color) ||
      GNN_001_BACKGROUND_DEFAULTS.secondary_color,
    accent_color:
      (typeof bindings.accent_color === "string" && bindings.accent_color) ||
      (typeof content.accent_color === "string" && content.accent_color) ||
      GNN_001_BACKGROUND_DEFAULTS.accent_color,
    world_map_opacity: parseOpacity(
      bindings.world_map_opacity ?? content.world_map_opacity,
      GNN_001_BACKGROUND_DEFAULTS.world_map_opacity,
    ),
    glow_intensity: parseOpacity(
      bindings.glow_intensity ?? content.glow_intensity,
      GNN_001_BACKGROUND_DEFAULTS.glow_intensity,
    ),
    grid_visibility: parseBool(
      bindings.grid_visibility ?? content.grid_visibility,
      GNN_001_BACKGROUND_DEFAULTS.grid_visibility,
    ),
  };
}
