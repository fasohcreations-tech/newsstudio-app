import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  clampConfidence,
  parseJsonObject,
} from "@/features/ai/intelligence/lib/parse-json-response";
import { generateText } from "@/features/ai/services/ai-orchestrator";
import { createAssetClip } from "@/features/asset-clip-editor/services/clip.service";
import { toClipMediaRef } from "@/features/asset-clip-editor/lib/clip-media-reference";
import {
  cosineSimilarity,
  embedText,
} from "@/features/ai-visual-understanding/lib/embeddings";
import { analyzeMediaAsset, getAnalysisBundle } from "@/features/ai-visual-understanding/services/visual-analysis.service";
import type {
  ClipRecommendation,
  PanelClipContext,
  StoryPanelClipSuggestionRow,
} from "@/features/ai-visual-understanding/types/visual.types";
import {
  parseSubHeadlineMedia,
  type SubHeadlineMediaRef,
} from "@/features/story-production/lib/sub-headlines";
import type { Database, Json } from "@/shared/types/database.types";

type Client = SupabaseClient<Database>;
type ServiceResult<T> = { data: T | null; error: string | null };

function ok<T>(data: T): ServiceResult<T> {
  return { data, error: null };
}
function fail<T>(error: string): ServiceResult<T> {
  return { data: null, error };
}

function asSuggestion(row: Record<string, unknown>): StoryPanelClipSuggestionRow {
  return {
    ...(row as unknown as StoryPanelClipSuggestionRow),
    keywords: row.keywords ?? [],
    context: (row.context as Record<string, unknown>) ?? {},
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function pickDuration(
  voiceDurationMs: number | null | undefined,
  fallback = 8_000,
): number {
  if (voiceDurationMs && voiceDurationMs > 1000) {
    return clamp(voiceDurationMs, 3_000, 20_000);
  }
  return fallback;
}

/**
 * Semantic clip search over stored embeddings + optional LLM refine.
 */
export async function recommendClipForPanel(
  client: Client,
  input: {
    organizationId: string;
    userId: string;
    mediaAssetId: string;
    panel: PanelClipContext;
    excludeSuggestionId?: string;
    targetDurationMs?: number;
    forceReanalyze?: boolean;
  },
): Promise<ServiceResult<ClipRecommendation>> {
  const analyzed = await analyzeMediaAsset(client, {
    organizationId: input.organizationId,
    userId: input.userId,
    mediaAssetId: input.mediaAssetId,
    force: input.forceReanalyze,
  });
  if (analyzed.error || !analyzed.data) {
    return fail(analyzed.error ?? "Analysis required before recommendation");
  }

  const bundle = analyzed.data;
  const durationMs = bundle.analysis.duration_ms ?? 60_000;
  const targetDur = pickDuration(
    input.targetDurationMs ?? input.panel.voiceDurationMs,
  );

  const queryText = [
    input.panel.sceneHeadline,
    input.panel.storyHeadline,
    input.panel.category,
    input.panel.keywords.join(" "),
    input.panel.bodyText,
  ]
    .filter(Boolean)
    .join(" ");
  const queryVec = embedText(queryText);

  const scored = bundle.embeddings
    .map((seg) => ({
      seg,
      score: cosineSimilarity(queryVec, seg.embedding),
    }))
    .sort((a, b) => b.score - a.score);

  // Soft-exclude prior suggestion range when requesting another.
  let candidates = scored;
  if (input.excludeSuggestionId) {
    const { data: prior } = await client
      .from("story_panel_clip_suggestions")
      .select("suggested_in_ms, suggested_out_ms")
      .eq("id", input.excludeSuggestionId)
      .maybeSingle();
    if (prior) {
      const mid =
        (Number(prior.suggested_in_ms) + Number(prior.suggested_out_ms)) / 2;
      candidates = [...scored].sort((a, b) => {
        const aMid = (a.seg.start_ms + a.seg.end_ms) / 2;
        const bMid = (b.seg.start_ms + b.seg.end_ms) / 2;
        const aDist = Math.abs(aMid - mid);
        const bDist = Math.abs(bMid - mid);
        // Prefer different region when scores are close
        return b.score + bDist / durationMs * 0.15 - (a.score + aDist / durationMs * 0.15);
      });
    }
  }

  const top = candidates.slice(0, 5);
  const best = top[0]?.seg;
  let inMs = best?.start_ms ?? 0;
  let outMs = Math.min(durationMs, inMs + targetDur);
  if (best && best.end_ms - best.start_ms >= 2000) {
    const mid = Math.round((best.start_ms + best.end_ms) / 2);
    inMs = clamp(mid - Math.round(targetDur / 2), 0, Math.max(0, durationMs - 1000));
    outMs = clamp(inMs + targetDur, inMs + 1000, durationMs);
  }

  let reason = `Matched scene “${input.panel.sceneHeadline || input.panel.storyHeadline}” to segment keywords.`;
  let confidence = clampConfidence(top[0]?.score ?? 0.45, 0.45);
  let modelVersion: string | null = "lexical-v1";
  let aiJobId: string | null = null;

  const live = await generateText(client, {
    organizationId: input.organizationId,
    userId: input.userId,
    storyId: input.panel.storyId,
    jobType: "vision.recommend_clip",
    promptId: "vision.recommend_clip",
    promptVariables: {
      story_headline: input.panel.storyHeadline,
      scene_headline: input.panel.sceneHeadline,
      category: input.panel.category,
      keywords: input.panel.keywords.join(", "),
      voice_duration_ms: String(input.panel.voiceDurationMs ?? ""),
      duration_ms: String(durationMs),
      top_segments_json: JSON.stringify(
        top.map((t) => ({
          startMs: t.seg.start_ms,
          endMs: t.seg.end_ms,
          score: Number(t.score.toFixed(3)),
          text: t.seg.text_content,
        })),
      ),
      transcript_excerpt: (bundle.analysis.transcript ?? "").slice(0, 800),
    },
  });

  if (live.data?.text) {
    const parsed = parseJsonObject<{
      suggestedInMs?: number;
      suggestedOutMs?: number;
      confidence?: number;
      reason?: string;
    }>(live.data.text);
    if (
      parsed &&
      Number.isFinite(parsed.suggestedInMs) &&
      Number.isFinite(parsed.suggestedOutMs) &&
      Number(parsed.suggestedOutMs) > Number(parsed.suggestedInMs)
    ) {
      inMs = clamp(Math.round(Number(parsed.suggestedInMs)), 0, durationMs - 1);
      outMs = clamp(Math.round(Number(parsed.suggestedOutMs)), inMs + 1, durationMs);
      confidence = clampConfidence(parsed.confidence, confidence);
      reason = parsed.reason?.trim() || reason;
      modelVersion = live.data.model;
      aiJobId = live.jobId;
    }
  }

  // Supersede prior pending suggestions for same panel+asset
  await client
    .from("story_panel_clip_suggestions")
    .update({
      decision: "superseded",
      decided_at: new Date().toISOString(),
      decided_by: input.userId,
    })
    .eq("organization_id", input.organizationId)
    .eq("story_id", input.panel.storyId)
    .eq("panel_index", input.panel.panelIndex)
    .eq("media_asset_id", input.mediaAssetId)
    .eq("decision", "pending");

  const { data: inserted, error } = await client
    .from("story_panel_clip_suggestions")
    .insert({
      organization_id: input.organizationId,
      story_id: input.panel.storyId,
      panel_index: input.panel.panelIndex,
      media_asset_id: input.mediaAssetId,
      analysis_id: bundle.analysis.id,
      suggested_in_ms: inMs,
      suggested_out_ms: outMs,
      confidence,
      reason,
      decision: "pending",
      scene_headline: input.panel.sceneHeadline,
      story_headline: input.panel.storyHeadline,
      keywords: input.panel.keywords,
      voice_duration_ms: input.panel.voiceDurationMs,
      context: {
        category: input.panel.category,
        language: input.panel.language,
        bodyText: input.panel.bodyText.slice(0, 500),
        orchestratorError: live.error,
      } as Json,
      model_version: modelVersion,
      ai_job_id: aiJobId,
      created_by: input.userId,
    })
    .select("*")
    .single();

  if (error || !inserted) {
    return fail(error?.message ?? "Failed to store suggestion");
  }

  const suggestion = asSuggestion(inserted as Record<string, unknown>);
  return ok({
    suggestion,
    analysisId: bundle.analysis.id,
    inMs,
    outMs,
    confidence,
    reason,
  });
}

export async function listPanelSuggestions(
  client: Client,
  organizationId: string,
  storyId: string,
  panelIndex?: number,
): Promise<ServiceResult<StoryPanelClipSuggestionRow[]>> {
  let query = client
    .from("story_panel_clip_suggestions")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("story_id", storyId)
    .order("created_at", { ascending: false })
    .limit(40);

  if (panelIndex != null) {
    query = query.eq("panel_index", panelIndex);
  }

  const { data, error } = await query;
  if (error) return fail(error.message);
  return ok((data ?? []).map((r) => asSuggestion(r as Record<string, unknown>)));
}

export async function rejectClipSuggestion(
  client: Client,
  input: {
    organizationId: string;
    userId: string;
    suggestionId: string;
  },
): Promise<ServiceResult<StoryPanelClipSuggestionRow>> {
  const { data, error } = await client
    .from("story_panel_clip_suggestions")
    .update({
      decision: "rejected",
      decided_by: input.userId,
      decided_at: new Date().toISOString(),
    })
    .eq("id", input.suggestionId)
    .eq("organization_id", input.organizationId)
    .eq("decision", "pending")
    .select("*")
    .maybeSingle();

  if (error) return fail(error.message);
  if (!data) return fail("Pending suggestion not found");
  return ok(asSuggestion(data as Record<string, unknown>));
}

/**
 * Accept suggestion → create Asset Clip → optionally attach clip:// to Story Panel.
 * Manual Clip Editor remains available for further IN/OUT tweaks.
 */
export async function acceptClipSuggestion(
  client: Client,
  input: {
    organizationId: string;
    userId: string;
    suggestionId: string;
    inPointMs?: number;
    outPointMs?: number;
    clipName?: string;
    attachToStoryPanel?: boolean;
  },
): Promise<
  ServiceResult<{
    suggestion: StoryPanelClipSuggestionRow;
    clipId: string;
    mediaRef: string;
  }>
> {
  const { data: suggestion, error: loadError } = await client
    .from("story_panel_clip_suggestions")
    .select("*")
    .eq("id", input.suggestionId)
    .eq("organization_id", input.organizationId)
    .maybeSingle();

  if (loadError || !suggestion) {
    return fail(loadError?.message ?? "Suggestion not found");
  }

  const row = asSuggestion(suggestion as Record<string, unknown>);
  if (row.decision === "accepted" && row.accepted_clip_id) {
    return ok({
      suggestion: row,
      clipId: row.accepted_clip_id,
      mediaRef: toClipMediaRef(row.accepted_clip_id),
    });
  }
  if (row.decision !== "pending" && row.decision !== "accepted") {
    return fail(`Suggestion is ${row.decision}`);
  }

  const inPointMs = input.inPointMs ?? row.suggested_in_ms;
  const outPointMs = input.outPointMs ?? row.suggested_out_ms;
  if (outPointMs <= inPointMs) {
    return fail("Out point must be after in point");
  }

  const clipResult = await createAssetClip(
    client,
    input.organizationId,
    input.userId,
    {
      parentAssetId: row.media_asset_id,
      name:
        input.clipName?.trim() ||
        `Panel ${row.panel_index + 1} · ${row.scene_headline || row.story_headline}`.slice(
          0,
          120,
        ),
      notes: row.reason,
      tags: ["ai-visual-understanding", `panel-${row.panel_index}`],
      inPointMs,
      outPointMs,
      metadata: {
        source: "ai_visual_understanding",
        suggestionId: row.id,
        confidence: row.confidence,
        reason: row.reason,
      },
    },
  );

  if (clipResult.error || !clipResult.clip) {
    return fail(clipResult.error ?? "Failed to create clip");
  }

  const clipId = clipResult.clip.id;
  const mediaRef = toClipMediaRef(clipId);

  const { data: updated, error: updateError } = await client
    .from("story_panel_clip_suggestions")
    .update({
      decision: "accepted",
      accepted_clip_id: clipId,
      suggested_in_ms: inPointMs,
      suggested_out_ms: outPointMs,
      decided_by: input.userId,
      decided_at: new Date().toISOString(),
    })
    .eq("id", row.id)
    .select("*")
    .single();

  if (updateError || !updated) {
    return fail(updateError?.message ?? "Clip created but suggestion update failed");
  }

  if (input.attachToStoryPanel !== false) {
    const attach = await attachClipToStoryPanel(client, {
      organizationId: input.organizationId,
      userId: input.userId,
      storyId: row.story_id,
      panelIndex: row.panel_index,
      mediaRef,
    });
    if (attach.error) {
      return fail(attach.error);
    }
  }

  return ok({
    suggestion: asSuggestion(updated as Record<string, unknown>),
    clipId,
    mediaRef,
  });
}

async function attachClipToStoryPanel(
  client: Client,
  input: {
    organizationId: string;
    userId: string;
    storyId: string;
    panelIndex: number;
    mediaRef: string;
  },
): Promise<ServiceResult<true>> {
  const { data: story, error } = await client
    .from("stories")
    .select("id, sub_headline_media")
    .eq("id", input.storyId)
    .eq("organization_id", input.organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !story) {
    return fail(error?.message ?? "Story not found");
  }

  const media = parseSubHeadlineMedia(story.sub_headline_media);
  const next: SubHeadlineMediaRef[] = media.map((slot, i) =>
    i === input.panelIndex
      ? {
          kind: "video",
          ref: input.mediaRef,
          caption: slot.caption ?? "",
        }
      : slot,
  );

  // Ensure length for panel index
  while (next.length <= input.panelIndex) {
    next.push({ kind: "", ref: "", caption: "" });
  }
  next[input.panelIndex] = {
    kind: "video",
    ref: input.mediaRef,
    caption: next[input.panelIndex]?.caption ?? "",
  };

  const { error: saveError } = await client
    .from("stories")
    .update({
      sub_headline_media: next as unknown as Json,
      updated_by: input.userId,
    })
    .eq("id", input.storyId);

  if (saveError) return fail(saveError.message);
  return ok(true);
}

export async function buildPanelContextFromStory(
  client: Client,
  organizationId: string,
  storyId: string,
  panelIndex: number,
): Promise<ServiceResult<PanelClipContext>> {
  const { data: story, error } = await client
    .from("stories")
    .select(
      "id, title, summary, category, language, approved_script, voice_duration_ms, sub_headline_media",
    )
    .eq("id", storyId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !story) {
    return fail(error?.message ?? "Story not found");
  }

  const { buildPanelDiscoveryContexts } = await import(
    "@/features/ai-asset-discovery/lib/panel-context"
  );
  const panels = buildPanelDiscoveryContexts({
    id: story.id,
    title: story.title,
    summary: story.summary,
    category: story.category,
    language: story.language,
    approved_script: story.approved_script,
    sub_headline_media: story.sub_headline_media,
  });

  const panel = panels.find((p) => p.panelIndex === panelIndex) ?? panels[0];
  if (!panel) return fail("No Story Panel context available");

  // Approximate per-panel voice share from full voice duration.
  const panelCount = Math.max(1, panels.length);
  const voiceShare =
    story.voice_duration_ms != null
      ? Math.round(Number(story.voice_duration_ms) / panelCount)
      : null;

  return ok({
    panelIndex: panel.panelIndex,
    storyId: story.id,
    storyHeadline: panel.storyHeadline,
    sceneHeadline: panel.sceneHeadline,
    category: panel.category,
    keywords: panel.keywords,
    language: panel.language,
    bodyText: panel.bodyText ?? "",
    voiceDurationMs: voiceShare,
  });
}

export { getAnalysisBundle };
