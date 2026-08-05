/**
 * Feature 040 — Professional Template Designer
 * Template JSON is layout + behaviour only. Never embed Story data.
 */

export type TemplateCategory =
  | "gnn"
  | "breaking_news"
  | "election"
  | "weather"
  | "financial"
  | "sports"
  | "live"
  | "promo"
  | "documentary"
  | "interview"
  | "social"
  | "vertical_reels"
  | "custom";

export type TemplateWorkflowState =
  | "draft"
  | "review"
  | "approved"
  | "published"
  | "archived";

export type TemplateAspectPreset =
  | "1920x1080"
  | "1080x1920"
  | "1080x1080"
  | "3840x2160";

export type TemplateLayerKind =
  | "video"
  | "image"
  | "text"
  | "svg"
  | "shape"
  | "audio"
  | "clock"
  | "ticker"
  | "logo"
  | "lower_third"
  | "background"
  | "overlay"
  | "mask"
  | "group"
  | "nested_group"
  | "adjustment";

export type TemplateBindingKey =
  | "headline"
  | "subheadline"
  | "ticker"
  | "story"
  | "reporter"
  | "location"
  | "date"
  | "video"
  | "image"
  | "audio"
  | "logo"
  | "advertisement"
  | "ai_output"
  | (string & {});

/** Canvas / artboard definition — resolution & guides only. */
export type TemplateCanvas = {
  width: number;
  height: number;
  aspectPreset: TemplateAspectPreset;
  background: string;
  safeAreaInsetPct: number;
  gridSize: number;
  showGrid: boolean;
  showGuides: boolean;
  showSafeArea: boolean;
};

export type TemplateTheme = {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamilies: string[];
};

export type TemplateTimelineDefaults = {
  defaultDurationMs: number;
  frameRate: number;
  entranceMs: number;
  exitMs: number;
};

/**
 * Master Template document.
 * References a Composer Scene for layout (Scene Composer remains the paint engine).
 * Does not store Story headline/media — Stories supply data at render time.
 */
export type BroadcastTemplate = {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  description: string;
  category: TemplateCategory;
  workflow_state: TemplateWorkflowState;
  version: number;
  /** Existing Scene Composer document this template designs. */
  composer_scene_id: string | null;
  canvas: TemplateCanvas;
  theme: TemplateTheme;
  timeline_defaults: TemplateTimelineDefaults;
  /** Declared binding slots (values come from Story, not the template). */
  binding_keys: TemplateBindingKey[];
  tags: string[];
  thumbnail_url: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type BroadcastTemplateSummary = Pick<
  BroadcastTemplate,
  | "id"
  | "code"
  | "name"
  | "description"
  | "category"
  | "workflow_state"
  | "version"
  | "composer_scene_id"
  | "canvas"
  | "thumbnail_url"
  | "tags"
  | "updated_at"
>;

export type CreateTemplateInput = {
  organizationId: string;
  userId: string;
  name: string;
  code?: string;
  description?: string;
  category?: TemplateCategory;
  aspectPreset?: TemplateAspectPreset;
  /** Optional: link an existing composer scene (e.g. GNN-001). */
  composerSceneId?: string | null;
};

export type UpdateTemplateInput = Partial<
  Pick<
    BroadcastTemplate,
    | "name"
    | "description"
    | "category"
    | "workflow_state"
    | "composer_scene_id"
    | "canvas"
    | "theme"
    | "timeline_defaults"
    | "binding_keys"
    | "tags"
    | "thumbnail_url"
    | "metadata"
  >
>;

/** Designer sub-routes under /templates/:templateId/... */
export type TemplateDesignerPanel =
  | "design"
  | "assets"
  | "layers"
  | "properties"
  | "animations"
  | "behaviours"
  | "shapes"
  | "effects"
  | "bindings"
  | "preview";
