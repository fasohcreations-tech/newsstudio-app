/**
 * Production Pipeline Step 3 — Timeline Assembly Engine types.
 * Clips reference Scene Instances; Scene remains source of truth.
 */

export type StoryTimelineStatus =
  | "draft"
  | "assembling"
  | "ready"
  | "editing"
  | "locked"
  | "archived";

export type StoryTimelineTrackKind =
  | "scene"
  | "voice"
  | "music"
  | "graphics"
  | "ticker"
  | "advertisement"
  | "other";

export type StoryTimelineTransitionType =
  | "cut"
  | "fade"
  | "cross_dissolve"
  | "slide"
  | "push"
  | "wipe"
  | "broadcast_reveal";

export type StoryTimelineRow = {
  id: string;
  organization_id: string;
  story_id: string;
  package_id: string | null;
  title: string;
  status: StoryTimelineStatus;
  duration_ms: number;
  resolution_width: number;
  resolution_height: number;
  frame_rate: number;
  aspect_ratio: string;
  metadata: Record<string, unknown>;
  assembled_at: string | null;
  assembled_by: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type StoryTimelineTrackRow = {
  id: string;
  organization_id: string;
  timeline_id: string;
  kind: StoryTimelineTrackKind;
  name: string;
  sort_order: number;
  height: number;
  color: string | null;
  muted: boolean;
  locked: boolean;
  visible: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type StoryTimelineClipRow = {
  id: string;
  organization_id: string;
  timeline_id: string;
  track_id: string;
  scene_instance_id: string | null;
  voice_segment_id: string | null;
  name: string;
  start_ms: number;
  end_ms: number;
  duration_ms: number;
  trim_in_ms: number;
  trim_out_ms: number | null;
  enabled: boolean;
  locked: boolean;
  visible: boolean;
  sort_order: number;
  scene_synced_at: string | null;
  scene_revision: string | null;
  metadata: Record<string, unknown>;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type StoryTimelineTransitionRow = {
  id: string;
  organization_id: string;
  timeline_id: string;
  from_clip_id: string;
  to_clip_id: string;
  transition_type: StoryTimelineTransitionType;
  duration_ms: number;
  parameters: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type StoryTimelineBundle = {
  timeline: StoryTimelineRow;
  tracks: StoryTimelineTrackRow[];
  clips: StoryTimelineClipRow[];
  transitions: StoryTimelineTransitionRow[];
};

export type SceneSyncPrompt = {
  clipId: string;
  sceneInstanceId: string;
  clipName: string;
  sceneName: string;
  sceneUpdatedAt: string;
  clipSyncedAt: string | null;
};

export type AssembleTimelineResult = {
  bundle: StoryTimelineBundle;
  created: boolean;
  replacedClipCount: number;
};
