import type { SupabaseClient } from "@supabase/supabase-js";

import {
  AI_RECOMMENDATION_SELECT,
  intelligenceDb,
} from "@/features/ai/intelligence/lib/intelligence-db";
import type {
  AIIntelligenceDomain,
  AIRecommendation,
  AIRecommendationEvent,
  AIRecommendationStatus,
  CreateRecommendationInput,
  IntelligenceServiceResult,
} from "@/features/ai/intelligence/types/intelligence.types";

type Client = SupabaseClient;

function ok<T>(data: T): IntelligenceServiceResult<T> {
  return { data, error: null };
}

function fail<T>(error: string): IntelligenceServiceResult<T> {
  return { data: null, error };
}

function asRecommendation(row: Record<string, unknown>): AIRecommendation {
  return {
    ...(row as unknown as AIRecommendation),
    payload: (row.payload as Record<string, unknown>) ?? {},
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  };
}

async function recordEvent(
  client: Client,
  input: {
    organizationId: string;
    recommendationId: string;
    action: AIRecommendationEvent["action"];
    actorId: string | null;
    detail?: Record<string, unknown>;
  },
) {
  await intelligenceDb(client)
    .from("ai_recommendation_events")
    .insert({
      organization_id: input.organizationId,
      recommendation_id: input.recommendationId,
      action: input.action,
      actor_id: input.actorId,
      detail: input.detail ?? {},
    });
}

export async function createRecommendation(
  client: Client,
  input: CreateRecommendationInput,
): Promise<IntelligenceServiceResult<AIRecommendation>> {
  const { data, error } = await intelligenceDb(client)
    .from("ai_recommendations")
    .insert({
      organization_id: input.organizationId,
      domain: input.domain,
      recommendation_type: input.recommendationType,
      status: "pending",
      title: input.title,
      summary: input.summary ?? null,
      payload: input.payload ?? {},
      confidence: input.confidence ?? null,
      model_version: input.modelVersion ?? null,
      prompt_id: input.promptId ?? null,
      prompt_version: input.promptVersion ?? null,
      ai_job_id: input.aiJobId ?? null,
      story_id: input.storyId ?? null,
      project_id: input.projectId ?? null,
      scene_id: input.sceneId ?? null,
      media_asset_id: input.mediaAssetId ?? null,
      timeline_id: input.timelineId ?? null,
      source_recommendation_id: input.sourceRecommendationId ?? null,
      origin: input.origin ?? "ai",
      metadata: input.metadata ?? {},
      created_by: input.userId,
      updated_by: input.userId,
    })
    .select(AI_RECOMMENDATION_SELECT)
    .single();

  if (error || !data) {
    return fail(error?.message ?? "Failed to create recommendation");
  }

  const recommendation = asRecommendation(data as Record<string, unknown>);
  await recordEvent(client, {
    organizationId: input.organizationId,
    recommendationId: recommendation.id,
    action: "created",
    actorId: input.userId,
    detail: { type: input.recommendationType },
  });

  return ok(recommendation);
}

export async function listRecommendations(
  client: Client,
  organizationId: string,
  filters?: {
    domain?: AIIntelligenceDomain;
    status?: AIRecommendationStatus | AIRecommendationStatus[];
    storyId?: string;
    mediaAssetId?: string;
    limit?: number;
  },
): Promise<IntelligenceServiceResult<AIRecommendation[]>> {
  let query = intelligenceDb(client)
    .from("ai_recommendations")
    .select(AI_RECOMMENDATION_SELECT)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(filters?.limit ?? 50);

  if (filters?.domain) query = query.eq("domain", filters.domain);
  if (filters?.storyId) query = query.eq("story_id", filters.storyId);
  if (filters?.mediaAssetId) {
    query = query.eq("media_asset_id", filters.mediaAssetId);
  }
  if (filters?.status) {
    const statuses = Array.isArray(filters.status)
      ? filters.status
      : [filters.status];
    query = query.in("status", statuses);
  }

  const { data, error } = await query;
  if (error) return fail(error.message);
  return ok(
    (data ?? []).map((row) => asRecommendation(row as Record<string, unknown>)),
  );
}

/**
 * Accept a recommendation. Does NOT mutate Story/Scene/Timeline/Media records.
 * Callers apply payload explicitly after acceptance.
 */
export async function acceptRecommendation(
  client: Client,
  recommendationId: string,
  userId: string,
): Promise<IntelligenceServiceResult<AIRecommendation>> {
  const { data, error } = await intelligenceDb(client)
    .from("ai_recommendations")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
      accepted_by: userId,
      updated_by: userId,
      rejected_at: null,
      rejected_by: null,
      rejection_reason: null,
    })
    .eq("id", recommendationId)
    .eq("status", "pending")
    .is("deleted_at", null)
    .select(AI_RECOMMENDATION_SELECT)
    .single();

  if (error || !data) {
    return fail(
      error?.message ?? "Only pending recommendations can be accepted.",
    );
  }

  const recommendation = asRecommendation(data as Record<string, unknown>);
  await recordEvent(client, {
    organizationId: recommendation.organization_id,
    recommendationId: recommendation.id,
    action: "accepted",
    actorId: userId,
  });
  return ok(recommendation);
}

export async function rejectRecommendation(
  client: Client,
  recommendationId: string,
  userId: string,
  reason?: string,
): Promise<IntelligenceServiceResult<AIRecommendation>> {
  const { data, error } = await intelligenceDb(client)
    .from("ai_recommendations")
    .update({
      status: "rejected",
      rejected_at: new Date().toISOString(),
      rejected_by: userId,
      rejection_reason: reason ?? "Rejected by editor",
      updated_by: userId,
    })
    .eq("id", recommendationId)
    .eq("status", "pending")
    .is("deleted_at", null)
    .select(AI_RECOMMENDATION_SELECT)
    .single();

  if (error || !data) {
    return fail(
      error?.message ?? "Only pending recommendations can be rejected.",
    );
  }

  const recommendation = asRecommendation(data as Record<string, unknown>);
  await recordEvent(client, {
    organizationId: recommendation.organization_id,
    recommendationId: recommendation.id,
    action: "rejected",
    actorId: userId,
    detail: { reason: reason ?? null },
  });
  return ok(recommendation);
}

export async function supersedeRecommendation(
  client: Client,
  recommendationId: string,
  userId: string,
): Promise<IntelligenceServiceResult<AIRecommendation>> {
  const { data, error } = await intelligenceDb(client)
    .from("ai_recommendations")
    .update({
      status: "superseded",
      updated_by: userId,
    })
    .eq("id", recommendationId)
    .is("deleted_at", null)
    .select(AI_RECOMMENDATION_SELECT)
    .single();

  if (error || !data) return fail(error?.message ?? "Supersede failed");
  const recommendation = asRecommendation(data as Record<string, unknown>);
  await recordEvent(client, {
    organizationId: recommendation.organization_id,
    recommendationId: recommendation.id,
    action: "superseded",
    actorId: userId,
  });
  return ok(recommendation);
}

export async function getRecommendation(
  client: Client,
  recommendationId: string,
): Promise<IntelligenceServiceResult<AIRecommendation>> {
  const { data, error } = await intelligenceDb(client)
    .from("ai_recommendations")
    .select(AI_RECOMMENDATION_SELECT)
    .eq("id", recommendationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) return fail(error.message);
  if (!data) return fail("Recommendation not found");
  return ok(asRecommendation(data as Record<string, unknown>));
}
