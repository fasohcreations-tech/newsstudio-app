/**
 * GNN-001 Layer 3 — Main Video Container (refined broadcast frame).
 * Geometry locked to Main Video region. Does not alter other layers.
 */

export const GNN_001_MAIN_VIDEO_CONTAINER_SLUG = "gnn-001-main-video-container";
export const GNN_001_MAIN_VIDEO_LAYER_VERSION = "gnn-001-main-video-v2";

export const GNN_001_MAIN_VIDEO_GEOMETRY = {
  x: 560,
  y: 96,
  width: 1344,
  height: 616,
} as const;

export const GNN_001_MAIN_VIDEO_OBJECT_ID =
  "a1000001-0003-4000-8000-000000000001";

export type Gnn001VideoMediaMode =
  | "video"
  | "image"
  | "slideshow"
  | "live_feed"
  | "ai_video";

export type Gnn001VideoContainerState =
  | "normal"
  | "live"
  | "breaking"
  | "interview"
  | "remote_feed"
  | "fullscreen";

export type Gnn001VideoFit = "fit" | "fill" | "crop" | "center" | "zoom";

export type Gnn001MainVideoContainerProps = {
  border_width: number;
  border_color: string;
  corner_radius: number;
  inner_shadow: number;
  glass_opacity: number;
  frame_opacity: number;
  accent_color: string;
  accent_thickness: number;
  padding: number;
  safe_area: number;
  video_scale: number;
  video_position_x: number;
  video_position_y: number;
  video_rotation: number;
  video_opacity: number;
  crop: number;
  fit: Gnn001VideoFit;
  media_mode: Gnn001VideoMediaMode;
  container_state: Gnn001VideoContainerState;
  top_bar_visible: boolean;
  top_bar_height: number;
  top_bar_color: string;
  top_bar_opacity: number;
  bottom_bar_visible: boolean;
  bottom_bar_height: number;
  bottom_bar_color: string;
  bottom_bar_opacity: number;
  show_empty_state: boolean;
  animation_preset: "none" | "fade" | "zoom" | "slide" | "mask_reveal" | "push";
};

export const GNN_001_MAIN_VIDEO_DEFAULTS: Gnn001MainVideoContainerProps = {
  border_width: 1.5,
  border_color: "#2A3344",
  corner_radius: 10,
  inner_shadow: 0.35,
  glass_opacity: 0.03,
  frame_opacity: 1,
  accent_color: "#1D4ED8",
  accent_thickness: 2,
  padding: 8,
  safe_area: 10,
  video_scale: 1,
  video_position_x: 0,
  video_position_y: 0,
  video_rotation: 0,
  video_opacity: 1,
  crop: 0,
  fit: "fill",
  media_mode: "video",
  container_state: "normal",
  top_bar_visible: false,
  top_bar_height: 32,
  top_bar_color: "#071225",
  top_bar_opacity: 0.72,
  bottom_bar_visible: false,
  bottom_bar_height: 32,
  bottom_bar_color: "#071225",
  bottom_bar_opacity: 0.72,
  show_empty_state: true,
  animation_preset: "none",
};

/** State changes accent color only — frame structure stays fixed. */
export const GNN_001_VIDEO_STATE_ACCENTS: Record<
  Gnn001VideoContainerState,
  string
> = {
  normal: "#1D4ED8",
  live: "#DC2626",
  breaking: "#B91C1C",
  interview: "#2563EB",
  remote_feed: "#0EA5E9",
  fullscreen: "#94A3B8",
};

export const GNN_001_MAIN_VIDEO_EDITABLE_PROPERTIES = [
  "border_width",
  "border_color",
  "corner_radius",
  "inner_shadow",
  "glass_opacity",
  "frame_opacity",
  "accent_color",
  "accent_thickness",
  "padding",
  "safe_area",
  "video_scale",
  "video_position_x",
  "video_position_y",
  "video_rotation",
  "video_opacity",
  "crop",
  "fit",
  "media_mode",
  "container_state",
  "top_bar_visible",
  "top_bar_height",
  "top_bar_color",
  "top_bar_opacity",
  "bottom_bar_visible",
  "bottom_bar_height",
  "bottom_bar_color",
  "bottom_bar_opacity",
  "animation_preset",
] as const;

export const GNN_001_MAIN_VIDEO_COMPONENT_SLUGS = {
  frame: "gnn-001-video-frame",
  mask: "gnn-001-video-mask",
  corner: "gnn-001-video-corner-accent",
  overlay: "gnn-001-video-overlay",
  topBar: "gnn-001-video-top-bar",
  bottomBar: "gnn-001-video-bottom-bar",
  emptyState: "gnn-001-video-empty-state",
  container: GNN_001_MAIN_VIDEO_CONTAINER_SLUG,
} as const;

export function resolveGnn001MainVideoProps(
  content: Record<string, unknown> = {},
  bindings: Record<string, string> = {},
): Gnn001MainVideoContainerProps {
  const num = (value: unknown, fallback: number) => {
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) ? n : fallback;
  };
  const str = (value: unknown, fallback: string) =>
    typeof value === "string" && value.length > 0 ? value : fallback;
  const bool = (value: unknown, fallback: boolean) => {
    if (typeof value === "boolean") return value;
    if (value === "true" || value === "1") return true;
    if (value === "false" || value === "0") return false;
    return fallback;
  };

  const rawFit = str(
    bindings.video_fit ?? content.fit,
    GNN_001_MAIN_VIDEO_DEFAULTS.fit,
  );
  const fit = (
    rawFit === "cover"
      ? "fill"
      : rawFit === "contain"
        ? "fit"
        : rawFit
  ) as Gnn001VideoFit;
  const mediaMode = str(
    bindings.video_media_mode ?? content.media_mode,
    GNN_001_MAIN_VIDEO_DEFAULTS.media_mode,
  ) as Gnn001VideoMediaMode;
  const containerState = str(
    bindings.video_container_state ?? content.container_state,
    GNN_001_MAIN_VIDEO_DEFAULTS.container_state,
  ) as Gnn001VideoContainerState;
  const animation = str(
    bindings.video_animation_preset ?? content.animation_preset,
    GNN_001_MAIN_VIDEO_DEFAULTS.animation_preset,
  ) as Gnn001MainVideoContainerProps["animation_preset"];

  const brandAccent = str(
    bindings.accent_color ?? bindings.frame_accent_color,
    GNN_001_MAIN_VIDEO_DEFAULTS.accent_color,
  );

  return {
    border_width: Math.max(
      1,
      num(
        bindings.video_border_width ?? content.border_width,
        GNN_001_MAIN_VIDEO_DEFAULTS.border_width,
      ),
    ),
    border_color: str(
      bindings.video_border ?? content.border_color,
      GNN_001_MAIN_VIDEO_DEFAULTS.border_color,
    ),
    corner_radius: Math.min(
      16,
      Math.max(
        8,
        num(
          bindings.video_corner_radius ?? content.corner_radius,
          GNN_001_MAIN_VIDEO_DEFAULTS.corner_radius,
        ),
      ),
    ),
    inner_shadow: Math.min(
      1,
      Math.max(
        0,
        num(
          bindings.video_shadow ?? content.inner_shadow,
          GNN_001_MAIN_VIDEO_DEFAULTS.inner_shadow,
        ),
      ),
    ),
    glass_opacity: Math.min(
      0.12,
      Math.max(
        0,
        num(
          bindings.video_glass_opacity ?? content.glass_opacity,
          GNN_001_MAIN_VIDEO_DEFAULTS.glass_opacity,
        ),
      ),
    ),
    frame_opacity: Math.min(
      1,
      Math.max(
        0.2,
        num(
          bindings.video_frame_opacity ?? content.frame_opacity,
          GNN_001_MAIN_VIDEO_DEFAULTS.frame_opacity,
        ),
      ),
    ),
    accent_color: str(
      bindings.video_accent_color ?? content.accent_color,
      brandAccent,
    ),
    accent_thickness: Math.min(
      4,
      Math.max(
        1,
        num(
          bindings.video_accent_thickness ?? content.accent_thickness,
          GNN_001_MAIN_VIDEO_DEFAULTS.accent_thickness,
        ),
      ),
    ),
    padding: Math.max(
      0,
      num(
        bindings.video_padding ?? content.padding,
        GNN_001_MAIN_VIDEO_DEFAULTS.padding,
      ),
    ),
    safe_area: Math.max(
      0,
      num(
        bindings.video_safe_area ?? content.safe_area,
        GNN_001_MAIN_VIDEO_DEFAULTS.safe_area,
      ),
    ),
    video_scale: Math.min(
      2,
      Math.max(
        0.5,
        num(
          bindings.video_scale ?? content.video_scale,
          GNN_001_MAIN_VIDEO_DEFAULTS.video_scale,
        ),
      ),
    ),
    video_position_x: num(
      bindings.video_position_x ?? content.video_position_x,
      GNN_001_MAIN_VIDEO_DEFAULTS.video_position_x,
    ),
    video_position_y: num(
      bindings.video_position_y ?? content.video_position_y,
      GNN_001_MAIN_VIDEO_DEFAULTS.video_position_y,
    ),
    video_rotation: num(
      bindings.video_rotation ?? content.video_rotation,
      GNN_001_MAIN_VIDEO_DEFAULTS.video_rotation,
    ),
    video_opacity: Math.min(
      1,
      Math.max(
        0,
        num(
          bindings.video_opacity ?? content.video_opacity,
          GNN_001_MAIN_VIDEO_DEFAULTS.video_opacity,
        ),
      ),
    ),
    crop: Math.min(
      0.35,
      Math.max(
        0,
        num(bindings.video_crop ?? content.crop, GNN_001_MAIN_VIDEO_DEFAULTS.crop),
      ),
    ),
    fit: ["fit", "fill", "crop", "center", "zoom"].includes(fit)
      ? fit
      : GNN_001_MAIN_VIDEO_DEFAULTS.fit,
    media_mode: [
      "video",
      "image",
      "slideshow",
      "live_feed",
      "ai_video",
    ].includes(mediaMode)
      ? mediaMode
      : GNN_001_MAIN_VIDEO_DEFAULTS.media_mode,
    container_state: [
      "normal",
      "live",
      "breaking",
      "interview",
      "remote_feed",
      "fullscreen",
    ].includes(containerState)
      ? containerState
      : GNN_001_MAIN_VIDEO_DEFAULTS.container_state,
    top_bar_visible: bool(
      bindings.video_top_bar_visible ?? content.top_bar_visible,
      GNN_001_MAIN_VIDEO_DEFAULTS.top_bar_visible,
    ),
    top_bar_height: Math.max(
      20,
      num(
        bindings.video_top_bar_height ?? content.top_bar_height,
        GNN_001_MAIN_VIDEO_DEFAULTS.top_bar_height,
      ),
    ),
    top_bar_color: str(
      bindings.video_top_bar_color ?? content.top_bar_color,
      GNN_001_MAIN_VIDEO_DEFAULTS.top_bar_color,
    ),
    top_bar_opacity: Math.min(
      1,
      Math.max(
        0,
        num(
          bindings.video_top_bar_opacity ?? content.top_bar_opacity,
          GNN_001_MAIN_VIDEO_DEFAULTS.top_bar_opacity,
        ),
      ),
    ),
    bottom_bar_visible: bool(
      bindings.video_bottom_bar_visible ?? content.bottom_bar_visible,
      GNN_001_MAIN_VIDEO_DEFAULTS.bottom_bar_visible,
    ),
    bottom_bar_height: Math.max(
      20,
      num(
        bindings.video_bottom_bar_height ?? content.bottom_bar_height,
        GNN_001_MAIN_VIDEO_DEFAULTS.bottom_bar_height,
      ),
    ),
    bottom_bar_color: str(
      bindings.video_bottom_bar_color ?? content.bottom_bar_color,
      GNN_001_MAIN_VIDEO_DEFAULTS.bottom_bar_color,
    ),
    bottom_bar_opacity: Math.min(
      1,
      Math.max(
        0,
        num(
          bindings.video_bottom_bar_opacity ?? content.bottom_bar_opacity,
          GNN_001_MAIN_VIDEO_DEFAULTS.bottom_bar_opacity,
        ),
      ),
    ),
    show_empty_state: bool(
      bindings.video_show_empty_state ?? content.show_empty_state,
      GNN_001_MAIN_VIDEO_DEFAULTS.show_empty_state,
    ),
    animation_preset: [
      "none",
      "fade",
      "zoom",
      "slide",
      "mask_reveal",
      "push",
    ].includes(animation)
      ? animation
      : GNN_001_MAIN_VIDEO_DEFAULTS.animation_preset,
  };
}
