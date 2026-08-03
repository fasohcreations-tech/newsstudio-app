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
  IntelligenceServiceResult,
  SceneRecommendationItem,
} from "@/features/ai/intelligence/types/intelligence.types";
import { generateText } from "@/features/ai/services/ai-orchestrator";
import { createMotionSceneService } from "@/features/motion-scene-engine/services/motion-scene.service.impl";

type Client = SupabaseClient;

type SceneRecommendInput = {
  organizationId: string;
  userId: string;
  storyId?: string | null;
  storyType?: string;
  language?: string;
  availableAssetTypes?: string[];
  preferences?: string[];
};

function scoreScenesHeuristic(
  scenes: Array<{
    id: string;
    name: string;
    scene_type: string;
    metadata?: Record<string, unknown>;
  }>,
  input: SceneRecommendInput,
): SceneRecommendationItem[] {
  const storyType = (input.storyType ?? "news").toLowerCase();
  return scenes
    .map((scene) => {
      const reasons: string[] = [];
      let score = 0.4;
      if (scene.scene_type.includes("lower") || scene.name.toLowerCase().includes("lower")) {
        score += 0.15;
        reasons.push("Lower-third friendly for story intros");
      }
      if (storyType.includes("breaking") && scene.name.toLowerCase().includes("breaking")) {
        score += 0.25;
        reasons.push("Matches breaking-news story type");
      }
      if (input.language === "ml" && scene.name.toLowerCase().includes("gnn")) {
        score += 0.1;
        reasons.push("GNN package suits Malayalam bulletin style");
      }
      if ((scene.metadata as { package_code?: string } | undefined)?.package_code) {
        score += 0.1;
        reasons.push("Broadcast package template");
      }
      if (reasons.length === 0) reasons.push("General news template");
      return {
        sceneId: scene.id,
        sceneName: scene.name,
        sceneType: scene.scene_type,
        score: Math.min(1, score),
        reasons,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

/**
 * Scene Intelligence — recommend Scene Library templates. Never mutates scenes.
 */
export async function recommendScenes(
  client: Client,
  input: SceneRecommendInput,
): Promise<IntelligenceServiceResult<AIRecommendation>> {
  const motion = createMotionSceneService(client);
  const listed = await motion.listScenes(input.organizationId, {
    lightweight: true,
    limit: 100,
  });
  const scenes = listed.data ?? [];
  const heuristic = scoreScenesHeuristic(
    scenes.map((s) => ({
      id: s.id,
      name: s.name,
      scene_type: s.scene_type,
      metadata: s.metadata as Record<string, unknown>,
    })),
    input,
  );

  const catalog = heuristic
    .map(
      (item, i) =>
        `${i + 1}. ${item.sceneName} (${item.sceneType}) id=${item.sceneId}`,
    )
    .join("\n");

  const live = await generateText(client, {
    organizationId: input.organizationId,
    userId: input.userId,
    storyId: input.storyId ?? undefined,
    jobType: INTELLIGENCE_JOB_TYPES.sceneRecommend,
    promptId: "intelligence.scene",
    promptVariables: {
      context_block: `Story type: ${input.storyType ?? "news"}
Language: ${input.language ?? "en"}
Assets: ${(input.availableAssetTypes ?? []).join(", ") || "unspecified"}
Preferences: ${(input.preferences ?? []).join(", ") || "none"}

Catalog:
${catalog || "(empty)"}

Return JSON: { recommendations: Array<{ sceneId: string, sceneName: string, sceneType: string, score: number, reasons: string[] }>, confidence: number, rationale: string }`,
    },
  });

  let items = heuristic;
  let confidence = 0.55;
  let rationale = "Ranked from Scene Library metadata and story context.";
  let modelVersion: string | null = null;

  if (live.data?.text) {
    const parsed = parseJsonObject<{
      recommendations?: SceneRecommendationItem[];
      confidence?: number;
      rationale?: string;
    }>(live.data.text);
    if (parsed?.recommendations?.length) {
      items = parsed.recommendations.slice(0, 8);
      confidence = clampConfidence(parsed.confidence, 0.8);
      rationale = parsed.rationale ?? rationale;
      modelVersion = live.data.model;
    }
  }

  return createRecommendation(client, {
    organizationId: input.organizationId,
    userId: input.userId,
    domain: "scene",
    recommendationType: "scene_template",
    title: "Scene template recommendations",
    summary: rationale,
    payload: {
      recommendations: items,
      storyType: input.storyType ?? "news",
      language: input.language ?? "en",
      liveModel: Boolean(live.data),
      orchestratorError: live.error,
    },
    confidence,
    modelVersion,
    aiJobId: live.jobId,
    storyId: input.storyId ?? null,
    metadata: { module: "6.0" },
  });
}
