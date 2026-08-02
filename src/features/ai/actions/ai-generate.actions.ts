"use server";

import { z } from "zod";

import { requireAuth } from "@/features/auth/guards/require-auth";
import { createClient } from "@/shared/lib/supabase/server";
import { getCurrentProfile } from "@/features/profile/services/profile.service";
import { resolveActiveMembership } from "@/features/organization/services/resolve-active-membership";
import {
  checkProviderHealth,
  estimateCost,
  generateText,
} from "@/features/ai/services/ai-orchestrator";
import { getAIOrgSettings } from "@/features/ai/services/ai-settings.service";
import { checkAIRateLimit } from "@/features/ai/lib/rate-limit";
import {
  AI_PROVIDER_IDS,
  type CostEstimate,
  type ProviderHealth,
} from "@/features/ai/types/ai";

export type AIActionError = {
  code:
    | "unauthorized"
    | "validation"
    | "rate_limit"
    | "settings"
    | "provider"
    | "unknown";
  message: string;
};

export type AIActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: AIActionError };

const generateTextSchema = z.object({
  prompt: z.string().trim().min(1).max(20_000),
  model: z.string().trim().min(1).max(120).optional(),
  temperature: z.number().min(0).max(2).optional(),
  topP: z.number().min(0).max(1).optional(),
  topK: z.number().int().min(1).max(100).optional(),
  maxTokens: z.number().int().min(64).max(8192).optional(),
  systemPrompt: z.string().trim().max(8_000).optional(),
  providerId: z.enum(AI_PROVIDER_IDS).optional().default("gemini"),
});

export type GenerateTextActionInput = z.infer<typeof generateTextSchema>;

export type GenerateTextActionData = {
  text: string;
  model: string;
  tokensUsed: number | null;
  finishReason: string | null;
  executionTimeMs: number;
  jobId: string | null;
  estimatedCostUsd: number | null;
};

async function requireOrgContext(redirectTo = "/ai-center") {
  const user = await requireAuth(redirectTo);
  const supabase = await createClient();
  const { profile } = await getCurrentProfile(supabase, user.id);
  const { membership, error } = await resolveActiveMembership(
    supabase,
    user.id,
    profile?.email ?? user.email ?? "",
    profile?.full_name,
  );
  return { user, supabase, membership, error };
}

/**
 * Secure Generate Text — always routed through the AI Orchestrator.
 * UI must never call Gemini SDKs directly.
 */
export async function generateTextAction(
  raw: GenerateTextActionInput,
): Promise<AIActionResult<GenerateTextActionData>> {
  const parsed = generateTextSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "validation",
        message: parsed.error.issues[0]?.message ?? "Invalid input.",
      },
    };
  }

  const { user, supabase, membership, error } = await requireOrgContext(
    "/ai-center/gemini-test",
  );
  if (!membership) {
    return {
      success: false,
      error: {
        code: "unauthorized",
        message: error ?? "Organization context required.",
      },
    };
  }

  const rate = checkAIRateLimit(`ai:generate:${user.id}`, {
    limit: 20,
    windowMs: 60_000,
  });
  if (!rate.allowed) {
    return {
      success: false,
      error: {
        code: "rate_limit",
        message: `Too many AI requests. Retry in ${Math.ceil(rate.retryAfterMs / 1000)}s.`,
      },
    };
  }

  const input = parsed.data;
  const orgId = membership.organization.id;
  const { settings } = await getAIOrgSettings(supabase, orgId);

  if (input.providerId === "gemini" && !settings.providers.gemini?.enabled) {
    return {
      success: false,
      error: {
        code: "settings",
        message:
          "Gemini is disabled in AI Settings. Enable it under Settings → AI.",
      },
    };
  }

  const started = Date.now();
  const result = await generateText(supabase, {
    organizationId: orgId,
    userId: user.id,
    jobType: "ai_center.gemini_test",
    providerId: input.providerId,
    model: input.model,
    prompt: input.prompt,
    systemPrompt: input.systemPrompt,
    temperature: input.temperature,
    topP: input.topP,
    topK: input.topK,
    maxTokens: input.maxTokens,
  });

  if (result.error || !result.data) {
    console.error("[generateTextAction] failed", result.error);
    return {
      success: false,
      error: {
        code: "provider",
        message: result.error ?? "Generation failed.",
      },
    };
  }

  let estimatedCostUsd: number | null = null;
  try {
    const cost = await estimateCost(input.providerId, {
      model: result.data.model,
      inputTokens: result.data.tokensUsed ?? Math.ceil(input.prompt.length / 4),
      outputTokens: Math.ceil(result.data.text.length / 4),
    });
    estimatedCostUsd = cost.estimatedCost;
  } catch {
    estimatedCostUsd = null;
  }

  return {
    success: true,
    data: {
      text: result.data.text,
      model: result.data.model,
      tokensUsed: result.data.tokensUsed ?? null,
      finishReason: result.data.finishReason ?? null,
      executionTimeMs: Date.now() - started,
      jobId: result.jobId,
      estimatedCostUsd,
    },
  };
}

export async function healthCheckAction(
  providerId: (typeof AI_PROVIDER_IDS)[number] = "gemini",
): Promise<AIActionResult<ProviderHealth>> {
  const { user, membership, error } = await requireOrgContext();
  if (!membership) {
    return {
      success: false,
      error: {
        code: "unauthorized",
        message: error ?? "Organization context required.",
      },
    };
  }

  const rate = checkAIRateLimit(`ai:health:${user.id}`, {
    limit: 30,
    windowMs: 60_000,
  });
  if (!rate.allowed) {
    return {
      success: false,
      error: {
        code: "rate_limit",
        message: `Too many health checks. Retry in ${Math.ceil(rate.retryAfterMs / 1000)}s.`,
      },
    };
  }

  try {
    const health = await checkProviderHealth(providerId);
    return { success: true, data: health };
  } catch (err) {
    console.error("[healthCheckAction] failed", err);
    return {
      success: false,
      error: {
        code: "provider",
        message: err instanceof Error ? err.message : "Health check failed.",
      },
    };
  }
}

const estimateCostSchema = z.object({
  providerId: z.enum(AI_PROVIDER_IDS).default("gemini"),
  model: z.string().trim().min(1).max(120).optional(),
  inputTokens: z.number().int().min(0).max(2_000_000),
  outputTokens: z.number().int().min(0).max(2_000_000),
});

export async function estimateCostAction(
  raw: z.infer<typeof estimateCostSchema>,
): Promise<AIActionResult<CostEstimate>> {
  const parsed = estimateCostSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "validation",
        message: parsed.error.issues[0]?.message ?? "Invalid input.",
      },
    };
  }

  const { membership, error } = await requireOrgContext();
  if (!membership) {
    return {
      success: false,
      error: {
        code: "unauthorized",
        message: error ?? "Organization context required.",
      },
    };
  }

  try {
    const data = await estimateCost(parsed.data.providerId, {
      model: parsed.data.model,
      inputTokens: parsed.data.inputTokens,
      outputTokens: parsed.data.outputTokens,
    });
    return { success: true, data };
  } catch (err) {
    console.error("[estimateCostAction] failed", err);
    return {
      success: false,
      error: {
        code: "provider",
        message: err instanceof Error ? err.message : "Estimate failed.",
      },
    };
  }
}
