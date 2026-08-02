/**
 * GNN-001 Layer 2 — Broadcast Frame System constants.
 */

export const GNN_001_FRAME_LAYER_VERSION = "gnn-001-frames-v1";

export type Gnn001FrameProps = {
  border_color: string;
  border_width: number;
  border_radius: number;
  glass_opacity: number;
  shadow_strength: number;
  accent_color: string;
  accent_width: number;
};

export const GNN_001_FRAME_DEFAULTS: Gnn001FrameProps = {
  border_color: "transparent",
  border_width: 0,
  border_radius: 12,
  glass_opacity: 0,
  shadow_strength: 0,
  accent_color: "#1D4ED8",
  accent_width: 0,
};

export const GNN_001_LIVE_ACCENT_DEFAULT = "#DC2626";

export type Gnn001FrameKind =
  | "composition"
  | "header"
  | "reporter"
  | "main_video"
  | "lower_info"
  | "ticker"
  | "clock_panel"
  | "live_indicator";

export type Gnn001FrameDefinition = {
  key: Gnn001FrameKind;
  slug: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Left accent strip on major panels */
  accent_strip: boolean;
  /** Decorative corners — Main Video only */
  corner_marks: boolean;
  /** Glass fill */
  glass: boolean;
  /** Outer composition chrome (no glass fill) */
  composition_border?: boolean;
  /** Small red LIVE/BREAKING placeholder */
  live_indicator?: boolean;
};

/**
 * Frame geometry aligned to existing GNN-001 skeleton regions.
 * Does not alter layout placeholder positions.
 */
export const GNN_001_FRAME_DEFINITIONS: Gnn001FrameDefinition[] = [
  {
    key: "composition",
    slug: "gnn-001-frame-composition",
    name: "Composition Frame",
    x: 20,
    y: 20,
    width: 1880,
    height: 1040,
    accent_strip: false,
    corner_marks: false,
    glass: false,
    composition_border: true,
  },
  {
    key: "header",
    slug: "gnn-001-frame-header",
    name: "Header Frame",
    x: 0,
    y: 0,
    width: 1920,
    height: 80,
    accent_strip: true,
    corner_marks: false,
    glass: true,
  },
  {
    key: "reporter",
    slug: "gnn-001-frame-reporter",
    name: "Reporter Panel Frame",
    x: 40,
    y: 96,
    width: 480,
    height: 616,
    accent_strip: true,
    corner_marks: false,
    glass: true,
  },
  {
    key: "main_video",
    slug: "gnn-001-frame-main-video",
    name: "Main Video Frame",
    x: 560,
    y: 96,
    width: 1344,
    height: 616,
    accent_strip: true,
    corner_marks: true,
    glass: true,
  },
  {
    key: "lower_info",
    slug: "gnn-001-frame-lower-info",
    name: "Lower Information Frame",
    x: 40,
    y: 728,
    width: 1840,
    height: 280,
    accent_strip: false,
    corner_marks: false,
    glass: false,
  },
  {
    key: "ticker",
    slug: "gnn-001-frame-ticker",
    name: "Ticker Frame",
    x: 0,
    y: 1020,
    width: 1920,
    height: 60,
    accent_strip: true,
    corner_marks: false,
    glass: true,
  },
  {
    key: "clock_panel",
    slug: "gnn-001-frame-clock-panel",
    name: "Clock Panel Frame",
    x: 1568,
    y: 24,
    width: 312,
    height: 108,
    accent_strip: true,
    corner_marks: false,
    glass: true,
  },
  {
    key: "live_indicator",
    slug: "gnn-001-frame-live-indicator",
    name: "Live / Breaking Accent",
    x: 56,
    y: 26,
    width: 52,
    height: 14,
    accent_strip: false,
    corner_marks: false,
    glass: false,
    live_indicator: true,
  },
];

export const GNN_001_FRAME_EDITABLE_PROPERTIES = [
  "border_color",
  "border_width",
  "border_radius",
  "glass_opacity",
  "shadow_strength",
  "accent_color",
  "accent_width",
] as const;

export function resolveGnn001FrameProps(
  content: Record<string, unknown> = {},
  bindings: Record<string, string> = {},
): Gnn001FrameProps {
  const num = (value: unknown, fallback: number) => {
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) ? n : fallback;
  };

  const str = (value: unknown, fallback: string) =>
    typeof value === "string" && value.length > 0 ? value : fallback;

  return {
    border_color: str(
      bindings.frame_border_color ?? content.border_color,
      GNN_001_FRAME_DEFAULTS.border_color,
    ),
    border_width: num(
      bindings.frame_border_width ?? content.border_width,
      GNN_001_FRAME_DEFAULTS.border_width,
    ),
    border_radius: num(
      bindings.frame_border_radius ?? content.border_radius,
      GNN_001_FRAME_DEFAULTS.border_radius,
    ),
    glass_opacity: Math.min(
      0.12,
      Math.max(
        0.08,
        num(
          bindings.frame_glass_opacity ?? content.glass_opacity,
          GNN_001_FRAME_DEFAULTS.glass_opacity,
        ),
      ),
    ),
    shadow_strength: Math.min(
      1,
      Math.max(
        0,
        num(
          bindings.frame_shadow_strength ?? content.shadow_strength,
          GNN_001_FRAME_DEFAULTS.shadow_strength,
        ),
      ),
    ),
    accent_color: str(
      bindings.frame_accent_color ?? content.accent_color,
      GNN_001_FRAME_DEFAULTS.accent_color,
    ),
    accent_width: num(
      bindings.frame_accent_width ?? content.accent_width,
      GNN_001_FRAME_DEFAULTS.accent_width,
    ),
  };
}
