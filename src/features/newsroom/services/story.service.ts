import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json, StoryPriority, StoryStatus } from "@/shared/types/database.types";
import type {
  StoryCreateInput,
  StoryUpdateInput,
} from "@/features/newsroom/schemas/story.schemas";
import type {
  StoryDashboardStats,
  StoryListFilters,
  StoryListResult,
  StoryWithRelations,
} from "@/features/newsroom/types/story.types";
import {
  STORY_PAGE_SIZE,
  type StorySortOption,
} from "@/features/newsroom/constants/story.constants";
import { uniqueSlug } from "@/features/newsroom/lib/story-utils";
import { serializeSubHeadlineMedia } from "@/features/story-production/lib/sub-headlines";

type Client = SupabaseClient<Database>;

const STORY_SELECT = `
  *,
  reporter:profiles!stories_reporter_id_fkey(id, full_name, email, avatar_url),
  editor:profiles!stories_editor_id_fkey(id, full_name, email, avatar_url),
  creator:profiles!stories_created_by_fkey(id, full_name, email, avatar_url)
`;

function applySort(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  sort: StorySortOption = "updated_at_desc",
) {
  switch (sort) {
    case "created_at_desc":
      return query.order("created_at", { ascending: false });
    case "title_asc":
      return query.order("title", { ascending: true });
    case "priority_desc":
      return query.order("priority", { ascending: false }).order("updated_at", {
        ascending: false,
      });
    case "updated_at_desc":
    default:
      return query.order("updated_at", { ascending: false });
  }
}

function resolveViewFilters(filters: StoryListFilters): {
  status?: StoryStatus;
  includeDeleted: boolean;
} {
  if (filters.view === "trash" || filters.includeDeleted) {
    return { includeDeleted: true };
  }

  if (filters.view === "drafts") return { status: "draft", includeDeleted: false };
  if (filters.view === "review") return { status: "review", includeDeleted: false };
  if (filters.view === "published")
    return { status: "published", includeDeleted: false };
  if (filters.view === "archived")
    return { status: "archived", includeDeleted: false };

  if (filters.status && filters.status !== "all") {
    return { status: filters.status, includeDeleted: false };
  }

  return { includeDeleted: false };
}

export async function listStories(
  client: Client,
  filters: StoryListFilters,
): Promise<{ data: StoryListResult | null; error: string | null }> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = filters.pageSize ?? STORY_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const viewFilters = resolveViewFilters(filters);

  let query = client
    .from("stories")
    .select(STORY_SELECT, { count: "exact" })
    .eq("organization_id", filters.organizationId);

  if (viewFilters.includeDeleted) {
    query = query.not("deleted_at", "is", null);
  } else {
    query = query.is("deleted_at", null);
  }

  if (viewFilters.status) {
    query = query.eq("status", viewFilters.status);
  }

  if (filters.priority && filters.priority !== "all") {
    query = query.eq("priority", filters.priority);
  }

  if (filters.category) {
    query = query.eq("category", filters.category);
  }

  if (filters.search?.trim()) {
    const term = filters.search
      .trim()
      .replace(/[%_,]/g, " ")
      .replace(/\s+/g, " ")
      .slice(0, 100);
    if (term) {
      query = query.or(
        `title.ilike.%${term}%,subtitle.ilike.%${term}%,summary.ilike.%${term}%,category.ilike.%${term}%`,
      );
    }
  }

  query = applySort(query, filters.sort);
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    return { data: null, error: error.message };
  }

  const { data: categoryRows } = await client
    .from("stories")
    .select("category")
    .eq("organization_id", filters.organizationId)
    .is("deleted_at", null)
    .not("category", "is", null);

  const categories = Array.from(
    new Set(
      (categoryRows ?? [])
        .map((row) => row.category)
        .filter((value): value is string => Boolean(value?.trim())),
    ),
  ).sort((a, b) => a.localeCompare(b));

  return {
    data: {
      stories: (data ?? []) as unknown as StoryWithRelations[],
      total: count ?? 0,
      page,
      pageSize,
      categories,
    },
    error: null,
  };
}

export async function getStoryById(
  client: Client,
  storyId: string,
): Promise<{ story: StoryWithRelations | null; error: string | null }> {
  const { data, error } = await client
    .from("stories")
    .select(STORY_SELECT)
    .eq("id", storyId)
    .maybeSingle();

  if (error) {
    return { story: null, error: error.message };
  }

  return { story: data as unknown as StoryWithRelations | null, error: null };
}

export async function createStory(
  client: Client,
  userId: string,
  input: StoryCreateInput,
): Promise<{ story: StoryWithRelations | null; error: string | null }> {
  const payload = {
    organization_id: input.organization_id,
    title: input.title.trim(),
    subtitle: input.subtitle?.trim() || null,
    summary: input.summary?.trim() || null,
    ...(input.sub_headline_media
      ? {
          sub_headline_media: serializeSubHeadlineMedia(
            input.sub_headline_media,
          ) as unknown as Json,
        }
      : {}),
    status: input.status as StoryStatus,
    priority: input.priority as StoryPriority,
    category: input.category?.trim() || null,
    language: input.language.trim(),
    slug: uniqueSlug(input.title),
    reporter_id: userId,
    created_by: userId,
    updated_by: userId,
    published_at: input.status === "published" ? new Date().toISOString() : null,
  };

  const { data, error } = await client
    .from("stories")
    .insert(payload)
    .select(STORY_SELECT)
    .single();

  if (error) {
    return { story: null, error: error.message };
  }

  return { story: data as unknown as StoryWithRelations, error: null };
}

export async function updateStory(
  client: Client,
  storyId: string,
  userId: string,
  input: StoryUpdateInput,
): Promise<{ story: StoryWithRelations | null; error: string | null }> {
  const payload = {
    title: input.title.trim(),
    subtitle: input.subtitle?.trim() || null,
    summary: input.summary?.trim() || null,
    ...(input.sub_headline_media
      ? {
          sub_headline_media: serializeSubHeadlineMedia(
            input.sub_headline_media,
          ) as unknown as Json,
        }
      : {}),
    status: input.status as StoryStatus,
    priority: input.priority as StoryPriority,
    category: input.category?.trim() || null,
    language: input.language.trim(),
    updated_by: userId,
  };

  const { data, error } = await client
    .from("stories")
    .update(payload)
    .eq("id", storyId)
    .is("deleted_at", null)
    .select(STORY_SELECT)
    .single();

  if (error) {
    return { story: null, error: error.message };
  }

  return { story: data as unknown as StoryWithRelations, error: null };
}

export async function softDeleteStory(
  client: Client,
  storyId: string,
  userId: string,
): Promise<{ error: string | null }> {
  const { error } = await client
    .from("stories")
    .update({
      deleted_at: new Date().toISOString(),
      updated_by: userId,
    })
    .eq("id", storyId)
    .is("deleted_at", null);

  return { error: error?.message ?? null };
}

export async function restoreStory(
  client: Client,
  storyId: string,
  userId: string,
): Promise<{ story: StoryWithRelations | null; error: string | null }> {
  const { data, error } = await client
    .from("stories")
    .update({
      deleted_at: null,
      updated_by: userId,
    })
    .eq("id", storyId)
    .not("deleted_at", "is", null)
    .select(STORY_SELECT)
    .single();

  if (error) {
    return { story: null, error: error.message };
  }

  return { story: data as unknown as StoryWithRelations, error: null };
}

export async function getStoryDashboardStats(
  client: Client,
  organizationId: string,
): Promise<{ stats: StoryDashboardStats | null; error: string | null }> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [drafts, reviews, publishedToday, recent] = await Promise.all([
    client
      .from("stories")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "draft")
      .is("deleted_at", null),
    client
      .from("stories")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "review")
      .is("deleted_at", null),
    client
      .from("stories")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "published")
      .is("deleted_at", null)
      .gte("published_at", startOfDay.toISOString()),
    client
      .from("stories")
      .select(STORY_SELECT)
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(5),
  ]);

  const error =
    drafts.error?.message ||
    reviews.error?.message ||
    publishedToday.error?.message ||
    recent.error?.message ||
    null;

  if (error) {
    return { stats: null, error };
  }

  return {
    stats: {
      draftCount: drafts.count ?? 0,
      reviewCount: reviews.count ?? 0,
      publishedTodayCount: publishedToday.count ?? 0,
      recentStories: (recent.data ?? []) as unknown as StoryWithRelations[],
    },
    error: null,
  };
}
