/**
 * Creative Studio row types — mirror 20260324000013_creative_studio.sql.
 * Replace with Tables<"..."> after regenerating database.types.ts.
 */

export type CreativeProjectStatus = "draft" | "active" | "archived";
export type CreativeTrackKind = "video" | "audio" | "graphics" | "subtitle";
export type CreativeClipKind =
  | "image"
  | "video"
  | "audio"
  | "graphic"
  | "subtitle"
  | "marker";
export type CreativePlaceholderKind =
  | "headline"
  | "anchor"
  | "image"
  | "video"
  | "voice"
  | "music"
  | "logo"
  | "ticker"
  | "outro";

export type CreativeProject = {
  id: string;
  organization_id: string;
  story_id: string | null;
  title: string;
  description: string;
  status: CreativeProjectStatus;
  frame_rate: number;
  resolution_width: number;
  resolution_height: number;
  duration_ms: number;
  thumbnail_url: string | null;
  settings: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type CreativeProjectInsert = Omit<
  CreativeProject,
  "id" | "created_at" | "updated_at" | "deleted_at"
> & { id?: string };

export type CreativeProjectUpdate = Partial<
  Omit<
    CreativeProject,
    "id" | "organization_id" | "created_by" | "created_at"
  >
>;

export type CreativeTimeline = {
  id: string;
  organization_id: string;
  project_id: string;
  title: string;
  duration_ms: number;
  zoom_level: number;
  snap_enabled: boolean;
  playhead_ms: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type CreativeTimelineInsert = Omit<
  CreativeTimeline,
  "id" | "created_at" | "updated_at"
> & { id?: string };

export type CreativeTimelineUpdate = Partial<
  Omit<CreativeTimeline, "id" | "organization_id" | "project_id" | "created_at">
>;

export type CreativeTimelineTrack = {
  id: string;
  organization_id: string;
  timeline_id: string;
  kind: CreativeTrackKind;
  name: string;
  sort_order: number;
  muted: boolean;
  locked: boolean;
  height: number;
  color: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type CreativeTimelineTrackInsert = Omit<
  CreativeTimelineTrack,
  "id" | "created_at" | "updated_at"
> & { id?: string };

export type CreativeTimelineClip = {
  id: string;
  organization_id: string;
  track_id: string;
  media_asset_id: string | null;
  template_id: string | null;
  name: string;
  clip_kind: CreativeClipKind;
  start_ms: number;
  end_ms: number;
  trim_start_ms: number;
  trim_end_ms: number;
  position_x: number;
  position_y: number;
  scale: number;
  rotation: number;
  opacity: number;
  volume: number;
  speed: number;
  sort_order: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type CreativeTimelineClipInsert = Omit<
  CreativeTimelineClip,
  "id" | "created_at" | "updated_at" | "deleted_at"
> & { id?: string };

export type CreativeTimelineClipUpdate = Partial<
  Omit<
    CreativeTimelineClip,
    "id" | "organization_id" | "track_id" | "created_at"
  >
>;

export type CreativeTemplate = {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  category: string;
  thumbnail_url: string | null;
  aspect_ratio: string;
  duration_ms: number;
  metadata: Record<string, unknown>;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type CreativeTemplatePlaceholder = {
  id: string;
  organization_id: string;
  template_id: string;
  kind: CreativePlaceholderKind;
  label: string;
  sort_order: number;
  default_value: string;
  constraints: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type CreativeServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

export type CreativeProjectWithTimeline = CreativeProject & {
  timeline: CreativeTimeline | null;
  tracks: CreativeTimelineTrackWithClips[];
};

export type CreativeTimelineTrackWithClips = CreativeTimelineTrack & {
  clips: CreativeTimelineClip[];
};

export type CreativeTemplateWithPlaceholders = CreativeTemplate & {
  placeholders: CreativeTemplatePlaceholder[];
};

export type CreativeProjectListFilters = {
  status?: CreativeProjectStatus;
  storyId?: string;
  search?: string;
  includeArchived?: boolean;
  includeDeleted?: boolean;
};

export type ClipTransform = {
  startMs: number;
  endMs: number;
  positionX: number;
  positionY: number;
  scale: number;
  rotation: number;
  opacity: number;
  volume: number;
  speed: number;
};

export type PreviewState = {
  isPlaying: boolean;
  playheadMs: number;
  durationMs: number;
  resolution: { width: number; height: number };
  frameRate: number;
  safeAreaVisible: boolean;
  isFullscreen: boolean;
};

export type StudioLayoutState = {
  leftPanelTab: "explorer" | "media" | "templates";
  leftPanelWidth: number;
  rightPanelWidth: number;
  timelineHeight: number;
  snapEnabled: boolean;
  rippleEnabled: boolean;
  zoomLevel: number;
};

export type SelectedClipRef = {
  clipId: string;
  trackId: string;
} | null;
