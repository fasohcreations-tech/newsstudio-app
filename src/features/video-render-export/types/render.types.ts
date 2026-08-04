/**
 * Module 3.1 — Video Rendering & Export Engine types.
 * Non-destructive: plans reference Timeline / Scene data; never mutate sources.
 */

export type VideoRenderStatus =
  | "queued"
  | "preparing"
  | "rendering"
  | "encoding"
  | "uploading"
  | "succeeded"
  | "failed"
  | "cancelled";

export type VideoExportFormat = "mp4" | "mov" | "webm";

export type VideoExportResolutionId =
  | "1920x1080"
  | "1280x720"
  | "3840x2160";

export type VideoRenderRow = {
  id: string;
  organization_id: string;
  story_id: string;
  timeline_id: string;
  status: VideoRenderStatus;
  progress: number;
  format: VideoExportFormat;
  resolution_width: number;
  resolution_height: number;
  frame_rate: number;
  bitrate_kbps: number;
  audio_codec: string;
  audio_channels: number;
  audio_sample_rate: number;
  video_codec: string;
  output_bucket: string | null;
  output_path: string | null;
  output_url: string | null;
  thumbnail_path: string | null;
  thumbnail_url: string | null;
  duration_ms: number | null;
  file_size_bytes: number | null;
  elapsed_ms: number | null;
  eta_ms: number | null;
  error: string | null;
  settings: Record<string, unknown>;
  render_plan: RenderPlan;
  started_at: string | null;
  finished_at: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type VideoExportSettings = {
  format: VideoExportFormat;
  resolution: VideoExportResolutionId;
  frameRate: number;
  bitrateKbps: number;
  includeVoice: boolean;
  includeMusic: boolean;
};

/** Snapshot of what to render — copied at job create time (source of truth for the job). */
export type RenderPlanClip = {
  clipId: string;
  sceneInstanceId: string | null;
  motionSceneId: string | null;
  name: string;
  startMs: number;
  endMs: number;
  durationMs: number;
  trimInMs: number;
  headline: string;
  subheadline: string;
  videoUrl: string | null;
  imageUrl: string | null;
  transitionToNext: string;
  transitionDurationMs: number;
};

export type RenderPlan = {
  version: 1;
  storyId: string;
  timelineId: string;
  durationMs: number;
  width: number;
  height: number;
  frameRate: number;
  format: VideoExportFormat;
  bitrateKbps: number;
  voiceUrl: string | null;
  musicUrl: string | null;
  clips: RenderPlanClip[];
  builtAt: string;
};

export type CreateVideoRenderInput = {
  storyId: string;
  settings: VideoExportSettings;
};

export type VideoRenderProgressPatch = {
  renderId: string;
  status?: VideoRenderStatus;
  progress?: number;
  elapsedMs?: number;
  etaMs?: number;
  error?: string | null;
  outputBucket?: string;
  outputPath?: string;
  outputUrl?: string;
  thumbnailPath?: string;
  thumbnailUrl?: string;
  durationMs?: number;
  fileSizeBytes?: number;
  videoCodec?: string;
  finished?: boolean;
};
