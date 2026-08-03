/**
 * Story Scene Builder types (Production Pipeline Step 2).
 *
 * Binding model: Story Panel Subheadline → on-screen scene headline.
 * Story Headline remains story-level identity only.
 */

export type StoryPackageStatus =
  | "draft"
  | "building"
  | "ready"
  | "failed"
  | "archived";

export type StorySceneInstanceStatus =
  | "draft"
  | "ready"
  | "editing"
  | "archived";

/** One Story Panel derived from approved script / Sub Headline slots. */
export type AnalyzedStoryPanel = {
  index: number;
  label: string;
  /** Voice / narration text for this panel. */
  text: string;
  /** Story-level headline (identifier) — not bound to on-screen headline. */
  storyHeadline: string;
  /** Panel subheadline → becomes Scene Instance on-screen headline. */
  subheadline: string;
  bodyText: string;
  mediaKind: "" | "image" | "video" | "caption";
  mediaRef: string;
  mediaCaption: string;
  /** Relative weight for duration allocation (word count). */
  weight: number;
};

/** @deprecated Prefer AnalyzedStoryPanel */
export type AnalyzedStorySegment = AnalyzedStoryPanel;

export type TimedVoiceSegment = AnalyzedStoryPanel & {
  startMs: number;
  endMs: number;
  durationMs: number;
};

export type StoryPackageRow = {
  id: string;
  organization_id: string;
  story_id: string;
  title: string;
  status: StoryPackageStatus;
  master_template_id: string | null;
  master_template_code: string | null;
  scene_count: number;
  total_duration_ms: number;
  voice_duration_ms: number | null;
  ai_metadata: Record<string, unknown>;
  history: unknown[];
  error: string | null;
  built_at: string | null;
  built_by: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type StoryVoiceSegmentRow = {
  id: string;
  organization_id: string;
  story_id: string;
  package_id: string;
  sort_order: number;
  label: string;
  text: string;
  start_ms: number;
  end_ms: number;
  duration_ms: number;
  headline: string | null;
  subheadline: string | null;
  body_text: string | null;
  media_kind: string;
  media_ref: string;
  media_caption: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type StorySceneInstanceRow = {
  id: string;
  organization_id: string;
  package_id: string;
  story_id: string;
  master_template_id: string;
  scene_id: string;
  voice_segment_id: string | null;
  sort_order: number;
  timeline_order: number;
  name: string;
  status: StorySceneInstanceStatus;
  duration_ms: number;
  /** On-screen headline (from panel subheadline; editor-overridable). */
  headline: string;
  /** Secondary line / caption (editor-overridable). */
  subheadline: string;
  body_text: string;
  video_asset_ref: string;
  image_asset_ref: string;
  logo_ref: string;
  advertisement_ref: string;
  animations: unknown[];
  behaviors: unknown[];
  metadata: Record<string, unknown>;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type StoryPackageBundle = {
  package: StoryPackageRow;
  voiceSegments: StoryVoiceSegmentRow[];
  scenes: StorySceneInstanceRow[];
};

export type BuildStoryScenesResult = {
  package: StoryPackageRow;
  voiceSegments: StoryVoiceSegmentRow[];
  scenes: StorySceneInstanceRow[];
  createdSceneIds: string[];
};
