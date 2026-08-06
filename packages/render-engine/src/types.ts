/**
 * MediaOS Module 4.0 — Render Engine V2 shared types.
 * Independent of React / DOM. Scene JSON is adapted into these shapes.
 */

export type RenderBackendId = "dom" | "canvas";

export type Vec2 = { x: number; y: number };

export type RuntimeTransform = {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  rotation: number;
  opacity: number;
};

export type SampledMotion = {
  opacity: number;
  translateX: number;
  translateY: number;
  scale: number;
  rotateZ: number;
  rotateX?: number;
  rotateY?: number;
  visible: boolean;
  clipPath?: string | null;
  filter?: string | null;
};

export type ShapeKind =
  | "rectangle"
  | "rounded_rectangle"
  | "circle"
  | "ellipse"
  | "polygon"
  | "triangle"
  | "line"
  | "path"
  | "svg_path"
  | "gradient_panel"
  | "headline_bar"
  | "ticker_bar"
  | "border_frame"
  | "glass_panel"
  | string;

export type RuntimeShape = {
  enabled: boolean;
  kind: ShapeKind;
  fill?: string | null;
  stroke?: string | null;
  strokeWidth?: number;
  radius?: number;
  cornerRadii?: {
    topLeft: number;
    topRight: number;
    bottomRight: number;
    bottomLeft: number;
  };
  gradient?: {
    type: "linear" | "radial";
    angle?: number;
    stops: Array<{ offset: number; color: string }>;
  } | null;
  path?: string | null;
  shadow?: { color: string; blur: number; offsetX: number; offsetY: number } | null;
  glow?: { color: string; blur: number; strength: number } | null;
  revealProgress?: number;
  /** False once the reveal cover has exited — shape must not paint. */
  shapeVisible?: boolean;
  behaviour?: {
    opacity?: number;
    translateX?: number;
    translateY?: number;
    scale?: number;
    rotation?: number;
    lightSweepProgress?: number | null;
    edgeSweepProgress?: number | null;
  } | null;
};

/**
 * Sweeps are NOT Shape Composer behaviours — Light Sweep comes from the
 * broadcast effect stack and Edge Sweep from the per-object edge_sweep
 * behaviour. Both are sampled from playheadMs and drawn as overlays.
 */
/** CSS mix-blend-mode names carried from the effect config. */
export type SweepBlendMode = string;

export type RuntimeLightSweep = {
  /** 0–1 along start→end, or null while paused between loops. */
  progress: number | null;
  angle: number;
  /** Travel start along axis, 0–100. */
  start: number;
  /** Travel end along axis, 0–100. */
  end: number;
  width: number;
  opacity: number;
  softness: number;
  color: string;
  blendMode: SweepBlendMode;
  /** Optional box the sweep covers instead of the layer box (headline → panel). */
  coverage?: { left: number; top: number; width: number; height: number } | null;
  /**
   * Optional SVG path `d` in placement-local pixels.
   * Combined with outlineOffsetX/Y to clip the light band to the shape.
   */
  outlinePath?: string | null;
  outlineOffsetX?: number;
  outlineOffsetY?: number;
};

export type RuntimeEdgeSweep = {
  /** 0–1 around the perimeter. */
  progress: number;
  color: string;
  width: number;
  /** Arc length as a fraction of the perimeter. */
  length: number;
  opacity: number;
  brightness: number;
  glowIntensity: number;
  cornerRadius: number;
  trailLength: number;
  blendMode: SweepBlendMode;
  /** Path inset from layer edges (px). Positive = inward. */
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  /**
   * Optional perimeter samples in layer-local pixels (0..w / 0..h).
   * When set, edge sweep walks this ring instead of a rounded rect.
   */
  outlinePoints?: Array<[number, number]> | null;
};

export type RuntimeSweeps = {
  light: RuntimeLightSweep | null;
  edge: RuntimeEdgeSweep | null;
};

export type RuntimeLayerKind =
  | "background"
  | "video"
  | "image"
  | "shape"
  | "text"
  | "logo"
  | "advertisement"
  | "lower_third"
  | "ticker"
  | "effect"
  | "unknown";

export type RuntimeLayer = {
  id: string;
  name: string;
  kind: RuntimeLayerKind;
  sortOrder: number;
  startMs: number;
  endMs: number;
  visible: boolean;
  transform: RuntimeTransform;
  text?: string | null;
  fontFamily?: string | null;
  fontSize?: number | null;
  fontWeight?: string | number | null;
  fontStyle?: "normal" | "italic";
  underline?: boolean;
  color?: string | null;
  textAlign?: CanvasTextAlign;
  /** Vertical alignment inside the layer box. */
  verticalAlign?: "top" | "middle" | "bottom";
  lineHeight?: number;
  letterSpacing?: number;
  padding?: { top: number; right: number; bottom: number; left: number };
  textStroke?: { color: string; width: number } | null;
  textShadow?: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  } | null;
  textGlow?: { color: string; blur: number; strength: number } | null;
  textGradient?: {
    type: "linear" | "radial";
    angle: number;
    stops: Array<{ offset: number; color: string }>;
  } | null;
  /** Solid fill painted behind the layer (lower-third panel, ticker bar). */
  backgroundFill?: string | null;
  /** When true text is a single non-wrapping line (ticker). */
  singleLine?: boolean;
  /** When false, text does not wrap (mirrors auto_wrap=false). */
  wrap?: boolean;
  mediaUrl?: string | null;
  mediaKind?: "video" | "image" | null;
  /** Optional-info regions cycle a playlist on the Timeline clock. */
  mediaPlaylist?: string[] | null;
  slideIntervalMs?: number | null;
  objectFit?: "cover" | "contain" | "fill";
  shape?: RuntimeShape | null;
  /** Light / edge sweep overlays sampled from the Timeline playhead. */
  sweeps?: RuntimeSweeps | null;
  /** Region key used by broadcast templates (main_video_container, headline, …). */
  regionKey?: string | null;
  metadata?: Record<string, unknown>;
};

export type RuntimeBindings = Record<string, string>;

export type RuntimeScene = {
  id: string;
  name: string;
  width: number;
  height: number;
  durationMs: number;
  background: string;
  layers: RuntimeLayer[];
  bindings: RuntimeBindings;
};

export type RuntimeClip = {
  clipId: string;
  sceneId: string;
  name: string;
  startMs: number;
  endMs: number;
  durationMs: number;
  trimInMs: number;
  headline: string;
  subheadline: string;
  tickerText: string;
  videoUrl: string | null;
  imageUrl: string | null;
  logoUrl: string | null;
  advertisementUrl: string | null;
};

export type RuntimePlan = {
  width: number;
  height: number;
  frameRate: number;
  durationMs: number;
  voiceUrl: string | null;
  musicUrl: string | null;
  clips: RuntimeClip[];
  scenes: Record<string, RuntimeScene>;
};

export type FrameState = {
  playheadMs: number;
  frameIndex: number;
  clip: RuntimeClip | null;
  scene: RuntimeScene | null;
  scenePlayheadMs: number;
  layers: RuntimeLayerFrame[];
};

export type RuntimeLayerFrame = RuntimeLayer & {
  motion: SampledMotion;
  drawn: boolean;
};

export type RawFramePacket = {
  frameIndex: number;
  playheadMs: number;
  width: number;
  height: number;
  /** RGBA bytes, row-major. */
  rgba: Uint8ClampedArray;
};

export type RenderEngineLog = (message: string) => void;

export type MotionSampler = (
  layer: RuntimeLayer,
  playheadMs: number,
) => SampledMotion;

export type ShapeSampler = (
  layer: RuntimeLayer,
  playheadMs: number,
) => RuntimeShape | null;

export type SweepSampler = (
  layer: RuntimeLayer,
  playheadMs: number,
) => RuntimeSweeps | null;
