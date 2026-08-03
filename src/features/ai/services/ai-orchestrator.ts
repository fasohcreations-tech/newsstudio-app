import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/shared/types/database.types";
import { getAIProvider, listAIProviders } from "@/features/ai/providers/registry";
import { isAIProviderError } from "@/features/ai/providers/base-provider";
import { getAIOrgSettings } from "@/features/ai/services/ai-settings.service";
import { renderPrompt } from "@/features/ai/services/prompt-manager";
import * as AIJobManager from "@/features/ai/services/ai-job-manager";
import { getDefaultAIRequestTimeoutMs } from "@/features/ai/lib/server-env";
import {
  AIOrchestratorError,
  AIProviderError,
  type AIProviderId,
  type CostEstimate,
  type CostEstimateInput,
  type GenerateImageResult,
  type GenerateTextResult,
  type OrchestratorResult,
  type OrchestratorTextRequest,
  type ProviderHealth,
} from "@/features/ai/types/ai";

type Client = SupabaseClient<Database>;

export type OrchestratorImageRequest = OrchestratorTextRequest & {
  size?: string;
  n?: number;
};

/**
 * AI Orchestrator — single entry point for all MediaOS AI calls.
 * Modules must not call OpenAI / Gemini / Claude / Ollama directly.
 */
export async function checkAllProvidersHealth(
  client: Client,
  organizationId: string,
): Promise<ProviderHealth[]> {
  const { settings } = await getAIOrgSettings(client, organizationId);
  const results: ProviderHealth[] = [];

  for (const provider of listAIProviders()) {
    const toggle = settings.providers[provider.id];
    if (!toggle?.enabled) {
      results.push({
        providerId: provider.id,
        status: "disabled",
        message: `${provider.displayName} is disabled in AI settings.`,
        checkedAt: new Date().toISOString(),
      });
      continue;
    }
    try {
      results.push(await provider.healthCheck());
    } catch (error) {
      results.push({
        providerId: provider.id,
        status: "error",
        message: error instanceof Error ? error.message : "Health check failed",
        checkedAt: new Date().toISOString(),
      });
    }
  }

  return results;
}

export async function checkProviderHealth(
  providerId: AIProviderId,
): Promise<ProviderHealth> {
  return getAIProvider(providerId).healthCheck();
}

export async function estimateCost(
  providerId: AIProviderId,
  input: CostEstimateInput,
): Promise<CostEstimate> {
  return getAIProvider(providerId).estimateCost(input);
}

/**
 * Text generation through the orchestrator.
 * Creates an ai_jobs row when possible, applies org settings, retries, and timeout.
 */
export async function generateText(
  client: Client,
  request: OrchestratorTextRequest,
): Promise<OrchestratorResult<GenerateTextResult>> {
  validateOrchestratorRequest(request);

  const { settings, error: settingsError } = await getAIOrgSettings(
    client,
    request.organizationId,
  );
  if (settingsError) {
    console.error("[AIOrchestrator] settings load failed", settingsError);
  }

  const providerId = request.providerId ?? settings.defaultProvider;
  const providerToggle = settings.providers[providerId];
  if (!providerToggle?.enabled) {
    return {
      jobId: null,
      data: null,
      error: `Provider ${providerId} is disabled in AI settings.`,
    };
  }

  const provider = getAIProvider(providerId);
  const model =
    request.model ??
    providerToggle.preferredModel ??
    settings.preferredModel ??
    provider.defaultModel;

  let promptText = "";
  let systemText: string | undefined;
  let promptMeta: Record<string, string> | null = null;

  if (!request.promptId?.trim()) {
    return {
      jobId: null,
      data: null,
      error:
        "A Prompt Manager promptId is required. Register prompts under src/features/ai/prompts.",
    };
  }

  try {
    const rendered = renderPrompt(
      request.promptId,
      request.promptVariables ?? {},
      request.locale ?? "en",
    );
    promptText = rendered.text;
    systemText = rendered.systemText;
    promptMeta = {
      promptId: rendered.promptId,
      promptVersion: rendered.promptVersion,
      locale: rendered.locale,
    };

    if (request.systemPromptId) {
      const systemRendered = renderPrompt(
        request.systemPromptId,
        request.systemPromptVariables ?? request.promptVariables ?? {},
        request.locale ?? "en",
      );
      systemText = systemRendered.text;
      promptMeta.systemPromptId = systemRendered.promptId;
      promptMeta.systemPromptVersion = systemRendered.promptVersion;
    }
  } catch (error) {
    return {
      jobId: null,
      data: null,
      error: error instanceof Error ? error.message : "Prompt render failed",
    };
  }

  if (!promptText.trim()) {
    return {
      jobId: null,
      data: null,
      error: "Rendered prompt is empty.",
    };
  }

  const timeoutMs =
    settings.timeoutMs || getDefaultAIRequestTimeoutMs() || 60_000;
  const retryCount = Math.max(0, settings.retryCount ?? 0);
  const temperature = request.temperature ?? settings.temperature;
  const topP = request.topP ?? settings.topP;
  const topK = request.topK ?? settings.topK;
  const maxTokens = request.maxTokens ?? settings.maxTokens;

  const requestPayload: Json = {
    prompt: promptText,
    systemPrompt: systemText ?? null,
    temperature,
    topP,
    topK,
    maxTokens,
    timeoutMs,
    retryCount,
    ...(promptMeta ?? {}),
    variables: request.promptVariables ?? null,
  };

  const enqueued = await AIJobManager.enqueueJob(client, {
    organizationId: request.organizationId,
    userId: request.userId,
    storyId: request.storyId ?? null,
    contentObjectId: request.contentObjectId,
    provider: providerId,
    model,
    jobType: request.jobType,
    request: requestPayload,
  });

  if (enqueued.error || !enqueued.job) {
    return {
      jobId: null,
      data: null,
      error: enqueued.error ?? "Unable to enqueue AI job.",
    };
  }

  const jobId = enqueued.job.id;
  const started = Date.now();
  await AIJobManager.markJobRunning(client, jobId, request.userId);

  const attempts = retryCount + 1;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const data = await provider.generateText({
        prompt: promptText,
        systemPrompt: systemText,
        model,
        temperature,
        topP,
        topK,
        maxTokens,
        timeoutMs,
      });

      const processingTimeMs = Date.now() - started;
      const cost = await provider.estimateCost({
        model,
        inputTokens:
          data.tokensUsed ?? Math.ceil(promptText.length / 4),
        outputTokens: Math.ceil((data.text?.length ?? 0) / 4),
      });

      await AIJobManager.markJobSucceeded(client, jobId, request.userId, {
        response: {
          text: data.text,
          finishReason: data.finishReason ?? null,
          attempt,
        },
        tokensUsed: data.tokensUsed ?? null,
        cost: cost.estimatedCost,
        processingTimeMs,
      });

      return { jobId, data, error: null };
    } catch (error) {
      lastError = error;
      const retryable = isRetryableError(error);
      console.error("[AIOrchestrator] generateText attempt failed", {
        jobId,
        providerId,
        attempt,
        retryable,
        message: toErrorMessage(error),
      });
      if (!retryable || attempt >= attempts) break;
      await sleep(250 * attempt);
    }
  }

  const processingTimeMs = Date.now() - started;
  const message = toErrorMessage(lastError);
  await AIJobManager.markJobFailed(
    client,
    jobId,
    request.userId,
    message,
    processingTimeMs,
  );
  return { jobId, data: null, error: message };
}

/**
 * Image generation through the orchestrator (Gemini image models).
 * Records tokens/cost on ai_jobs the same way as text generation.
 */
export async function generateImage(
  client: Client,
  request: OrchestratorImageRequest,
): Promise<OrchestratorResult<GenerateImageResult & { tokensUsed?: number; estimatedCost?: number }>> {
  validateOrchestratorRequest(request);

  const { settings, error: settingsError } = await getAIOrgSettings(
    client,
    request.organizationId,
  );
  if (settingsError) {
    console.error("[AIOrchestrator] settings load failed", settingsError);
  }

  const providerId = request.providerId ?? settings.defaultProvider;
  const providerToggle = settings.providers[providerId];
  if (!providerToggle?.enabled) {
    return {
      jobId: null,
      data: null,
      error: `Provider ${providerId} is disabled in AI settings.`,
    };
  }

  const provider = getAIProvider(providerId);
  const model =
    request.model ??
    process.env.DEFAULT_GEMINI_IMAGE_MODEL?.trim() ??
    "gemini-2.5-flash-image";

  if (!request.promptId?.trim()) {
    return {
      jobId: null,
      data: null,
      error:
        "A Prompt Manager promptId is required for image generation.",
    };
  }

  let promptText = "";
  let promptMeta: Record<string, string> | null = null;
  try {
    const rendered = renderPrompt(
      request.promptId,
      request.promptVariables ?? {},
      request.locale ?? "en",
    );
    promptText = rendered.text.trim();
    promptMeta = {
      promptId: rendered.promptId,
      promptVersion: rendered.promptVersion,
      locale: rendered.locale,
    };
  } catch (error) {
    return {
      jobId: null,
      data: null,
      error: error instanceof Error ? error.message : "Prompt render failed",
    };
  }

  if (!promptText) {
    return { jobId: null, data: null, error: "Rendered prompt is empty." };
  }

  const timeoutMs = Math.max(
    settings.timeoutMs || getDefaultAIRequestTimeoutMs() || 60_000,
    90_000,
  );
  const retryCount = Math.max(0, settings.retryCount ?? 0);

  const enqueued = await AIJobManager.enqueueJob(client, {
    organizationId: request.organizationId,
    userId: request.userId,
    storyId: request.storyId ?? null,
    contentObjectId: request.contentObjectId,
    provider: providerId,
    model,
    jobType: request.jobType,
    request: {
      prompt: promptText,
      size: request.size ?? null,
      n: request.n ?? 1,
      modality: "image",
      ...(promptMeta ?? {}),
      variables: request.promptVariables ?? null,
    },
  });

  if (enqueued.error || !enqueued.job) {
    return {
      jobId: null,
      data: null,
      error: enqueued.error ?? "Unable to enqueue AI job.",
    };
  }

  const jobId = enqueued.job.id;
  const started = Date.now();
  await AIJobManager.markJobRunning(client, jobId, request.userId);

  const attempts = retryCount + 1;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const data = await provider.generateImage({
        prompt: promptText,
        model,
        size: request.size,
        n: request.n ?? 1,
      });

      const processingTimeMs = Date.now() - started;
      const promptTokens = Math.ceil(promptText.length / 4);
      const tokensUsed = Math.max(promptTokens, 1200);
      const cost = await provider.estimateCost({
        model,
        inputTokens: promptTokens,
        outputTokens: 1000,
        modality: "image",
      });

      await AIJobManager.markJobSucceeded(client, jobId, request.userId, {
        response: {
          imageCount: data.images.length,
          attempt,
        },
        tokensUsed,
        cost: cost.estimatedCost,
        processingTimeMs,
      });

      return {
        jobId,
        data: { ...data, tokensUsed, estimatedCost: cost.estimatedCost },
        error: null,
      };
    } catch (error) {
      lastError = error;
      const retryable = isRetryableError(error);
      console.error("[AIOrchestrator] generateImage attempt failed", {
        jobId,
        providerId,
        attempt,
        retryable,
        message: toErrorMessage(error),
      });
      if (!retryable || attempt >= attempts) break;
      await sleep(250 * attempt);
    }
  }

  const processingTimeMs = Date.now() - started;
  const message = toErrorMessage(lastError);
  await AIJobManager.markJobFailed(
    client,
    jobId,
    request.userId,
    message,
    processingTimeMs,
  );
  return { jobId, data: null, error: message };
}

function validateOrchestratorRequest(request: OrchestratorTextRequest) {
  if (!request.organizationId) {
    throw new AIOrchestratorError("organizationId is required", "validation");
  }
  if (!request.userId) {
    throw new AIOrchestratorError("userId is required", "validation");
  }
  if (!request.jobType?.trim()) {
    throw new AIOrchestratorError("jobType is required", "validation");
  }
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof AIProviderError) {
    return (
      error.code === "timeout" ||
      error.code === "rate_limit" ||
      error.code === "network" ||
      error.code === "provider_offline"
    );
  }
  return false;
}

function toErrorMessage(error: unknown): string {
  if (isAIProviderError(error)) return error.message;
  if (error instanceof AIOrchestratorError) return error.message;
  if (error instanceof Error) return error.message;
  return "Unknown AI orchestrator error";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type { AIProviderId };
