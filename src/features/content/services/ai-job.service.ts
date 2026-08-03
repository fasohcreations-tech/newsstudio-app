import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/shared/types/database.types";
import type {
  AiJob,
  AiJobFilters,
  AiJobInsert,
  AiJobUpdate,
  ContentServiceResult,
  StoryScopedQuery,
} from "@/features/content/types/content.types";

type Client = SupabaseClient<Database>;

export const AI_JOB_SELECT =
  "id, organization_id, story_id, content_object_id, provider, model, job_type, status, request, response, tokens_used, cost, processing_time_ms, error, created_by, updated_by, created_at, updated_at";

/**
 * AIJobService — ledger access for AI jobs.
 * No provider calls, token metering, or orchestration in this sprint.
 */
export async function listAiJobs(
  client: Client,
  scope: StoryScopedQuery,
  filters: AiJobFilters = {},
): Promise<ContentServiceResult<AiJob[]>> {
  let query = client
    .from("ai_jobs")
    .select(AI_JOB_SELECT)
    .eq("organization_id", scope.organizationId)
    .eq("story_id", scope.storyId)
    .order("created_at", { ascending: false });

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.jobType) query = query.eq("job_type", filters.jobType);
  if (filters.provider) query = query.eq("provider", filters.provider);
  if (filters.contentObjectId) {
    query = query.eq("content_object_id", filters.contentObjectId);
  }

  const { data, error } = await query;
  if (error) return { data: null, error: error.message };
  return { data: data ?? [], error: null };
}

export async function getAiJob(
  client: Client,
  id: string,
): Promise<ContentServiceResult<AiJob>> {
  const { data, error } = await client
    .from("ai_jobs")
    .select(AI_JOB_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: "AI job not found." };
  return { data, error: null };
}

export async function createAiJob(
  client: Client,
  input: AiJobInsert,
): Promise<ContentServiceResult<AiJob>> {
  const { data, error } = await client
    .from("ai_jobs")
    .insert(input)
    .select(AI_JOB_SELECT)
    .single();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function updateAiJob(
  client: Client,
  id: string,
  patch: AiJobUpdate,
): Promise<ContentServiceResult<AiJob>> {
  const { data, error } = await client
    .from("ai_jobs")
    .update(patch)
    .eq("id", id)
    .select(AI_JOB_SELECT)
    .single();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}
