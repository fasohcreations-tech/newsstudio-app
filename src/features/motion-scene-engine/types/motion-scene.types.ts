/**
 * Module 3.2 – Enterprise Motion Scene Engine types.
 * Mirrors 20260324000016_motion_scene_engine.sql
 */

export type MotionSceneType =
  | "intro"
  | "headline"
  | "anchor"
  | "story"
  | "image"
  | "video"
  | "quote"
  | "scripture"
  | "breaking_news"
  | "live"
  | "lower_third"
  | "reporter"
  | "guest"
  | "location"
  | "statistics"
  | "timeline"
  | "map"
  | "comparison"
  | "weather"
  | "promo"
  | "sponsor"
  | "cta"
  | "social"
  | "outro"
  | "credits"
  | "custom";

export type SceneLayerType =
  | "rectangle"
  | "circle"
  | "line"
  | "gradient"
  | "text"
  | "image"
  | "video"
  | "logo"
  | "svg"
  | "icon"
  | "shape"
  | "mask"
  | "blur"
  | "shadow"
  | "particle_placeholder"
  | "countdown_placeholder"
  | "clock_placeholder"
  | "ticker_placeholder";

export type ScenePlaceholderKind =
  | "text"
  | "headline"
  | "subtitle"
  | "body"
  | "quote"
  | "bible_verse"
  | "reference"
  | "reporter"
  | "guest"
  | "designation"
  | "location"
  | "organization"
  | "ticker"
  | "breaking_title"
  | "image"
  | "video"
  | "logo"
  | "portrait"
  | "background_video"
  | "background_image"
  | "date"
  | "time"
  | "weather"
  | "temperature"
  | "counter"
  | "score"
  | "election_result"
  | "stock_data"
  | "custom_variable";

export type SceneThemeMode = "light" | "dark" | "channel" | "custom";

export type SceneAspectFormat = "16:9" | "9:16" | "1:1" | "4:5" | "21:9";

export type AnimationKind =
  | "fade"
  | "slide"
  | "zoom"
  | "scale"
  | "push"
  | "wipe"
  | "typewriter"
  | "reveal"
  | "blur"
  | "bounce"
  | "elastic"
  | "rotate"
  | "opacity"
  | "custom";

export type SceneCanvas = {
  width: number;
  height: number;
  background: string;
  safe_area: { top: number; right: number; bottom: number; left: number };
  grid: { enabled: boolean; size: number };
  guides: Array<{ orientation: "horizontal" | "vertical"; position: number }>;
};

export type LayerTransform = {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
};

export type SceneLayer = {
  id: string;
  name: string;
  layer_type: SceneLayerType;
  parent_layer_id?: string | null;
  sort_order: number;
  start_ms: number;
  end_ms: number;
  offset_ms: number;
  visible: boolean;
  locked: boolean;
  group_id?: string | null;
  transform: LayerTransform;
  style: Record<string, unknown>;
  content: Record<string, unknown>;
  metadata: Record<string, unknown>;
};

export type ScenePlaceholder = {
  id: string;
  layer_id?: string | null;
  placeholder_kind: ScenePlaceholderKind;
  variable_key: string;
  label: string;
  default_value: string;
  token: string;
  binding_source: string;
  constraints: Record<string, unknown>;
  metadata: Record<string, unknown>;
  sort_order: number;
};

export type SceneVariable = {
  id: string;
  variable_key: string;
  label: string;
  kind: string;
  default_value: string;
  story_field?: string | null;
  brand_field?: string | null;
  auto_update: boolean;
  metadata: Record<string, unknown>;
  sort_order: number;
};

export type SceneAnimation = {
  id: string;
  layer_id?: string | null;
  preset_id?: string | null;
  name: string;
  kind: AnimationKind;
  start_ms: number;
  duration_ms: number;
  easing: string;
  parameters: Record<string, unknown>;
  keyframes: Array<{
    at_ms: number;
    property: string;
    value: number | string;
    easing: string;
  }>;
  metadata: Record<string, unknown>;
  sort_order: number;
};

export type MotionSceneDocument = {
  version: string;
  layers: SceneLayer[];
  placeholders: ScenePlaceholder[];
  variables: SceneVariable[];
  animations: SceneAnimation[];
};

export type MotionScene = {
  id: string;
  organization_id: string;
  category_id: string | null;
  brand_kit_id: string | null;
  parent_scene_id: string | null;
  project_id: string | null;
  timeline_id: string | null;
  clip_id: string | null;
  scene_type: MotionSceneType;
  name: string;
  description: string;
  version: number;
  is_template: boolean;
  is_favorite: boolean;
  is_published: boolean;
  aspect_format: SceneAspectFormat;
  theme_mode: SceneThemeMode;
  duration_ms: number;
  canvas: SceneCanvas;
  properties: Record<string, unknown>;
  timeline: {
    duration_ms: number;
    markers: Array<{ at_ms: number; label: string }>;
    tracks: Array<{ id: string; layer_id: string; name: string }>;
  };
  transitions: { in: SceneAnimation | null; out: SceneAnimation | null };
  preview: {
    playhead_ms: number;
    loop: boolean;
    safe_area_visible: boolean;
  };
  scene_document: MotionSceneDocument;
  resolved_bindings: Record<string, string>;
  metadata: Record<string, unknown>;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type MotionSceneWithRelations = MotionScene & {
  tags: string[];
  layers: SceneLayer[];
  placeholders: ScenePlaceholder[];
  variables: SceneVariable[];
  animations: SceneAnimation[];
};

export type SceneCategory = {
  id: string;
  organization_id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  sort_order: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type SceneTag = {
  id: string;
  organization_id: string;
  slug: string;
  name: string;
  color: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type SceneVersion = {
  id: string;
  organization_id: string;
  scene_id: string;
  version_number: number;
  name: string;
  scene_snapshot: Record<string, unknown>;
  created_by: string;
  created_at: string;
};

export type AnimationPreset = {
  id: string;
  organization_id: string;
  brand_kit_id: string | null;
  name: string;
  kind: AnimationKind;
  duration_ms: number;
  easing: string;
  config: Record<string, unknown>;
  is_system: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type MotionSceneServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

export type SceneLibraryFilters = {
  categoryId?: string;
  sceneType?: MotionSceneType;
  search?: string;
  favoritesOnly?: boolean;
  tags?: string[];
};

export type PlaceOnTimelineInput = {
  sceneId: string;
  projectId: string;
  trackId: string;
  startMs: number;
};

export type SceneEditorState = {
  playheadMs: number;
  durationMs: number;
  isPlaying: boolean;
  safeAreaVisible: boolean;
  gridVisible: boolean;
  zoom: number;
  selectedLayerId: string | null;
};
