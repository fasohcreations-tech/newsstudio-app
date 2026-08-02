/**
 * AI Workspace constants (Module 2 – Story Assistant).
 */

export const AI_MESSAGE_ROLES = ["user", "assistant", "system"] as const;
export type AIMessageRole = (typeof AI_MESSAGE_ROLES)[number];

export const AI_MESSAGE_ROLE_LABELS: Record<AIMessageRole, string> = {
  user: "You",
  assistant: "Assistant",
  system: "System",
};

export const AI_WORKSPACE_ACTIONS = [
  "research",
  "generate_script",
  "translate",
  "generate_voice",
  "create_timeline",
  "create_thumbnail",
  "create_poster",
  "seo",
  "social_package",
  "fact_check",
] as const;

export type AIWorkspaceSuggestedAction = (typeof AI_WORKSPACE_ACTIONS)[number];

export const AI_WORKSPACE_ACTION_LABELS: Record<
  AIWorkspaceSuggestedAction,
  string
> = {
  research: "Research Story",
  generate_script: "Generate Script",
  translate: "Translate",
  generate_voice: "Generate Voice",
  create_timeline: "Create Timeline",
  create_thumbnail: "Create Thumbnail",
  create_poster: "Create Poster",
  seo: "SEO",
  social_package: "Social Package",
  fact_check: "Fact Check",
};

/** Maps workspace suggested actions → production mock task types (where applicable). */
export const AI_WORKSPACE_ACTION_TO_PRODUCTION_TASK: Partial<
  Record<
    AIWorkspaceSuggestedAction,
    | "research"
    | "script_generation"
    | "translation"
    | "voice_over"
    | "timeline_draft"
    | "thumbnail_suggestion"
    | "poster_suggestion"
    | "seo_metadata"
    | "social_media_package"
  >
> = {
  research: "research",
  generate_script: "script_generation",
  translate: "translation",
  generate_voice: "voice_over",
  create_timeline: "timeline_draft",
  create_thumbnail: "thumbnail_suggestion",
  create_poster: "poster_suggestion",
  seo: "seo_metadata",
  social_package: "social_media_package",
};

export const AI_WORKSPACE_OUTPUT_STATUSES = [
  "generating",
  "waiting_for_approval",
  "approved",
  "rejected",
  "cancelled",
] as const;

export type AIWorkspaceOutputStatus =
  (typeof AI_WORKSPACE_OUTPUT_STATUSES)[number];

export const AI_WORKSPACE_OUTPUT_STATUS_LABELS: Record<
  AIWorkspaceOutputStatus,
  string
> = {
  generating: "Generating",
  waiting_for_approval: "Waiting for Approval",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export const AI_WORKSPACE_TABS = [
  "chat",
  "tasks",
  "outputs",
  "workflow",
  "prompts",
  "jobs",
] as const;

export type AIWorkspaceTabId = (typeof AI_WORKSPACE_TABS)[number];

export const AI_WORKSPACE_TAB_LABELS: Record<AIWorkspaceTabId, string> = {
  chat: "Chat",
  tasks: "Tasks",
  outputs: "Outputs",
  workflow: "Workflow",
  prompts: "Prompts",
  jobs: "Jobs",
};
