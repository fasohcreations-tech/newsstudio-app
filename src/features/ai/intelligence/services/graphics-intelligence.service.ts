import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { INTELLIGENCE_JOB_TYPES } from "@/features/ai/intelligence/constants/intelligence.constants";
import {
  clampConfidence,
  parseJsonObject,
} from "@/features/ai/intelligence/lib/parse-json-response";
import { createRecommendation } from "@/features/ai/intelligence/services/recommendation.service";
import type {
  AIRecommendation,
  GraphicsRecommendationPayload,
  IntelligenceServiceResult,
} from "@/features/ai/intelligence/types/intelligence.types";
import { generateText } from "@/features/ai/services/ai-orchestrator";

type Client = SupabaseClient;

type GraphicsInput = {
  organizationId: string;
  userId: string;
  storyId?: string | null;
  storyCategory?: string;
  language?: string;
};

function heuristicGraphics(category: string): GraphicsRecommendationPayload {
  const isPolitics = /politic|election|gov/i.test(category);
  const isSports = /sport|cricket|football/i.test(category);
  return {
    themes: isSports
      ? ["Dynamic sports lower-third", "Score bug energy"]
      : isPolitics
        ? ["Authority blue desk package", "Formal chyron stack"]
        : ["GNN nightly bulletin", "Clean news open"],
    colorPalettes: [
      {
        name: isPolitics ? "Civic Navy" : isSports ? "Arena Heat" : "Channel Primaries",
        colors: isPolitics
          ? ["#0B1F3A", "#C9A227", "#F5F7FA"]
          : isSports
            ? ["#111111", "#E11D48", "#FBBF24"]
            : ["#0B1220", "#1D4ED8", "#F8FAFC"],
      },
    ],
    typography: [
      { role: "headline", suggestion: "Bold condensed sans for TV titles" },
      { role: "body", suggestion: "High-x-height sans for lower thirds" },
    ],
    shapeBehaviors: ["edge-sweep intro", "soft mask reveal", "safe-title inset"],
    motionPresets: ["fade-slide-up", "opacity-stagger", "logo-lockup"],
  };
}

/**
 * Graphics Intelligence — theme / palette / type / motion recommendations.
 */
export async function recommendGraphics(
  client: Client,
  input: GraphicsInput,
): Promise<IntelligenceServiceResult<AIRecommendation>> {
  const category = input.storyCategory ?? "general news";
  let payload = heuristicGraphics(category);
  let confidence = 0.5;
  let modelVersion: string | null = null;

  const live = await generateText(client, {
    organizationId: input.organizationId,
    userId: input.userId,
    storyId: input.storyId ?? undefined,
    jobType: INTELLIGENCE_JOB_TYPES.graphicsRecommend,
    systemPrompt:
      "You are MediaOS Graphics Intelligence. Recommend broadcast graphics styling. Return JSON only.",
    prompt: `Story category: ${category}
Language: ${input.language ?? "en"}

Return JSON:
{ themes: string[], colorPalettes: Array<{ name: string, colors: string[] }>, typography: Array<{ role: string, suggestion: string }>, shapeBehaviors: string[], motionPresets: string[], confidence: number, rationale: string }`,
  });

  if (live.data?.text) {
    const parsed = parseJsonObject<
      GraphicsRecommendationPayload & { confidence?: number; rationale?: string }
    >(live.data.text);
    if (parsed?.themes?.length) {
      payload = {
        themes: parsed.themes,
        colorPalettes: parsed.colorPalettes ?? payload.colorPalettes,
        typography: parsed.typography ?? payload.typography,
        shapeBehaviors: parsed.shapeBehaviors ?? payload.shapeBehaviors,
        motionPresets: parsed.motionPresets ?? payload.motionPresets,
      };
      confidence = clampConfidence(parsed.confidence, 0.8);
      modelVersion = live.data.model;
    }
  }

  return createRecommendation(client, {
    organizationId: input.organizationId,
    userId: input.userId,
    domain: "graphics",
    recommendationType: "graphics_style",
    title: `Graphics package · ${category}`,
    summary: payload.themes[0] ?? "Graphics recommendations ready for review",
    payload: {
      ...payload,
      liveModel: Boolean(live.data),
      orchestratorError: live.error,
    },
    confidence,
    modelVersion,
    aiJobId: live.jobId,
    storyId: input.storyId ?? null,
    metadata: { module: "6.0", category },
  });
}
