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
  BroadcastHealthPayload,
  IntelligenceServiceResult,
} from "@/features/ai/intelligence/types/intelligence.types";
import { generateText } from "@/features/ai/services/ai-orchestrator";

type Client = SupabaseClient;

type BroadcastInput = {
  organizationId: string;
  userId: string;
  storyId?: string | null;
  projectId?: string | null;
  targetBitrateKbps?: number;
  hasSubtitles?: boolean;
  resolution?: string;
};

function heuristicHealth(input: BroadcastInput): BroadcastHealthPayload {
  const bitrate = input.targetBitrateKbps ?? 4500;
  const issues: string[] = [];
  const recommendations: string[] = [];

  if (bitrate < 2500) {
    issues.push("Bitrate may be too low for 1080p news packages");
    recommendations.push("Target 4–6 Mbps for HD bulletin streams");
  }
  if (!input.hasSubtitles) {
    recommendations.push("Enable burn-in or sidecar subtitles for accessibility");
  }
  recommendations.push("Keep lower-thirds inside 90% safe title");
  recommendations.push("Normalize program loudness near -24 LUFS / -2 dBTP");

  return {
    bitrateKbps: bitrate,
    audioLevelDbfs: -18,
    safeTitleOk: true,
    subtitleReadable: Boolean(input.hasSubtitles),
    streamQuality: bitrate >= 4000 ? "good" : bitrate >= 2500 ? "fair" : "poor",
    issues,
    recommendations,
  };
}

/**
 * Broadcast Intelligence — stream quality / safe-title / subtitle guidance.
 */
export async function assessBroadcastHealth(
  client: Client,
  input: BroadcastInput,
): Promise<IntelligenceServiceResult<AIRecommendation>> {
  let payload = heuristicHealth(input);
  let confidence = 0.55;
  let modelVersion: string | null = null;

  const live = await generateText(client, {
    organizationId: input.organizationId,
    userId: input.userId,
    storyId: input.storyId ?? undefined,
    jobType: INTELLIGENCE_JOB_TYPES.broadcastHealth,
    promptId: "intelligence.broadcast",
    promptVariables: {
      context_block: `Target bitrate: ${input.targetBitrateKbps ?? 4500} kbps
Resolution: ${input.resolution ?? "1920x1080"}
Has subtitles: ${input.hasSubtitles ? "yes" : "no"}

Return JSON:
{ bitrateKbps: number, audioLevelDbfs: number, safeTitleOk: boolean, subtitleReadable: boolean, streamQuality: "excellent"|"good"|"fair"|"poor", issues: string[], recommendations: string[], confidence: number }`,
    },
  });

  if (live.data?.text) {
    const parsed = parseJsonObject<BroadcastHealthPayload & { confidence?: number }>(
      live.data.text,
    );
    if (parsed?.recommendations) {
      payload = {
        bitrateKbps: parsed.bitrateKbps ?? payload.bitrateKbps,
        audioLevelDbfs: parsed.audioLevelDbfs ?? payload.audioLevelDbfs,
        safeTitleOk: parsed.safeTitleOk ?? payload.safeTitleOk,
        subtitleReadable: parsed.subtitleReadable ?? payload.subtitleReadable,
        streamQuality: parsed.streamQuality ?? payload.streamQuality,
        issues: parsed.issues ?? [],
        recommendations: parsed.recommendations,
      };
      confidence = clampConfidence(parsed.confidence, 0.8);
      modelVersion = live.data.model;
    }
  }

  return createRecommendation(client, {
    organizationId: input.organizationId,
    userId: input.userId,
    domain: "broadcast",
    recommendationType: "broadcast_health",
    title: "Broadcast health check",
    summary: `Stream quality: ${payload.streamQuality}`,
    payload: {
      ...payload,
      liveModel: Boolean(live.data),
      orchestratorError: live.error,
    },
    confidence,
    modelVersion,
    aiJobId: live.jobId,
    storyId: input.storyId ?? null,
    projectId: input.projectId ?? null,
    metadata: { module: "6.0" },
  });
}
