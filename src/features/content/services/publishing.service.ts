import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/shared/types/database.types";
import type {
  ContentServiceResult,
  OutputPackage,
  OutputPackageFilters,
  OutputPackageInsert,
  OutputPackageUpdate,
  PublishJob,
  PublishJobFilters,
  PublishJobInsert,
  PublishJobUpdate,
  StoryScopedQuery,
} from "@/features/content/types/content.types";

type Client = SupabaseClient<Database>;

const OUTPUT_PACKAGE_SELECT =
  "id, organization_id, story_id, content_object_id, platform, status, metadata, created_by, updated_by, created_at, updated_at, deleted_at";

const PUBLISH_JOB_SELECT =
  "id, organization_id, story_id, output_package_id, destination, status, scheduled_at, published_at, response, error, created_by, updated_by, created_at, updated_at";

/**
 * PublishingService — output packages + publish job ledger.
 * No destination adapters or scheduled delivery in this sprint.
 */
export async function listOutputPackages(
  client: Client,
  scope: StoryScopedQuery,
  filters: OutputPackageFilters = {},
): Promise<ContentServiceResult<OutputPackage[]>> {
  let query = client
    .from("output_packages")
    .select(OUTPUT_PACKAGE_SELECT)
    .eq("organization_id", scope.organizationId)
    .eq("story_id", scope.storyId)
    .order("updated_at", { ascending: false });

  if (!filters.includeDeleted) {
    query = query.is("deleted_at", null);
  }
  if (filters.platform) query = query.eq("platform", filters.platform);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.contentObjectId) {
    query = query.eq("content_object_id", filters.contentObjectId);
  }

  const { data, error } = await query;
  if (error) return { data: null, error: error.message };
  return { data: data ?? [], error: null };
}

export async function getOutputPackage(
  client: Client,
  id: string,
): Promise<ContentServiceResult<OutputPackage>> {
  const { data, error } = await client
    .from("output_packages")
    .select(OUTPUT_PACKAGE_SELECT)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: "Output package not found." };
  return { data, error: null };
}

export async function createOutputPackage(
  client: Client,
  input: OutputPackageInsert,
): Promise<ContentServiceResult<OutputPackage>> {
  const { data, error } = await client
    .from("output_packages")
    .insert(input)
    .select(OUTPUT_PACKAGE_SELECT)
    .single();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function updateOutputPackage(
  client: Client,
  id: string,
  patch: OutputPackageUpdate,
): Promise<ContentServiceResult<OutputPackage>> {
  const { data, error } = await client
    .from("output_packages")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(OUTPUT_PACKAGE_SELECT)
    .single();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function listPublishJobs(
  client: Client,
  scope: StoryScopedQuery,
  filters: PublishJobFilters = {},
): Promise<ContentServiceResult<PublishJob[]>> {
  let query = client
    .from("publish_jobs")
    .select(PUBLISH_JOB_SELECT)
    .eq("organization_id", scope.organizationId)
    .eq("story_id", scope.storyId)
    .order("created_at", { ascending: false });

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.destination) query = query.eq("destination", filters.destination);
  if (filters.outputPackageId) {
    query = query.eq("output_package_id", filters.outputPackageId);
  }

  const { data, error } = await query;
  if (error) return { data: null, error: error.message };
  return { data: data ?? [], error: null };
}

export async function getPublishJob(
  client: Client,
  id: string,
): Promise<ContentServiceResult<PublishJob>> {
  const { data, error } = await client
    .from("publish_jobs")
    .select(PUBLISH_JOB_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: "Publish job not found." };
  return { data, error: null };
}

export async function createPublishJob(
  client: Client,
  input: PublishJobInsert,
): Promise<ContentServiceResult<PublishJob>> {
  const { data, error } = await client
    .from("publish_jobs")
    .insert(input)
    .select(PUBLISH_JOB_SELECT)
    .single();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function updatePublishJob(
  client: Client,
  id: string,
  patch: PublishJobUpdate,
): Promise<ContentServiceResult<PublishJob>> {
  const { data, error } = await client
    .from("publish_jobs")
    .update(patch)
    .eq("id", id)
    .select(PUBLISH_JOB_SELECT)
    .single();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}
