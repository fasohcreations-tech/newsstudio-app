import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/shared/types/database.types";
import type {
  IntakeQueueFilters,
  IntakeServiceResult,
  SourceItem,
  SourceItemWithType,
  SourceType,
  StorySource,
} from "@/features/intake/types/intake.types";
import type { IntakeExtractionStatus } from "@/features/intake/constants/intake.constants";
import { uniqueSlug } from "@/features/newsroom/lib/story-utils";
import { createIntakeExtractors } from "@/features/intake/services/extractors";

type Client = SupabaseClient<Database>;

const SOURCE_ITEM_COLUMNS =
  "id, organization_id, source_type_id, original_url, title, extraction_status, imported_at, reporter_id, media_asset_id, metadata, extracted_content, extracted_metadata, error, created_by, updated_by, created_at, updated_at, deleted_at";

const SOURCE_ITEM_SELECT = `
  ${SOURCE_ITEM_COLUMNS},
  source_type:source_types!source_items_source_type_id_fkey(id, code, name, category),
  reporter:profiles!source_items_reporter_id_fkey(id, full_name, email)
`;

const SOURCE_TYPE_SELECT =
  "id, code, name, category, description, is_active, sort_order, created_at, updated_at";

const STORY_SOURCE_SELECT =
  "id, organization_id, story_id, source_item_id, is_primary, created_by, created_at, updated_at, deleted_at";

/**
 * IntakeService — queue + provenance scaffolding.
 * Does not scrape, OCR, or call AI.
 */
export async function listSourceTypes(
  client: Client,
): Promise<IntakeServiceResult<SourceType[]>> {
  const { data, error } = await client
    .from("source_types")
    .select(SOURCE_TYPE_SELECT)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) return { data: null, error: error.message };
  return { data: data ?? [], error: null };
}

export async function getSourceTypeByCode(
  client: Client,
  code: string,
): Promise<IntakeServiceResult<SourceType>> {
  const { data, error } = await client
    .from("source_types")
    .select(SOURCE_TYPE_SELECT)
    .eq("code", code)
    .eq("is_active", true)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: `Unknown source type: ${code}` };
  return { data, error: null };
}

export async function listSourceItems(
  client: Client,
  filters: IntakeQueueFilters,
): Promise<IntakeServiceResult<SourceItemWithType[]>> {
  let query = client
    .from("source_items")
    .select(SOURCE_ITEM_SELECT)
    .eq("organization_id", filters.organizationId)
    .is("deleted_at", null)
    .order("imported_at", { ascending: false })
    .limit(filters.limit ?? 50);

  if (filters.status && filters.status !== "all") {
    query = query.eq("extraction_status", filters.status);
  }

  if (filters.sourceTypeCode && filters.sourceTypeCode !== "all") {
    const typeResult = await getSourceTypeByCode(client, filters.sourceTypeCode);
    if (typeResult.error || !typeResult.data) {
      return { data: null, error: typeResult.error ?? "Source type not found." };
    }
    query = query.eq("source_type_id", typeResult.data.id);
  }

  if (filters.search?.trim()) {
    const q = filters.search.trim();
    query = query.or(`title.ilike.%${q}%,original_url.ilike.%${q}%`);
  }

  const { data, error } = await query;
  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as unknown as SourceItemWithType[], error: null };
}

export async function getSourceItem(
  client: Client,
  id: string,
): Promise<IntakeServiceResult<SourceItemWithType>> {
  const { data, error } = await client
    .from("source_items")
    .select(SOURCE_ITEM_SELECT)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: "Source item not found." };
  return { data: data as unknown as SourceItemWithType, error: null };
}

export type EnqueueSourceInput = {
  organizationId: string;
  userId: string;
  sourceTypeCode: string;
  originalUrl?: string | null;
  title?: string | null;
  metadata?: Json;
  reporterId?: string | null;
  mediaAssetId?: string | null;
};

export async function enqueueSourceItem(
  client: Client,
  input: EnqueueSourceInput,
): Promise<IntakeServiceResult<SourceItemWithType>> {
  const typeResult = await getSourceTypeByCode(client, input.sourceTypeCode);
  if (typeResult.error || !typeResult.data) {
    return { data: null, error: typeResult.error ?? "Invalid source type." };
  }

  const extractors = createIntakeExtractors();
  const url = input.originalUrl?.trim() || null;

  if (url && (typeResult.data.category === "url" || typeResult.data.category === "social" || typeResult.data.category === "feed")) {
    const validation =
      typeResult.data.category === "feed"
        ? await extractors.rssReader.validate(url)
        : await extractors.urlExtractor.validate(url);
    if (!validation.valid) {
      return { data: null, error: validation.reason ?? "Validation failed." };
    }
  }

  const title =
    input.title?.trim() ||
    (url ? deriveTitleFromUrl(url) : null) ||
    `${typeResult.data.name} intake`;

  const { data, error } = await client
    .from("source_items")
    .insert({
      organization_id: input.organizationId,
      source_type_id: typeResult.data.id,
      original_url: url,
      title,
      extraction_status: "pending",
      reporter_id: input.reporterId ?? input.userId,
      media_asset_id: input.mediaAssetId ?? null,
      metadata: input.metadata ?? {},
      created_by: input.userId,
      updated_by: input.userId,
    })
    .select(SOURCE_ITEM_SELECT)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as unknown as SourceItemWithType, error: null };
}

export async function updateSourceItemStatus(
  client: Client,
  id: string,
  userId: string,
  status: IntakeExtractionStatus,
  patch?: {
    error?: string | null;
    extractedContent?: string | null;
    extractedMetadata?: Json;
  },
): Promise<IntakeServiceResult<SourceItem>> {
  const { data, error } = await client
    .from("source_items")
    .update({
      extraction_status: status,
      error: patch?.error ?? null,
      extracted_content: patch?.extractedContent,
      extracted_metadata: patch?.extractedMetadata,
      updated_by: userId,
    })
    .eq("id", id)
    .is("deleted_at", null)
    .select(SOURCE_ITEM_COLUMNS)
    .single();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

/**
 * Create a draft Story from a source item and store provenance in story_sources.
 * Uses title/summary placeholders — extraction pipelines are deferred.
 */
export async function createStoryFromSourceItem(
  client: Client,
  args: {
    sourceItemId: string;
    userId: string;
  },
): Promise<
  IntakeServiceResult<{ storyId: string; sourceItem: SourceItemWithType }>
> {
  const itemResult = await getSourceItem(client, args.sourceItemId);
  if (itemResult.error || !itemResult.data) {
    return { data: null, error: itemResult.error ?? "Source item not found." };
  }

  const item = itemResult.data;
  if (item.extraction_status === "story_created") {
    return { data: null, error: "A story was already created from this source." };
  }

  const title = item.title?.trim() || "Untitled intake story";
  const summary =
    item.extracted_content?.slice(0, 500) ||
    (item.original_url
      ? `Imported from ${item.original_url}`
      : `Imported via ${item.source_type.name}`);

  const slug = uniqueSlug(title);

  const { data: story, error: storyError } = await client
    .from("stories")
    .insert({
      organization_id: item.organization_id,
      title,
      summary,
      slug,
      status: "draft",
      priority: "normal",
      language: "en",
      reporter_id: item.reporter_id ?? args.userId,
      created_by: args.userId,
      updated_by: args.userId,
    })
    .select("id")
    .single();

  if (storyError || !story) {
    return { data: null, error: storyError?.message ?? "Unable to create story." };
  }

  const { error: linkError } = await client.from("story_sources").insert({
    organization_id: item.organization_id,
    story_id: story.id,
    source_item_id: item.id,
    is_primary: true,
    created_by: args.userId,
  });

  if (linkError) {
    return { data: null, error: linkError.message };
  }

  const statusUpdate = await updateSourceItemStatus(
    client,
    item.id,
    args.userId,
    "story_created",
    {
      extractedMetadata: {
        ...(typeof item.extracted_metadata === "object" &&
        item.extracted_metadata &&
        !Array.isArray(item.extracted_metadata)
          ? item.extracted_metadata
          : {}),
        storyId: story.id,
      },
    },
  );

  if (statusUpdate.error) {
    return { data: null, error: statusUpdate.error };
  }

  const refreshed = await getSourceItem(client, item.id);
  return {
    data: {
      storyId: story.id,
      sourceItem: refreshed.data ?? item,
    },
    error: null,
  };
}

export async function listStorySources(
  client: Client,
  storyId: string,
): Promise<IntakeServiceResult<StorySource[]>> {
  const { data, error } = await client
    .from("story_sources")
    .select(STORY_SOURCE_SELECT)
    .eq("story_id", storyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) return { data: null, error: error.message };
  return { data: data ?? [], error: null };
}

function deriveTitleFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return `Import from ${host}`;
  } catch {
    return "Imported source";
  }
}
