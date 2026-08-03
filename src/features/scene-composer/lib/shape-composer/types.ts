/**
 * Module 4.4 – Shape Composer types.
 * Procedural broadcast shapes stored on object.metadata.shape.
 */

export const SHAPE_METADATA_KEY = "shape" as const;

export type ShapeKind =
  | "rectangle"
  | "rounded_rectangle"
  | "circle"
  | "ellipse"
  | "line"
  | "arrow"
  | "triangle"
  | "polygon"
  | "star"
  | "ribbon"
  | "speech_bubble"
  | "svg_path"
  | "custom_path"
  | "image_mask"
  | "video_mask"
  | "glass_panel"
  | "gradient_panel"
  | "border_frame"
  | "corner_accent"
  | "divider_line"
  | "ticker_bar"
  | "headline_bar"
  | "reporter_card"
  | "video_frame";

export type ShapeStrokeStyle =
  | "solid"
  | "dashed"
  | "dotted"
  | "double"
  | "none";

export type ShapeFillMode = "solid" | "gradient" | "none" | "image" | "video";

export type ShapeGradientType = "linear" | "radial";

export type ShapeAnchor =
  | "center"
  | "top_left"
  | "top"
  | "top_right"
  | "left"
  | "right"
  | "bottom_left"
  | "bottom"
  | "bottom_right";

/** Normalized (0–1) transform / grow origin inside the shape box. */
export type ShapeAnchorPoint = {
  x: number;
  y: number;
};

/**
 * Normalized rect of the shape inside the layer box.
 * Default fills the whole layer; adjust to place the shape anywhere.
 */
export type ShapePlacement = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ShapeCornerRadii = {
  topLeft: number;
  topRight: number;
  bottomRight: number;
  bottomLeft: number;
};

export type ShapeGradientStop = {
  offset: number;
  color: string;
};

export type ShapeGradient = {
  type: ShapeGradientType;
  angle: number;
  stops: ShapeGradientStop[];
};

export type ShapeShadow = {
  enabled: boolean;
  color: string;
  blur: number;
  spread: number;
  offsetX: number;
  offsetY: number;
  opacity: number;
};

export type ShapeGlow = {
  enabled: boolean;
  color: string;
  intensity: number;
  radius: number;
};

export type ShapeGlass = {
  enabled: boolean;
  blur: number;
  opacity: number;
  tint: string;
  noise: number;
  reflection: number;
};

export type ShapePathPoint = {
  id: string;
  x: number;
  y: number;
  /** Relative handle offsets (normalized 0–1 space of object box). */
  handleInX: number;
  handleInY: number;
  handleOutX: number;
  handleOutY: number;
  corner: boolean;
  smooth: boolean;
};

export type ShapePath = {
  closed: boolean;
  points: ShapePathPoint[];
};

export type ShapeBehaviorType =
  | "draw_on"
  | "border_build"
  | "corner_build"
  | "panel_grow"
  | "ribbon_expand"
  | "morph"
  | "split"
  | "merge"
  | "trace"
  | "outline_sweep"
  | "edge_sweep"
  | "light_sweep"
  /** Exit the intro shape to reveal the original layer (used with reveal). */
  | "reveal_exit"
  /** Multiple shape clones enter from one edge, cross, and exit the other. */
  | "travel_across"
  /** Staggered cascade of clones sweeping through the layer. */
  | "shape_cascade";

export type ShapeTravelDirection = "left" | "right" | "up" | "down";

export type ShapeRevealExitDirection =
  | "up"
  | "down"
  | "left"
  | "right"
  | "center";

/**
 * Exit motion family. Direction is separate (`exitDirection`) for wipe/slide.
 * Legacy values wipe_up / wipe_down / slide_left are still accepted when loading.
 */
export type ShapeRevealExitStyle =
  | "fade"
  | "scale_out"
  | "wipe"
  | "slide"
  | "reverse"
  | "wipe_up"
  | "wipe_down"
  | "slide_left";

export type ShapeBehaviorConfig = {
  type: ShapeBehaviorType;
  enabled: boolean;
  durationMs: number;
  delayMs: number;
  speed: number;
  loop: boolean;
  /** reveal_exit only — motion family. */
  exitStyle?: ShapeRevealExitStyle;
  /** reveal_exit only — wipe/slide direction. */
  exitDirection?: ShapeRevealExitDirection;
  /** travel_across / shape_cascade — travel axis. */
  travelDirection?: ShapeTravelDirection;
  /** travel_across / shape_cascade — number of clones (2–16). */
  travelCount?: number;
  /** travel_across / shape_cascade — clone size vs layer (0.12–0.7). */
  travelSize?: number;
  /** travel_across / shape_cascade — lane spread / stagger (0–1). */
  travelSpread?: number;
};

/** Shape appears first, then exits to reveal the original layer. */
export type ShapeRevealConfig = {
  enabled: boolean;
  entranceDurationMs: number;
  holdMs: number;
  exitDurationMs: number;
  exitStyle: ShapeRevealExitStyle;
  exitDirection: ShapeRevealExitDirection;
};

export type ShapeLibraryCategory =
  | "video_frames"
  | "reporter_cards"
  | "lower_third_panels"
  | "headline_panels"
  | "tickers"
  | "background_panels"
  | "corner_accents"
  | "broadcast_frames"
  | "divider_lines"
  | "information_boxes"
  | "buttons"
  | "icons"
  | "live_badges"
  | "breaking_news_bars";

export type ShapeComposerConfig = {
  version: 1;
  /** Master switch — when false, Shape Composer does not drive live preview. */
  enabled: boolean;
  kind: ShapeKind;
  /** Geometry extras beyond transform box. */
  radius: number;
  cornerRadii: ShapeCornerRadii;
  uniformCorners: boolean;
  sides: number;
  starPoints: number;
  starInnerRadius: number;
  arrowHeadSize: number;
  strokeWidth: number;
  strokeStyle: ShapeStrokeStyle;
  strokeColor: string;
  fillMode: ShapeFillMode;
  fill: string;
  gradient: ShapeGradient;
  opacity: number;
  shadow: ShapeShadow;
  glow: ShapeGlow;
  glass: ShapeGlass;
  reflection: number;
  borderPadding: number;
  padding: number;
  margin: number;
  rotation: number;
  anchor: ShapeAnchor;
  /** Free-form grow / transform origin (0–1). Overrides preset when set. */
  anchorPoint: ShapeAnchorPoint;
  /** Where the shape sits inside the layer (0–1). */
  placement: ShapePlacement;
  path: ShapePath;
  maskSrc: string;
  material: "standard" | "glass" | "metallic" | "broadcast_frame";
  behaviors: ShapeBehaviorConfig[];
  /** When enabled: shape intro → exit → original layer. */
  reveal: ShapeRevealConfig;
  lockedGeometry: boolean;
  hidden: boolean;
};

export type ShapeLibraryItem = {
  id: string;
  name: string;
  description: string;
  category: ShapeLibraryCategory;
  kind: ShapeKind;
  tags: string[];
  config: Partial<ShapeComposerConfig>;
  defaultWidth: number;
  defaultHeight: number;
};

export type ShapePreset = {
  id: string;
  name: string;
  group: "border" | "corner" | "material" | "accent" | "panel";
  config: Partial<ShapeComposerConfig>;
};

export type ShapeToolAction =
  | "create"
  | "duplicate"
  | "delete"
  | "convert"
  | "combine"
  | "split"
  | "merge"
  | "boolean_union"
  | "boolean_subtract"
  | "boolean_intersect"
  | "align_left"
  | "align_center"
  | "align_right"
  | "align_top"
  | "align_middle"
  | "align_bottom"
  | "distribute_h"
  | "distribute_v"
  | "snap"
  | "lock"
  | "hide";
