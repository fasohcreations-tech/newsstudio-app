/**
 * AI Production Engine constants (Module 2).
 */

import type { AIProviderId } from "@/features/ai/types/ai";

export const AI_PRODUCTION_STAGES = [
  "research",
  "editorial",
  "script",
  "translation",
  "voice",
  "timeline",
  "graphics",
  "publishing",
] as const;

export type AIProductionStage = (typeof AI_PRODUCTION_STAGES)[number];

export const AI_PRODUCTION_STAGE_LABELS: Record<AIProductionStage, string> = {
  research: "Research",
  editorial: "Editorial Assistant",
  script: "Script",
  translation: "Translation",
  voice: "Voice",
  timeline: "Timeline",
  graphics: "Graphics",
  publishing: "Publishing Package",
};

export const AI_WORKFLOW_TASK_TYPES = [
  "research",
  "headline_suggestion",
  "summary",
  "script_generation",
  "translation",
  "voice_over",
  "timeline_draft",
  "thumbnail_suggestion",
  "poster_suggestion",
  "seo_metadata",
  "social_media_package",
] as const;

export type AIWorkflowTaskType = (typeof AI_WORKFLOW_TASK_TYPES)[number];

export const AI_WORKFLOW_TASK_LABELS: Record<AIWorkflowTaskType, string> = {
  research: "Research",
  headline_suggestion: "Headline Suggestion",
  summary: "Summary",
  script_generation: "Script Generation",
  translation: "Translation",
  voice_over: "Voice-over",
  timeline_draft: "Timeline Draft",
  thumbnail_suggestion: "Thumbnail Suggestion",
  poster_suggestion: "Poster Suggestion",
  seo_metadata: "SEO Metadata",
  social_media_package: "Social Media Package",
};

export const AI_WORKFLOW_STATUSES = [
  "queued",
  "running",
  "waiting_for_approval",
  "completed",
  "failed",
  "cancelled",
] as const;

export type AIWorkflowStatus = (typeof AI_WORKFLOW_STATUSES)[number];

export const AI_WORKFLOW_STATUS_LABELS: Record<AIWorkflowStatus, string> = {
  queued: "Queued",
  running: "Running",
  waiting_for_approval: "Waiting for Approval",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

export const AI_WORKFLOW_TASK_STATUSES = [
  "queued",
  "running",
  "waiting_for_approval",
  "completed",
  "failed",
  "cancelled",
  "rejected",
] as const;

export type AIWorkflowTaskStatus = (typeof AI_WORKFLOW_TASK_STATUSES)[number];

export const AI_WORKFLOW_TASK_STATUS_LABELS: Record<
  AIWorkflowTaskStatus,
  string
> = {
  queued: "Queued",
  running: "Running",
  waiting_for_approval: "Waiting for Approval",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
  rejected: "Rejected",
};

/** Ordered pipeline blueprint: stage → tasks */
export const AI_PRODUCTION_PIPELINE: Array<{
  stage: AIProductionStage;
  tasks: AIWorkflowTaskType[];
  estimatedSeconds: number;
}> = [
  { stage: "research", tasks: ["research"], estimatedSeconds: 8 },
  {
    stage: "editorial",
    tasks: ["headline_suggestion", "summary"],
    estimatedSeconds: 10,
  },
  { stage: "script", tasks: ["script_generation"], estimatedSeconds: 12 },
  { stage: "translation", tasks: ["translation"], estimatedSeconds: 8 },
  { stage: "voice", tasks: ["voice_over"], estimatedSeconds: 10 },
  { stage: "timeline", tasks: ["timeline_draft"], estimatedSeconds: 9 },
  {
    stage: "graphics",
    tasks: ["thumbnail_suggestion", "poster_suggestion"],
    estimatedSeconds: 10,
  },
  {
    stage: "publishing",
    tasks: ["seo_metadata", "social_media_package"],
    estimatedSeconds: 8,
  },
];

export type AIProductionStageSettings = Record<AIProductionStage, boolean>;

export type AIProductionTaskProviderSettings = Partial<
  Record<AIWorkflowTaskType, AIProviderId>
>;

export type AIProductionSettings = {
  stages: AIProductionStageSettings;
  taskProviders: AIProductionTaskProviderSettings;
};

export function createDefaultAIProductionSettings(): AIProductionSettings {
  const stages = Object.fromEntries(
    AI_PRODUCTION_STAGES.map((s) => [s, true]),
  ) as AIProductionStageSettings;

  return {
    stages,
    taskProviders: {},
  };
}
