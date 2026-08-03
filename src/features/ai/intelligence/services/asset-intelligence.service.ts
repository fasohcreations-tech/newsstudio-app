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
  AssetAnalysisPayload,
  IntelligenceServiceResult,
} from "@/features/ai/intelligence/types/intelligence.types";
import { generateText } from "@/features/ai/services/ai-orchestrator";

type Client = SupabaseClient;

type AssetAnalyzeInput = {
  organizationId: string;
  userId: string;
  mediaAssetId: string;
  name: string;
  fileType: string;
  mimeType: string;
  storyId?: string | null;
};

function heuristicAnalysis(input: AssetAnalyzeInput): AssetAnalysisPayload {
  const base = input.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
  const tags = [
    input.fileType,
    ...base
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 2)
      .slice(0, 6),
  ];
  return {
    tags: [...new Set(tags)],
    categories: [
      input.fileType === "image"
        ? "stills"
        : input.fileType === "video"
          ? "footage"
          : input.fileType === "audio"
            ? "audio"
            : "documents",
    ],
    description: `Auto description for ${input.name} (${input.mimeType}).`,
    ocrText: input.fileType === "image" || input.fileType === "pdf" ? "" : undefined,
    faces: input.fileType === "image" || input.fileType === "video" ? [] : undefined,
    duplicateOfAssetId: null,
    searchableText: `${input.name} ${tags.join(" ")}`,
  };
}

/**
 * Asset Intelligence — analyze Media Library uploads into searchable metadata.
 * Writes a recommendation only; does not mutate media_assets until accepted+applied.
 */
export async function analyzeAsset(
  client: Client,
  input: AssetAnalyzeInput,
): Promise<IntelligenceServiceResult<AIRecommendation>> {
  const heuristic = heuristicAnalysis(input);

  const live = await generateText(client, {
    organizationId: input.organizationId,
    userId: input.userId,
    storyId: input.storyId ?? undefined,
    jobType: INTELLIGENCE_JOB_TYPES.assetAnalyze,
    promptId: "intelligence.asset",
    promptVariables: {
      context_block: `Asset name: ${input.name}
File type: ${input.fileType}
MIME: ${input.mimeType}

Return JSON:
{ tags: string[], categories: string[], description: string, ocrText?: string, faces?: Array<{ label: string, confidence: number }>, duplicateOfAssetId?: string | null, searchableText: string, confidence: number }`,
    },
  });

  let payload: AssetAnalysisPayload = heuristic;
  let confidence = 0.5;
  let modelVersion: string | null = null;

  if (live.data?.text) {
    const parsed = parseJsonObject<AssetAnalysisPayload & { confidence?: number }>(
      live.data.text,
    );
    if (parsed?.tags?.length || parsed?.description) {
      payload = {
        tags: parsed.tags ?? heuristic.tags,
        categories: parsed.categories ?? heuristic.categories,
        description: parsed.description ?? heuristic.description,
        ocrText: parsed.ocrText,
        faces: parsed.faces,
        duplicateOfAssetId: parsed.duplicateOfAssetId ?? null,
        searchableText:
          parsed.searchableText ??
          `${parsed.description ?? ""} ${(parsed.tags ?? []).join(" ")}`,
      };
      confidence = clampConfidence(parsed.confidence, 0.75);
      modelVersion = live.data.model;
    }
  }

  return createRecommendation(client, {
    organizationId: input.organizationId,
    userId: input.userId,
    domain: "asset",
    recommendationType: "asset_analysis",
    title: `Asset analysis · ${input.name}`,
    summary: payload.description,
    payload: {
      ...payload,
      liveModel: Boolean(live.data),
      orchestratorError: live.error,
    },
    confidence,
    modelVersion,
    aiJobId: live.jobId,
    mediaAssetId: input.mediaAssetId,
    storyId: input.storyId ?? null,
    metadata: { module: "6.0", fileType: input.fileType },
  });
}
