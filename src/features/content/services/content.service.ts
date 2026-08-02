import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/shared/types/database.types";
import type {
  ContentObject,
  ContentObjectFilters,
  ContentObjectInsert,
  ContentObjectUpdate,
  ContentServiceResult,
  StoryScopedQuery,
} from "@/features/content/types/content.types";

type Client = SupabaseClient<Database>;

/**
 * ContentService — foundation for story-scoped content objects.
 * Architecture only: CRUD scaffolding, no domain workflows.
 */
export async function listContentObjects(
  client: Client,
  scope: StoryScopedQuery,
  filters: ContentObjectFilters = {},
): Promise<ContentServiceResult<ContentObject[]>> {
  let query = client
    .from("content_objects")
    .select("*")
    .eq("organization_id", scope.organizationId)
    .eq("story_id", scope.storyId)
    .order("updated_at", { ascending: false });

  if (!filters.includeDeleted) {
    query = query.is("deleted_at", null);
  }
  if (filters.type) query = query.eq("type", filters.type);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.language) query = query.eq("language", filters.language);

  const { data, error } = await query;
  if (error) return { data: null, error: error.message };
  return { data: data ?? [], error: null };
}

export async function getContentObject(
  client: Client,
  id: string,
): Promise<ContentServiceResult<ContentObject>> {
  const { data, error } = await client
    .from("content_objects")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: "Content object not found." };
  return { data, error: null };
}

export async function createContentObject(
  client: Client,
  input: ContentObjectInsert,
): Promise<ContentServiceResult<ContentObject>> {
  const { data, error } = await client
    .from("content_objects")
    .insert(input)
    .select("*")
    .single();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function updateContentObject(
  client: Client,
  id: string,
  patch: ContentObjectUpdate,
): Promise<ContentServiceResult<ContentObject>> {
  const { data, error } = await client
    .from("content_objects")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select("*")
    .single();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function softDeleteContentObject(
  client: Client,
  id: string,
  updatedBy: string,
): Promise<ContentServiceResult<ContentObject>> {
  return updateContentObject(client, id, {
    deleted_at: new Date().toISOString(),
    updated_by: updatedBy,
  });
}
