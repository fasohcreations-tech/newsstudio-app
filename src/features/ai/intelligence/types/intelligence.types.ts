/**
 * Module 6.0 — AI Center Intelligence Platform types.
 * Recommendations are suggestions only; never auto-applied.
 */

export const AI_INTELLIGENCE_DOMAINS = [
  "story",
  "scene",
  "timeline",
  "asset",
  "graphics",
  "voice",
  "broadcast",
] as const;

export type AIIntelligenceDomain = (typeof AI_INTELLIGENCE_DOMAINS)[number];

export const AI_RECOMMENDATION_STATUSES = [
  "pending",
  "accepted",
  "rejected",
  "superseded",
  "expired",
] as const;

export type AIRecommendationStatus =
  (typeof AI_RECOMMENDATION_STATUSES)[number];

export const AI_RECOMMENDATION_ACTIONS = [
  "created",
  "accepted",
  "rejected",
  "superseded",
  "expired",
  "regenerated",
] as const;

export type AIRecommendationAction =
  (typeof AI_RECOMMENDATION_ACTIONS)[number];

export type AIRecommendation = {
  id: string;
  organization_id: string;
  domain: AIIntelligenceDomain;
  recommendation_type: string;
  status: AIRecommendationStatus;
  title: string;
  summary: string | null;
  payload: Record<string, unknown>;
  confidence: number | null;
  model_version: string | null;
  prompt_id: string | null;
  prompt_version: string | null;
  ai_job_id: string | null;
  story_id: string | null;
  project_id: string | null;
  scene_id: string | null;
  media_asset_id: string | null;
  timeline_id: string | null;
  source_recommendation_id: string | null;
  origin: "ai" | "manual" | "hybrid";
  metadata: Record<string, unknown>;
  accepted_at: string | null;
  accepted_by: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  rejection_reason: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type AIRecommendationEvent = {
  id: string;
  organization_id: string;
  recommendation_id: string;
  action: AIRecommendationAction;
  actor_id: string | null;
  detail: Record<string, unknown>;
  created_at: string;
};

export type CreateRecommendationInput = {
  organizationId: string;
  userId: string;
  domain: AIIntelligenceDomain;
  recommendationType: string;
  title: string;
  summary?: string | null;
  payload?: Record<string, unknown>;
  confidence?: number | null;
  modelVersion?: string | null;
  promptId?: string | null;
  promptVersion?: string | null;
  aiJobId?: string | null;
  storyId?: string | null;
  projectId?: string | null;
  sceneId?: string | null;
  mediaAssetId?: string | null;
  timelineId?: string | null;
  sourceRecommendationId?: string | null;
  origin?: "ai" | "manual" | "hybrid";
  metadata?: Record<string, unknown>;
};

export type IntelligenceServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

export type IntelligenceDashboardSnapshot = {
  byDomain: Record<
    AIIntelligenceDomain,
    { pending: number; accepted: number; rejected: number }
  >;
  recent: AIRecommendation[];
  queue: Array<{
    id: string;
    job_type: string;
    status: string;
    provider: string;
    updated_at: string;
  }>;
  timelineDrafts: AIRecommendation[];
  voiceJobs: Array<{
    id: string;
    job_type: string;
    status: string;
    updated_at: string;
  }>;
  broadcastHealth: AIRecommendation[];
};

/** Editable timeline draft — never a rendered video. */
export type TimelineDraftScene = {
  sceneId?: string;
  sceneName: string;
  sceneType?: string;
  startMs: number;
  durationMs: number;
  aiGenerated: true;
  notes?: string;
};

export type TimelineDraftPayload = {
  title: string;
  durationMs: number;
  scenes: TimelineDraftScene[];
  rationale: string;
  regeneratable: true;
};

export type SceneRecommendationItem = {
  sceneId?: string;
  sceneName: string;
  sceneType: string;
  score: number;
  reasons: string[];
};

export type AssetAnalysisPayload = {
  tags: string[];
  categories: string[];
  description: string;
  ocrText?: string;
  faces?: Array<{ label: string; confidence: number }>;
  duplicateOfAssetId?: string | null;
  searchableText: string;
};

export type GraphicsRecommendationPayload = {
  themes: string[];
  colorPalettes: Array<{ name: string; colors: string[] }>;
  typography: Array<{ role: string; suggestion: string }>;
  shapeBehaviors: string[];
  motionPresets: string[];
};

export type BroadcastHealthPayload = {
  bitrateKbps: number;
  audioLevelDbfs: number;
  safeTitleOk: boolean;
  subtitleReadable: boolean;
  streamQuality: "excellent" | "good" | "fair" | "poor";
  issues: string[];
  recommendations: string[];
};
