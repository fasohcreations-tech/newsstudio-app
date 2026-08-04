/**
 * Module 2.6 — AI Visual Understanding Engine types.
 */

export type VisualAnalysisStatus =
  | "queued"
  | "running"
  | "ready"
  | "failed"
  | "stale";

export type VisualEventKind =
  | "scene_boundary"
  | "shot_change"
  | "keyframe"
  | "speech"
  | "ocr"
  | "face"
  | "object"
  | "logo"
  | "landmark"
  | "location"
  | "action"
  | "keyword";

export type ClipSuggestionDecision =
  | "pending"
  | "accepted"
  | "rejected"
  | "superseded";

export type MediaAssetAnalysisRow = {
  id: string;
  organization_id: string;
  media_asset_id: string;
  status: VisualAnalysisStatus;
  source_provider: string | null;
  source_url: string | null;
  duration_ms: number | null;
  frame_rate: number | null;
  transcript: string | null;
  keywords: unknown;
  summary: string | null;
  semantic_payload: Record<string, unknown>;
  model_version: string | null;
  ai_job_id: string | null;
  error: string | null;
  analyzed_at: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type MediaAssetAnalysisEventRow = {
  id: string;
  organization_id: string;
  analysis_id: string;
  media_asset_id: string;
  kind: VisualEventKind;
  start_ms: number;
  end_ms: number;
  label: string;
  confidence: number | null;
  payload: Record<string, unknown>;
  created_at: string;
};

export type MediaAssetEmbeddingRow = {
  id: string;
  organization_id: string;
  analysis_id: string;
  media_asset_id: string;
  segment_index: number;
  start_ms: number;
  end_ms: number;
  text_content: string;
  embedding: number[];
  model_version: string | null;
  created_at: string;
};

export type StoryPanelClipSuggestionRow = {
  id: string;
  organization_id: string;
  story_id: string;
  panel_index: number;
  media_asset_id: string;
  analysis_id: string | null;
  suggested_in_ms: number;
  suggested_out_ms: number;
  confidence: number;
  reason: string;
  decision: ClipSuggestionDecision;
  accepted_clip_id: string | null;
  scene_headline: string;
  story_headline: string;
  keywords: unknown;
  voice_duration_ms: number | null;
  context: Record<string, unknown>;
  model_version: string | null;
  ai_job_id: string | null;
  created_by: string;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AnalysisBundle = {
  analysis: MediaAssetAnalysisRow;
  events: MediaAssetAnalysisEventRow[];
  embeddings: MediaAssetEmbeddingRow[];
};

export type PanelClipContext = {
  panelIndex: number;
  storyId: string;
  storyHeadline: string;
  sceneHeadline: string;
  category: string;
  keywords: string[];
  language: string;
  bodyText: string;
  voiceDurationMs: number | null;
};

export type ClipRecommendation = {
  suggestion: StoryPanelClipSuggestionRow;
  analysisId: string;
  inMs: number;
  outMs: number;
  confidence: number;
  reason: string;
};

export type TimecodedEventDraft = {
  kind: VisualEventKind;
  startMs: number;
  endMs: number;
  label: string;
  confidence?: number;
  payload?: Record<string, unknown>;
};

export type SegmentEmbeddingDraft = {
  segmentIndex: number;
  startMs: number;
  endMs: number;
  textContent: string;
  embedding: number[];
};
