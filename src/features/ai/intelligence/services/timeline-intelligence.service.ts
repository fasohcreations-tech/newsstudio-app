import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { INTELLIGENCE_JOB_TYPES } from "@/features/ai/intelligence/constants/intelligence.constants";
import {
  clampConfidence,
  parseJsonObject,
} from "@/features/ai/intelligence/lib/parse-json-response";
import {
  createRecommendation,
  supersedeRecommendation,
} from "@/features/ai/intelligence/services/recommendation.service";
import type {
  AIRecommendation,
  IntelligenceServiceResult,
  TimelineDraftPayload,
  TimelineDraftScene,
} from "@/features/ai/intelligence/types/intelligence.types";
import { generateText } from "@/features/ai/services/ai-orchestrator";
import { createMotionSceneService } from "@/features/motion-scene-engine/services/motion-scene.service.impl";

type Client = SupabaseClient;

type TimelineDraftInput = {
  organizationId: string;
  userId: string;
  storyId?: string | null;
  projectId?: string | null;
  timelineId?: string | null;
  storyTitle?: string;
  storyType?: string;
  /** When regenerating a single AI scene slot by index */
  sceneIndex?: number;
  sourceRecommendationId?: string | null;
  regenerateAll?: boolean;
};

function buildHeuristicDraft(
  scenes: Array<{ id: string; name: string; scene_type: string; duration_ms: number }>,
  input: TimelineDraftInput,
): TimelineDraftPayload {
  const picks = scenes.slice(0, 4);
  let cursor = 0;
  const draftScenes: TimelineDraftScene[] = picks.map((scene, index) => {
    const durationMs = Math.min(scene.duration_ms || 8000, 15_000);
    const item: TimelineDraftScene = {
      sceneId: scene.id,
      sceneName: scene.name,
      sceneType: scene.scene_type,
      startMs: cursor,
      durationMs,
      aiGenerated: true,
      notes:
        index === 0
          ? "Open on branded bumper / lower third"
          : "Editable AI draft beat — not a rendered video",
    };
    cursor += durationMs;
    return item;
  });

  if (draftScenes.length === 0) {
    draftScenes.push({
      sceneName: "Placeholder open",
      startMs: 0,
      durationMs: 5000,
      aiGenerated: true,
      notes: "Add a Scene Library template after accepting this draft.",
    });
    cursor = 5000;
  }

  return {
    title: `AI draft · ${input.storyTitle ?? "Story package"}`,
    durationMs: cursor,
    scenes: draftScenes,
    rationale:
      "Editable production timeline assembled from Scene Library templates. AI decisions are marked aiGenerated — manual edits must be tracked separately by the editor.",
    regeneratable: true,
  };
}

/**
 * Timeline Intelligence — produces editable draft timelines only.
 * Never generates or requests rendered video output.
 */
export async function generateTimelineDraft(
  client: Client,
  input: TimelineDraftInput,
): Promise<IntelligenceServiceResult<AIRecommendation>> {
  const motion = createMotionSceneService(client);
  const listed = await motion.listScenes(input.organizationId, {
    lightweight: true,
    limit: 40,
  });
  const scenes = listed.data ?? [];
  let draft = buildHeuristicDraft(
    scenes.map((s) => ({
      id: s.id,
      name: s.name,
      scene_type: s.scene_type,
      duration_ms: s.duration_ms,
    })),
    input,
  );

  const catalog = scenes
    .slice(0, 20)
    .map((s) => `- ${s.name} (${s.scene_type}) ${s.duration_ms}ms id=${s.id}`)
    .join("\n");

  const jobType = input.regenerateAll || input.sourceRecommendationId
    ? INTELLIGENCE_JOB_TYPES.timelineRegenerate
    : INTELLIGENCE_JOB_TYPES.timelineDraft;

  const live = await generateText(client, {
    organizationId: input.organizationId,
    userId: input.userId,
    storyId: input.storyId ?? undefined,
    jobType,
    systemPrompt:
      "You are MediaOS Timeline Intelligence. Produce editable timeline drafts using existing scene templates only. Never produce or imply a rendered video file. Return JSON only.",
    prompt: `Story: ${input.storyTitle ?? "Untitled"}
Type: ${input.storyType ?? "news"}
${input.sceneIndex != null ? `Regenerate only scene index ${input.sceneIndex}.` : ""}
${input.regenerateAll ? "Regenerate the entire timeline draft." : ""}

Available scenes:
${catalog || "(none)"}

Return JSON matching:
{ title: string, durationMs: number, scenes: Array<{ sceneId?: string, sceneName: string, sceneType?: string, startMs: number, durationMs: number, aiGenerated: true, notes?: string }>, rationale: string, regeneratable: true, confidence: number }`,
  });

  let confidence = 0.55;
  let modelVersion: string | null = null;

  if (live.data?.text) {
    const parsed = parseJsonObject<TimelineDraftPayload & { confidence?: number }>(
      live.data.text,
    );
    if (parsed?.scenes?.length) {
      draft = {
        title: parsed.title || draft.title,
        durationMs: parsed.durationMs || draft.durationMs,
        scenes: parsed.scenes.map((scene) => ({
          ...scene,
          aiGenerated: true as const,
        })),
        rationale: parsed.rationale || draft.rationale,
        regeneratable: true,
      };
      confidence = clampConfidence(parsed.confidence, 0.8);
      modelVersion = live.data.model;
    }
  }

  if (input.sourceRecommendationId) {
    await supersedeRecommendation(client, input.sourceRecommendationId, input.userId);
  }

  return createRecommendation(client, {
    organizationId: input.organizationId,
    userId: input.userId,
    domain: "timeline",
    recommendationType: input.regenerateAll
      ? "timeline_draft_regenerate"
      : input.sceneIndex != null
        ? "timeline_scene_regenerate"
        : "timeline_draft",
    title: draft.title,
    summary: draft.rationale,
    payload: {
      ...draft,
      aiDecisionLog: draft.scenes.map((scene, index) => ({
        index,
        sceneId: scene.sceneId ?? null,
        aiGenerated: true,
        manualOverride: false,
      })),
      neverRendersVideo: true,
      liveModel: Boolean(live.data),
      orchestratorError: live.error,
    },
    confidence,
    modelVersion,
    aiJobId: live.jobId,
    storyId: input.storyId ?? null,
    projectId: input.projectId ?? null,
    timelineId: input.timelineId ?? null,
    sourceRecommendationId: input.sourceRecommendationId ?? null,
    metadata: {
      module: "6.0",
      editableOnly: true,
      sceneIndex: input.sceneIndex ?? null,
    },
  });
}
