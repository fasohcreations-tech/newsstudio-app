import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/shared/types/database.types";
import type {
  ContentServiceResult,
  RenderJob,
  RenderJobFilters,
  RenderJobInsert,
  RenderJobUpdate,
  StoryScopedQuery,
} from "@/features/content/types/content.types";

type Client = SupabaseClient<Database>;

const RENDER_JOB_SELECT =
  "id, organization_id, story_id, content_object_id, renderer, status, progress, output_path, started_at, finished_at, error, created_by, updated_by, created_at, updated_at";

/**
 * RenderService — ledger access for render / encode jobs.
 * No renderer adapters or progress workers in this sprint.
 */
export async function listRenderJobs(
  client: Client,
  scope: StoryScopedQuery,
  filters: RenderJobFilters = {},
): Promise<ContentServiceResult<RenderJob[]>> {
  let query = client
    .from("render_jobs")
    .select(RENDER_JOB_SELECT)
    .eq("organization_id", scope.organizationId)
    .eq("story_id", scope.storyId)
    .order("created_at", { ascending: false });

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.renderer) query = query.eq("renderer", filters.renderer);
  if (filters.contentObjectId) {
    query = query.eq("content_object_id", filters.contentObjectId);
  }

  const { data, error } = await query;
  if (error) return { data: null, error: error.message };
  return { data: data ?? [], error: null };
}

export async function getRenderJob(
  client: Client,
  id: string,
): Promise<ContentServiceResult<RenderJob>> {
  const { data, error } = await client
    .from("render_jobs")
    .select(RENDER_JOB_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: "Render job not found." };
  return { data, error: null };
}

export async function createRenderJob(
  client: Client,
  input: RenderJobInsert,
): Promise<ContentServiceResult<RenderJob>> {
  const { data, error } = await client
    .from("render_jobs")
    .insert(input)
    .select(RENDER_JOB_SELECT)
    .single();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function updateRenderJob(
  client: Client,
  id: string,
  patch: RenderJobUpdate,
): Promise<ContentServiceResult<RenderJob>> {
  const { data, error } = await client
    .from("render_jobs")
    .update(patch)
    .eq("id", id)
    .select(RENDER_JOB_SELECT)
    .single();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}
