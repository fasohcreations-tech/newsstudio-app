/**
 * MediaOS AI Orchestrator types (Feature 005).
 * Provider-agnostic contracts — no module should call vendor SDKs directly.
 */

import type { AiJobStatus } from "@/shared/types/database.types";
import type { Json } from "@/shared/types/database.types";

export const AI_PROVIDER_IDS = [
  "openai",
  "gemini",
  "claude",
  "ollama",
] as const;

export type AIProviderId = (typeof AI_PROVIDER_IDS)[number];

export const AI_LOCALES = ["en", "ml"] as const;
export type AILocale = (typeof AI_LOCALES)[number];

/** UI label mapping for ai_jobs.status (DB uses succeeded = Completed). */
export const AI_JOB_STATUS_LABELS: Record<AiJobStatus, string> = {
  queued: "Queued",
  running: "Running",
  succeeded: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

export type ProviderHealthStatus =
  | "healthy"
  | "unconfigured"
  | "disabled"
  | "error";

export type ProviderHealth = {
  providerId: AIProviderId;
  status: ProviderHealthStatus;
  message: string;
  checkedAt: string;
  latencyMs?: number;
};

export type GenerateTextInput = {
  prompt: string;
  model?: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  maxTokens?: number;
  systemPrompt?: string;
  timeoutMs?: number;
};

export type GenerateTextResult = {
  text: string;
  model: string;
  tokensUsed?: number;
  finishReason?: string;
  raw?: Json;
};

export type StructuredOutputInput = {
  prompt: string;
  schemaName: string;
  schemaDescription?: string;
  model?: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  maxTokens?: number;
  systemPrompt?: string;
  timeoutMs?: number;
};

export type StructuredOutputResult<T> = {
  data: T;
  model: string;
  tokensUsed?: number;
  raw?: Json;
};

export type GenerateImageInput = {
  prompt: string;
  model?: string;
  size?: string;
  n?: number;
};

export type GenerateImageResult = {
  images: Array<{ url?: string; b64?: string }>;
  model: string;
  raw?: Json;
};

export type StreamTextInput = GenerateTextInput;

export type StreamTextChunk = {
  type: "delta" | "done" | "error";
  text?: string;
  error?: string;
};

export type CostEstimateInput = {
  model?: string;
  inputTokens: number;
  outputTokens: number;
  modality?: "text" | "image" | "audio";
};

export type CostEstimate = {
  currency: "USD";
  estimatedCost: number;
  breakdown?: string;
};

/**
 * Common provider interface. Every vendor adapter must implement this.
 */
export interface AIProvider {
  readonly id: AIProviderId;
  readonly displayName: string;
  readonly defaultModel: string;

  generateText(input: GenerateTextInput): Promise<GenerateTextResult>;
  generateStructuredOutput<T = unknown>(
    input: StructuredOutputInput,
  ): Promise<StructuredOutputResult<T>>;
  generateImage(input: GenerateImageInput): Promise<GenerateImageResult>;
  streamText(input: StreamTextInput): AsyncIterable<StreamTextChunk>;
  healthCheck(): Promise<ProviderHealth>;
  estimateCost(input: CostEstimateInput): Promise<CostEstimate>;
}

export type AIProviderToggle = {
  enabled: boolean;
  preferredModel?: string;
};

export type AIOrgSettings = {
  defaultProvider: AIProviderId;
  preferredModel: string;
  temperature: number;
  topP: number;
  topK: number;
  maxTokens: number;
  timeoutMs: number;
  retryCount: number;
  providers: Record<AIProviderId, AIProviderToggle>;
  /** Module 2 — AI Production Engine stage toggles + per-task providers */
  production?: import("@/features/ai-production/constants/production.constants").AIProductionSettings;
};

export type AIOrgSettingsPatch = Partial<
  Omit<AIOrgSettings, "providers" | "production">
> & {
  providers?: Partial<Record<AIProviderId, Partial<AIProviderToggle>>>;
  production?: import("@/features/ai-production/constants/production.constants").AIProductionSettings;
};

export type PromptTemplate = {
  id: string;
  version: string;
  category:
    | "news"
    | "translation"
    | "voice"
    | "graphics"
    | "publishing"
    | "editor"
    | "intelligence"
    | "media"
    | "system"
    | "ai";
  description: string;
  /** Locale → template body with {{variable}} placeholders */
  templates: Partial<Record<AILocale, string>> & { en: string };
  /** Optional system instruction templates (same variables as body). */
  systemTemplates?: Partial<Record<AILocale, string>> & { en?: string };
  variables: string[];
};

export type RenderedPrompt = {
  promptId: string;
  promptVersion: string;
  locale: AILocale;
  text: string;
  systemText?: string;
};

export type OrchestratorContext = {
  organizationId: string;
  userId: string;
  storyId?: string;
  contentObjectId?: string;
  jobType: string;
  locale?: AILocale;
  /** Required — all AI generations must use a PromptManager template. */
  promptId: string;
  promptVariables?: Record<string, string>;
  /** Optional secondary template for system instruction. */
  systemPromptId?: string;
  systemPromptVariables?: Record<string, string>;
  providerId?: AIProviderId;
  model?: string;
};

export type OrchestratorTextRequest = OrchestratorContext & {
  /**
   * @deprecated Raw prompts are rejected. Use promptId + promptVariables.
   * Kept optional only so TypeScript migration surfaces clear errors.
   */
  prompt?: never;
  systemPrompt?: never;
  /** Optional per-request overrides (AI Center tests, etc.) */
  temperature?: number;
  topP?: number;
  topK?: number;
  maxTokens?: number;
};

export type OrchestratorResult<T> = {
  jobId: string | null;
  data: T | null;
  error: string | null;
};

export type AIUsageStats = {
  totalJobs: number;
  queued: number;
  running: number;
  succeeded: number;
  failed: number;
  cancelled: number;
  tokensUsed: number;
  estimatedCost: number;
};

export type ProviderKeyPresence = Record<
  AIProviderId,
  { configured: boolean; envVar: string }
>;

export class AIProviderError extends Error {
  constructor(
    message: string,
    readonly providerId: AIProviderId,
    readonly code:
      | "not_implemented"
      | "unconfigured"
      | "disabled"
      | "timeout"
      | "invalid_api_key"
      | "rate_limit"
      | "quota_exhausted"
      | "network"
      | "provider_offline"
      | "provider_error" = "provider_error",
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}

export class AIOrchestratorError extends Error {
  constructor(
    message: string,
    readonly code:
      | "validation"
      | "settings"
      | "provider"
      | "job"
      | "not_implemented" = "provider",
  ) {
    super(message);
    this.name = "AIOrchestratorError";
  }
}
