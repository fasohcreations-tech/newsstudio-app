/**
 * Module 3.1 – Enterprise Timeline Engine types.
 * Mirrors 20260324000014_timeline_engine.sql extensions.
 */

import type {
  CreativeClipKind,
  CreativeTimeline,
  CreativeTimelineClip,
  CreativeTimelineTrack,
  CreativeTimelineTrackWithClips,
} from "@/features/creative-studio/types/creative-studio.types";

/** Extended track kinds (includes legacy audio/graphics/subtitle). */
export type EnterpriseTrackKind =
  | "video"
  | "image"
  | "graphics"
  | "title"
  | "subtitle"
  | "voice"
  | "music"
  | "sfx"
  | "marker"
  | "ai_suggestion"
  | "audio"; // legacy alias → voice/music

export type EnterpriseClipKind = CreativeClipKind;

export type RippleMode = "off" | "standard" | "trim" | "roll";

export type TimelineLinkKind =
  | "story"
  | "scene"
  | "content_object"
  | "voice_segment"
  | "script_paragraph";

export type ClipColorLabel =
  | "default"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "pink";

export type EnterpriseTimeline = CreativeTimeline & {
  story_id?: string | null;
  scene_id?: string | null;
  content_object_id?: string | null;
  voice_segment_id?: string | null;
  script_paragraph_id?: string | null;
  magnetic_enabled?: boolean;
  ripple_mode?: RippleMode;
};

export type EnterpriseTimelineTrack = CreativeTimelineTrack & {
  collapsed: boolean;
  visible: boolean;
  solo: boolean;
  color_label: string;
};

export type EnterpriseTimelineClip = CreativeTimelineClip & {
  locked: boolean;
  muted: boolean;
  hidden: boolean;
  color_label: string;
  content_object_id: string | null;
  scene_id: string | null;
  voice_segment_id: string | null;
  script_paragraph_id: string | null;
  source_clip_id: string | null;
};

export type EnterpriseTimelineTrackWithClips = EnterpriseTimelineTrack & {
  clips: EnterpriseTimelineClip[];
};

export type TimelineMarker = {
  id: string;
  organization_id: string;
  timeline_id: string;
  start_ms: number;
  label: string;
  color: string;
  metadata: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type TimelineLink = {
  id: string;
  organization_id: string;
  timeline_id: string;
  clip_id: string | null;
  kind: TimelineLinkKind;
  target_id: string;
  label: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type TimelineSelection = {
  clipIds: string[];
  trackIds: string[];
  markerIds: string[];
  playheadMs: number;
};

export type ClipPatch = Partial<
  Pick<
    EnterpriseTimelineClip,
    | "name"
    | "start_ms"
    | "end_ms"
    | "trim_start_ms"
    | "trim_end_ms"
    | "locked"
    | "muted"
    | "hidden"
    | "color_label"
    | "opacity"
    | "volume"
    | "metadata"
  >
>;

export type TrackPatch = Partial<
  Pick<
    EnterpriseTimelineTrack,
    | "name"
    | "muted"
    | "locked"
    | "collapsed"
    | "visible"
    | "solo"
    | "height"
    | "color"
    | "color_label"
    | "sort_order"
  >
>;

export type TimelineEngineState = {
  timeline: EnterpriseTimeline | null;
  tracks: EnterpriseTimelineTrackWithClips[];
  markers: TimelineMarker[];
  links: TimelineLink[];
  selection: TimelineSelection;
  zoomLevel: number;
  snapEnabled: boolean;
  rippleMode: RippleMode;
  magneticEnabled: boolean;
  scrollLeft: number;
};

export type UndoableCommand = {
  id: string;
  label: string;
  undo: () => void | Promise<void>;
  redo: () => void | Promise<void>;
};

export type { CreativeTimelineTrackWithClips };
