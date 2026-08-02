import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/shared/types/database.types";
import type { AiJob } from "@/features/content/types/content.types";
import type { AIUsageStats } from "@/features/ai/types/ai";
import type { AiJobStatus } from "@/shared/types/database.types";

type Client = SupabaseClient<Database>;

export type EnqueueAiJobInput = {
  organizationId: string;
  userId: string;
  storyId?: string | null;
  contentObjectId?: string | null;
  provider: string;
  model: string | null;
  jobType: string;
  request: Json;
};

/**
 * AIJobManager — lifecycle helpers around public.ai_jobs.
 * Statuses: queued → running → succeeded | failed | cancelled
 */
export async function enqueueJob(
  client: Client,
  input: EnqueueAiJobInput,
): Promise<{ job: AiJob | null; error: string | null }> {
  const { data, error } = await client
    .from("ai_jobs")
    .insert({
      organization_id: input.organizationId,
      story_id: input.storyId ?? null,
      content_object_id: input.contentObjectId ?? null,
      provider: input.provider,
      model: input.model,
      job_type: input.jobType,
      status: "queued",
      request: input.request,
      created_by: input.userId,
      updated_by: input.userId,
    })
    .select("*")
    .single();

  if (error) return { job: null, error: error.message };
  return { job: data, error: null };
}

export async function markJobRunning(
  client: Client,
  jobId: string,
  userId: string,
): Promise<{ job: AiJob | null; error: string | null }> {
  return patchJob(client, jobId, {
    status: "running",
    updated_by: userId,
    error: null,
  });
}

export async function markJobSucceeded(
  client: Client,
  jobId: string,
  userId: string,
  args: {
    response: Json;
    tokensUsed?: number | null;
    cost?: number | null;
    processingTimeMs?: number | null;
  },
): Promise<{ job: AiJob | null; error: string | null }> {
  return patchJob(client, jobId, {
    status: "succeeded",
    response: args.response,
    tokens_used: args.tokensUsed ?? null,
    cost: args.cost ?? null,
    processing_time_ms: args.processingTimeMs ?? null,
    error: null,
    updated_by: userId,
  });
}

export async function markJobFailed(
  client: Client,
  jobId: string,
  userId: string,
  errorMessage: string,
  processingTimeMs?: number | null,
): Promise<{ job: AiJob | null; error: string | null }> {
  console.error("[AIJobManager] job failed", { jobId, errorMessage });
  return patchJob(client, jobId, {
    status: "failed",
    error: errorMessage,
    processing_time_ms: processingTimeMs ?? null,
    updated_by: userId,
  });
}

export async function markJobCancelled(
  client: Client,
  jobId: string,
  userId: string,
  reason?: string,
): Promise<{ job: AiJob | null; error: string | null }> {
  return patchJob(client, jobId, {
    status: "cancelled",
    error: reason ?? "Cancelled",
    updated_by: userId,
  });
}

export async function getJob(
  client: Client,
  jobId: string,
): Promise<{ job: AiJob | null; error: string | null }> {
  const { data, error } = await client
    .from("ai_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (error) return { job: null, error: error.message };
  if (!data) return { job: null, error: "AI job not found." };
  return { job: data, error: null };
}

export async function listRecentJobs(
  client: Client,
  organizationId: string,
  limit = 20,
): Promise<{ jobs: AiJob[]; error: string | null }> {
  const { data, error } = await client
    .from("ai_jobs")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { jobs: [], error: error.message };
  return { jobs: data ?? [], error: null };
}

export async function getUsageStats(
  client: Client,
  organizationId: string,
): Promise<{ stats: AIUsageStats; error: string | null }> {
  const { data, error } = await client
    .from("ai_jobs")
    .select("status, tokens_used, cost")
    .eq("organization_id", organizationId);

  if (error) {
    return {
      stats: emptyStats(),
      error: error.message,
    };
  }

  const stats = emptyStats();
  for (const row of data ?? []) {
    stats.totalJobs += 1;
    const status = row.status as AiJobStatus;
    if (status === "queued") stats.queued += 1;
    else if (status === "running") stats.running += 1;
    else if (status === "succeeded") stats.succeeded += 1;
    else if (status === "failed") stats.failed += 1;
    else if (status === "cancelled") stats.cancelled += 1;
    stats.tokensUsed += row.tokens_used ?? 0;
    stats.estimatedCost += Number(row.cost ?? 0);
  }
  stats.estimatedCost = Number(stats.estimatedCost.toFixed(6));
  return { stats, error: null };
}

async function patchJob(
  client: Client,
  jobId: string,
  patch: Database["public"]["Tables"]["ai_jobs"]["Update"],
): Promise<{ job: AiJob | null; error: string | null }> {
  const { data, error } = await client
    .from("ai_jobs")
    .update(patch)
    .eq("id", jobId)
    .select("*")
    .single();

  if (error) return { job: null, error: error.message };
  return { job: data, error: null };
}

function emptyStats(): AIUsageStats {
  return {
    totalJobs: 0,
    queued: 0,
    running: 0,
    succeeded: 0,
    failed: 0,
    cancelled: 0,
    tokensUsed: 0,
    estimatedCost: 0,
  };
}
