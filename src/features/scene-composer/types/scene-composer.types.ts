/**
 * Module 3.3 – Enterprise Scene Composer types.
 * Mirrors 20260324000017_scene_composer.sql
 */

import type {
  MotionSceneDocument,
  MotionSceneWithRelations,
  SceneAnimation,
  SceneLayer,
  ScenePlaceholder,
  SceneVariable,
} from "@/features/motion-scene-engine/types/motion-scene.types";

export type SceneWorkflowState =
  | "draft"
  | "review"
  | "approved"
  | "published"
  | "archived";

export type SceneObjectType =
  | "rectangle"
  | "rounded_rectangle"
  | "circle"
  | "ellipse"
  | "line"
  | "polygon"
  | "svg"
  | "image"
  | "video"
  | "logo"
  | "text"
  | "rich_text"
  | "ticker"
  | "clock"
  | "date"
  | "weather"
  | "qr_code"
  | "countdown"
  | "counter"
  | "particle_placeholder"
  | "gradient"
  | "mask"
  | "group"
  | "component";

export type SceneComponentKind =
  | "logo"
  | "lower_third"
  | "title"
  | "background"
  | "animation"
  | "ticker"
  | "clock"
  | "custom";

export type SceneBindingSource = "story" | "brand" | "manual" | "ai" | "data_feed";

export type SceneKeyframeProperty =
  | "position_x"
  | "position_y"
  | "scale"
  | "rotation"
  | "opacity"
  | "blur"
  | "mask"
  | "color"
  | "width"
  | "height"
  | "text_reveal"
  | "custom";

export type ObjectTransform = {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  rotation: number;
  opacity: number;
};

export type TextObjectStyle = {
  font_family: string;
  font_size: number;
  font_weight: number;
  color: string;
  line_height: number;
  letter_spacing: number;
  alignment: "left" | "center" | "right" | "justify";
  vertical_alignment: "top" | "middle" | "bottom";
  unicode_script?: string;
  input_mode?: "unicode" | "manglish" | "voice";
  auto_resize?: boolean;
  wrap?: boolean;
  /** Feature 043 — independent Text Layer typography. */
  italic?: boolean;
  underline?: boolean;
  font_style?: "normal" | "italic";
  auto_width?: boolean;
  auto_height?: boolean;
  auto_wrap?: boolean;
  padding?: { top: number; right: number; bottom: number; left: number } | number;
  text_stroke?: { color: string; width: number } | null;
  text_shadow?: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  } | null;
  text_glow?: { color: string; blur: number; strength: number } | null;
  text_gradient?: {
    type: "linear" | "radial";
    angle?: number;
    stops: Array<{ offset: number; color: string }>;
  } | null;
  fill?: string;
};

export type SceneObject = {
  id: string;
  name: string;
  object_type: SceneObjectType;
  parent_object_id?: string | null;
  component_id?: string | null;
  sort_order: number;
  start_ms: number;
  end_ms: number;
  offset_ms: number;
  visible: boolean;
  locked: boolean;
  layer_color: string;
  transform: ObjectTransform;
  style: Record<string, unknown>;
  content: Record<string, unknown>;
  bindings: Record<string, string>;
  metadata: Record<string, unknown>;
};

export type SceneBinding = {
  id: string;
  object_id?: string | null;
  variable_key: string;
  binding_source: SceneBindingSource;
  target_property: string;
  token: string;
  resolved_value: string;
  auto_update: boolean;
  metadata: Record<string, unknown>;
  sort_order: number;
};

export type SceneKeyframe = {
  id: string;
  object_id?: string | null;
  animation_id?: string | null;
  property: SceneKeyframeProperty;
  at_ms: number;
  value: number | string | Record<string, unknown>;
  easing: string;
  bezier_curve?: { x1: number; y1: number; x2: number; y2: number } | null;
  sort_order: number;
  metadata: Record<string, unknown>;
};

export type SceneComponent = {
  id: string;
  organization_id: string;
  brand_kit_id: string | null;
  component_kind: SceneComponentKind;
  name: string;
  description: string;
  slug: string;
  version: number;
  is_system: boolean;
  is_favorite: boolean;
  object_tree: SceneObject[];
  default_bindings: Record<string, string>;
  metadata: Record<string, unknown>;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type ComposerSettings = {
  resolution_preset: "1920x1080" | "1080x1920" | "1080x1080" | "3840x2160" | "custom";
  custom_width: number;
  custom_height: number;
  background: string;
  output_profile: string;
  snap_enabled: boolean;
  grid_size: number;
  rulers_visible: boolean;
  guides_visible: boolean;
};

export type ComposerTimelineConfig = {
  duration_ms: number;
  frame_rate: number;
  loop_playback: boolean;
  snap_enabled: boolean;
  zoom_level: number;
  markers: Array<{ at_ms: number; label: string }>;
  tracks: Array<{ id: string; object_id: string; name: string }>;
};

/** Scene document v2.0 — composer extends motion scene document */
export type ComposerSceneDocument = MotionSceneDocument & {
  version: "2.0";
  objects: SceneObject[];
  bindings: SceneBinding[];
  keyframes: SceneKeyframe[];
};

export type ComposerViewportState = {
  panX: number;
  panY: number;
  zoom: number;
  snapEnabled: boolean;
  gridVisible: boolean;
  rulersVisible: boolean;
  guidesVisible: boolean;
  safeAreaVisible: boolean;
};

export type ComposerSelectionState = {
  selectedObjectIds: string[];
  primaryObjectId: string | null;
};

export type ComposerPlaybackState = {
  playheadMs: number;
  durationMs: number;
  frameRate: number;
  isPlaying: boolean;
  loopPlayback: boolean;
};

export type ComposerEditorState = {
  viewport: ComposerViewportState;
  selection: ComposerSelectionState;
  playback: ComposerPlaybackState;
  activeLeftTab: ComposerLeftTab;
  activeRightTab: ComposerRightTab;
};

export type ComposerLeftTab =
  | "library"
  | "templates"
  | "media"
  | "brand"
  | "icons"
  | "shapes"
  | "svg"
  | "stock"
  | "ai";

export type ComposerRightTab =
  | "properties"
  | "inspector"
  | "animations"
  | "variables"
  | "effects"
  | "bindings"
  | "theme";

export type ComposerScene = MotionSceneWithRelations & {
  workflow_state: SceneWorkflowState;
  frame_rate: number;
  composer_settings: ComposerSettings;
  composer_document: ComposerSceneDocument;
};

export type ComposerServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

export type ComposerHistoryCommand = {
  label: string;
  undo: () => void;
  redo: () => void;
};

export type AiComposerAction =
  | "choose_scene"
  | "populate_variables"
  | "replace_image"
  | "replace_video"
  | "generate_headline"
  | "generate_caption"
  | "generate_bible_verse"
  | "generate_quote";

export type AiComposerRequest = {
  action: AiComposerAction;
  scene_id: string;
  payload: Record<string, unknown>;
};
