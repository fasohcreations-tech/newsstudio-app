import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  clampConfidence,
  parseJsonObject,
} from "@/features/ai/intelligence/lib/parse-json-response";
import { generateText } from "@/features/ai/services/ai-orchestrator";
import { buildHeuristicAnalysis } from "@/features/ai-visual-understanding/lib/heuristic-analysis";
import { asNumberArray } from "@/features/ai-visual-understanding/lib/embeddings";
import type {
  AnalysisBundle,
  MediaAssetAnalysisEventRow,
  MediaAssetAnalysisRow,
  MediaAssetEmbeddingRow,
  TimecodedEventDraft,
  VisualEventKind,
} from "@/features/ai-visual-understanding/types/visual.types";
import type { Database, Json } from "@/shared/types/database.types";

type Client = SupabaseClient<Database>;

type ServiceResult<T> = { data: T | null; error: string | null };

type LlmAnalysisPayload = {
  summary?: string;
  transcript?: string;
  keywords?: string[];
  scenes?: Array<{ startMs: number; endMs: number; label: string; confidence?: number }>;
  shots?: Array<{ startMs: number; endMs: number; label: string }>;
  ocr?: Array<{ startMs: number; endMs: number; text: string }>;
  faces?: Array<{ startMs: number; endMs: number; label: string; confidence?: number }>;
  objects?: Array<{ startMs: number; endMs: number; label: string }>;
  logos?: Array<{ startMs: number; endMs: number; label: string }>;
  landmarks?: Array<{ startMs: number; endMs: number; label: string }>;
  locations?: Array<{ startMs: number; endMs: number; label: string }>;
  actions?: Array<{ startMs: number; endMs: number; label: string }>;
  confidence?: number;
};

function ok<T>(data: T): ServiceResult<T> {
  return { data, error: null };
}

function fail<T>(error: string): ServiceResult<T> {
  return { data: null, error };
}

function asAnalysis(row: Record<string, unknown>): MediaAssetAnalysisRow {
  return {
    ...(row as unknown as MediaAssetAnalysisRow),
    keywords: row.keywords ?? [],
    semantic_payload:
      (row.semantic_payload as Record<string, unknown>) ?? {},
  };
}

function mapKindEvents(
  kind: VisualEventKind,
  items: Array<{ startMs: number; endMs: number; label?: string; text?: string; confidence?: number }> | undefined,
): TimecodedEventDraft[] {
  if (!items?.length) return [];
  return items.map((item) => ({
    kind,
    startMs: Math.max(0, Math.round(item.startMs)),
    endMs: Math.max(Math.round(item.startMs), Math.round(item.endMs)),
    label: (item.label ?? item.text ?? kind).trim() || kind,
    confidence: item.confidence,
    payload: {},
  }));
}

function mergeEvents(
  heuristic: TimecodedEventDraft[],
  llm: LlmAnalysisPayload | null,
  durationMs: number,
): TimecodedEventDraft[] {
  if (!llm) return heuristic;

  const fromLlm: TimecodedEventDraft[] = [
    ...mapKindEvents("scene_boundary", llm.scenes),
    ...mapKindEvents("shot_change", llm.shots),
    ...mapKindEvents(
      "ocr",
      llm.ocr?.map((o) => ({
        startMs: o.startMs,
        endMs: o.endMs,
        label: o.text,
      })),
    ),
    ...mapKindEvents("face", llm.faces),
    ...mapKindEvents("object", llm.objects),
    ...mapKindEvents("logo", llm.logos),
    ...mapKindEvents("landmark", llm.landmarks),
    ...mapKindEvents("location", llm.locations),
    ...mapKindEvents("action", llm.actions),
  ]
    .map((e) => ({
      ...e,
      startMs: Math.min(durationMs, e.startMs),
      endMs: Math.min(durationMs, Math.max(e.startMs, e.endMs)),
    }))
    .filter((e) => e.endMs >= e.startMs);

  // Prefer LLM scenes when present; keep heuristic keyframes as scaffolding.
  const keepHeuristic = heuristic.filter(
    (e) => e.kind === "keyframe" || e.kind === "keyword",
  );
  const hasLlmScenes = fromLlm.some((e) => e.kind === "scene_boundary");
  const base = hasLlmScenes
    ? heuristic.filter((e) => e.kind !== "scene_boundary" && e.kind !== "shot_change")
    : heuristic;

  return [...(hasLlmScenes ? base.filter((e) => e.kind === "keyframe" || e.kind === "keyword") : base), ...fromLlm, ...(hasLlmScenes ? [] : keepHeuristic)];
}

export async function getAnalysisBundle(
  client: Client,
  organizationId: string,
  mediaAssetId: string,
): Promise<ServiceResult<AnalysisBundle | null>> {
  const { data: analysis, error } = await client
    .from("media_asset_analyses")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("media_asset_id", mediaAssetId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) return fail(error.message);
  if (!analysis) return ok(null);

  const row = asAnalysis(analysis as Record<string, unknown>);

  const [{ data: events }, { data: embeddings }] = await Promise.all([
    client
      .from("media_asset_analysis_events")
      .select("*")
      .eq("analysis_id", row.id)
      .order("start_ms", { ascending: true }),
    client
      .from("media_asset_embeddings")
      .select("*")
      .eq("analysis_id", row.id)
      .order("segment_index", { ascending: true }),
  ]);

  return ok({
    analysis: row,
    events: (events ?? []) as MediaAssetAnalysisEventRow[],
    embeddings: (embeddings ?? []).map((e) => ({
      ...(e as MediaAssetEmbeddingRow),
      embedding: asNumberArray((e as { embedding: unknown }).embedding),
    })),
  });
}

/**
 * Analyze (or reuse) visual understanding for a media asset.
 * Synchronous "background" job with status transitions — reusable without reprocess.
 */
export async function analyzeMediaAsset(
  client: Client,
  input: {
    organizationId: string;
    userId: string;
    mediaAssetId: string;
    force?: boolean;
    durationMs?: number;
  },
): Promise<ServiceResult<AnalysisBundle>> {
  const existing = await getAnalysisBundle(
    client,
    input.organizationId,
    input.mediaAssetId,
  );
  if (existing.error) return fail(existing.error);

  if (
    !input.force &&
    existing.data?.analysis.status === "ready"
  ) {
    return ok(existing.data);
  }

  const { data: asset, error: assetError } = await client
    .from("media_assets")
    .select(
      "id, name, mime_type, file_type, duration_seconds, external_url, source_provider, organization_id",
    )
    .eq("id", input.mediaAssetId)
    .eq("organization_id", input.organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (assetError || !asset) {
    return fail(assetError?.message ?? "Media asset not found");
  }
  if (asset.file_type !== "video") {
    return fail("Visual Understanding currently supports video assets only.");
  }

  const durationMs =
    input.durationMs ??
    (asset.duration_seconds != null
      ? Math.round(Number(asset.duration_seconds) * 1000)
      : 60_000);

  // Soft-delete prior live analysis so unique index allows a fresh row.
  if (existing.data?.analysis.id) {
    await client
      .from("media_asset_analyses")
      .update({
        deleted_at: new Date().toISOString(),
        status: "stale",
        updated_by: input.userId,
      })
      .eq("id", existing.data.analysis.id);
  }

  const { data: inserted, error: insertError } = await client
    .from("media_asset_analyses")
    .insert({
      organization_id: input.organizationId,
      media_asset_id: input.mediaAssetId,
      status: "running",
      source_provider: asset.source_provider,
      source_url: asset.external_url,
      duration_ms: durationMs,
      frame_rate: 30,
      keywords: [],
      semantic_payload: { phase: "running" },
      created_by: input.userId,
      updated_by: input.userId,
    })
    .select("*")
    .single();

  if (insertError || !inserted) {
    return fail(insertError?.message ?? "Failed to start analysis");
  }

  const analysisId = (inserted as { id: string }).id;
  const heuristic = buildHeuristicAnalysis({
    name: asset.name,
    mimeType: asset.mime_type,
    sourceProvider: asset.source_provider,
    externalUrl: asset.external_url,
    durationMs,
  });

  const live = await generateText(client, {
    organizationId: input.organizationId,
    userId: input.userId,
    jobType: "vision.analyze_video",
    promptId: "vision.analyze_video",
    promptVariables: {
      asset_name: asset.name,
      duration_ms: String(durationMs),
      source_provider: asset.source_provider ?? "media_library",
      mime_type: asset.mime_type,
      seed_keywords: heuristic.keywords.join(", "),
      heuristic_summary: heuristic.summary,
    },
  });

  const parsed = live.data?.text
    ? parseJsonObject<LlmAnalysisPayload>(live.data.text)
    : null;

  const keywords = [
    ...new Set([
      ...heuristic.keywords,
      ...((parsed?.keywords ?? []).map((k) => String(k).trim()).filter(Boolean)),
    ]),
  ].slice(0, 24);

  const events = mergeEvents(heuristic.events, parsed, durationMs);
  const transcript = parsed?.transcript?.trim() || heuristic.transcript;
  const summary = parsed?.summary?.trim() || heuristic.summary;
  const confidence = clampConfidence(parsed?.confidence, live.data ? 0.72 : 0.5);

  // Replace child rows
  await client
    .from("media_asset_analysis_events")
    .delete()
    .eq("analysis_id", analysisId);
  await client
    .from("media_asset_embeddings")
    .delete()
    .eq("analysis_id", analysisId);

  if (events.length) {
    const { error: eventsError } = await client
      .from("media_asset_analysis_events")
      .insert(
        events.map((e) => ({
          organization_id: input.organizationId,
          analysis_id: analysisId,
          media_asset_id: input.mediaAssetId,
          kind: e.kind,
          start_ms: e.startMs,
          end_ms: e.endMs,
          label: e.label,
          confidence: e.confidence ?? null,
          payload: (e.payload ?? {}) as Json,
        })),
      );
    if (eventsError) {
      await client
        .from("media_asset_analyses")
        .update({
          status: "failed",
          error: eventsError.message,
          updated_by: input.userId,
        })
        .eq("id", analysisId);
      return fail(eventsError.message);
    }
  }

  if (heuristic.segments.length) {
    const { error: embError } = await client.from("media_asset_embeddings").insert(
      heuristic.segments.map((s) => ({
        organization_id: input.organizationId,
        analysis_id: analysisId,
        media_asset_id: input.mediaAssetId,
        segment_index: s.segmentIndex,
        start_ms: s.startMs,
        end_ms: s.endMs,
        text_content: s.textContent,
        embedding: s.embedding as unknown as Json,
        model_version: "lexical-v1",
      })),
    );
    if (embError) {
      await client
        .from("media_asset_analyses")
        .update({
          status: "failed",
          error: embError.message,
          updated_by: input.userId,
        })
        .eq("id", analysisId);
      return fail(embError.message);
    }
  }

  const { data: updated, error: updateError } = await client
    .from("media_asset_analyses")
    .update({
      status: "ready",
      transcript,
      keywords,
      summary,
      semantic_payload: {
        ...heuristic.semanticPayload,
        llmEnriched: Boolean(parsed),
        confidence,
        orchestratorError: live.error,
        supports: {
          ...(heuristic.semanticPayload.supports as Record<string, unknown>),
          speechTranscript: Boolean(parsed?.transcript),
          ocr: Boolean(parsed?.ocr?.length),
          faces: Boolean(parsed?.faces?.length),
          objects: Boolean(parsed?.objects?.length),
          logos: Boolean(parsed?.logos?.length),
          landmarks: Boolean(parsed?.landmarks?.length),
          locations: Boolean(parsed?.locations?.length),
          actions: Boolean(parsed?.actions?.length),
        },
      },
      model_version: live.data?.model ?? "heuristic-v1",
      ai_job_id: live.jobId,
      error: null,
      analyzed_at: new Date().toISOString(),
      updated_by: input.userId,
    })
    .eq("id", analysisId)
    .select("*")
    .single();

  if (updateError || !updated) {
    return fail(updateError?.message ?? "Failed to finalize analysis");
  }

  const bundle = await getAnalysisBundle(
    client,
    input.organizationId,
    input.mediaAssetId,
  );
  if (bundle.error || !bundle.data) {
    return fail(bundle.error ?? "Analysis saved but reload failed");
  }
  return ok(bundle.data);
}
