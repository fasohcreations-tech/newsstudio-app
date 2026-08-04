"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  acceptAssetCandidate,
  discoverStoryAssets,
  getStoryDiscoveryBundle,
  rejectAssetCandidate,
  setPreferredDiscoveryProvider,
} from "@/features/ai-asset-discovery/services/asset-discovery.service";
import {
  importWebMediaAsSubHeadlineAsset,
  type ImportWebMediaResult,
} from "@/features/ai-asset-discovery/services/import-web-media.service";
import {
  searchWebMediaForSubHeadline,
  type WebMediaHit,
  type WebMediaSearchResult,
} from "@/features/ai-asset-discovery/services/web-media-search.service";
import type {
  AssetDiscoveryProviderId,
  DiscoverStoryAssetsResult,
  StoryDiscoveryBundle,
} from "@/features/ai-asset-discovery/types/discovery.types";
import { requireAuth } from "@/features/auth/guards/require-auth";
import { resolveActiveMembership } from "@/features/organization/services/resolve-active-membership";
import { getCurrentProfile } from "@/features/profile/services/profile.service";
import { parseSubHeadlineSlots } from "@/features/story-production/lib/sub-headlines";
import { createClient } from "@/shared/lib/supabase/server";

export type AssetDiscoveryActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

const PROVIDER_IDS = [
  "local_media_library",
  "supabase_storage",
  "organization_library",
  "free_image",
  "free_video",
  "licensed_stock",
  "news_agency",
  "custom_search",
  "previously_used",
] as const;

async function requireStoryContext(storyId: string) {
  const user = await requireAuth(`/newsroom/stories/${storyId}`);
  const supabase = await createClient();
  const { profile } = await getCurrentProfile(supabase, user.id);
  const { membership, error } = await resolveActiveMembership(
    supabase,
    user.id,
    profile?.email ?? user.email ?? "",
    profile?.full_name,
  );

  if (!membership) {
    return {
      user,
      supabase,
      membership: null as null,
      error: error ?? "Organization required",
    };
  }

  const { data: story, error: storyError } = await supabase
    .from("stories")
    .select("id, organization_id")
    .eq("id", storyId)
    .is("deleted_at", null)
    .maybeSingle();

  if (storyError || !story) {
    return {
      user,
      supabase,
      membership: null as null,
      error: storyError?.message ?? "Story not found",
    };
  }

  if (story.organization_id !== membership.organization.id) {
    return {
      user,
      supabase,
      membership: null as null,
      error: "Story belongs to another organization",
    };
  }

  return { user, supabase, membership, error: null as string | null };
}

const discoverSchema = z.object({
  storyId: z.string().uuid(),
  panelIndex: z.number().int().min(0).max(15).optional(),
  preferredProvider: z.enum(PROVIDER_IDS).nullable().optional(),
  mediaFilter: z.enum(["both", "image", "video"]).optional(),
});

export async function getStoryAssetDiscoveryAction(
  storyId: string,
): Promise<AssetDiscoveryActionResult<StoryDiscoveryBundle>> {
  const ctx = await requireStoryContext(storyId);
  if (!ctx.membership || ctx.error) {
    return { success: false, error: ctx.error ?? "Unauthorized" };
  }

  const result = await getStoryDiscoveryBundle(ctx.supabase, storyId);
  if (result.error || !result.data) {
    return { success: false, error: result.error ?? "Failed to load discovery" };
  }
  return { success: true, data: result.data };
}

export async function discoverStoryAssetsAction(
  raw: unknown,
): Promise<AssetDiscoveryActionResult<DiscoverStoryAssetsResult>> {
  const parsed = discoverSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid discovery request",
    };
  }

  const ctx = await requireStoryContext(parsed.data.storyId);
  if (!ctx.membership || ctx.error) {
    return { success: false, error: ctx.error ?? "Unauthorized" };
  }

  const result = await discoverStoryAssets(ctx.supabase, {
    storyId: parsed.data.storyId,
    userId: ctx.user.id,
    panelIndex: parsed.data.panelIndex,
    preferredProvider: parsed.data.preferredProvider ?? null,
    mediaFilter: parsed.data.mediaFilter ?? "both",
  });

  if (result.error || !result.data) {
    return { success: false, error: result.error ?? "Discovery failed" };
  }

  revalidatePath(`/newsroom/stories/${parsed.data.storyId}`);
  return { success: true, data: result.data };
}

const decideSchema = z.object({
  storyId: z.string().uuid(),
  candidateId: z.string().uuid(),
  note: z.string().trim().max(400).optional(),
});

export async function acceptDiscoveryCandidateAction(
  raw: unknown,
): Promise<AssetDiscoveryActionResult<{ candidateId: string }>> {
  const parsed = decideSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: "Invalid accept request" };
  }

  const ctx = await requireStoryContext(parsed.data.storyId);
  if (!ctx.membership || ctx.error) {
    return { success: false, error: ctx.error ?? "Unauthorized" };
  }

  const result = await acceptAssetCandidate(ctx.supabase, {
    candidateId: parsed.data.candidateId,
    userId: ctx.user.id,
    note: parsed.data.note,
  });

  if (result.error || !result.data) {
    return { success: false, error: result.error ?? "Accept failed" };
  }

  revalidatePath(`/newsroom/stories/${parsed.data.storyId}`);
  return { success: true, data: { candidateId: result.data.id } };
}

export async function rejectDiscoveryCandidateAction(
  raw: unknown,
): Promise<AssetDiscoveryActionResult<{ candidateId: string }>> {
  const parsed = decideSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: "Invalid reject request" };
  }

  const ctx = await requireStoryContext(parsed.data.storyId);
  if (!ctx.membership || ctx.error) {
    return { success: false, error: ctx.error ?? "Unauthorized" };
  }

  const result = await rejectAssetCandidate(ctx.supabase, {
    candidateId: parsed.data.candidateId,
    userId: ctx.user.id,
    note: parsed.data.note,
  });

  if (result.error || !result.data) {
    return { success: false, error: result.error ?? "Reject failed" };
  }

  revalidatePath(`/newsroom/stories/${parsed.data.storyId}`);
  return { success: true, data: { candidateId: result.data.id } };
}

const preferredSchema = z.object({
  storyId: z.string().uuid(),
  provider: z.enum(PROVIDER_IDS).nullable(),
});

export async function setPreferredDiscoveryProviderAction(
  raw: unknown,
): Promise<AssetDiscoveryActionResult<{ provider: AssetDiscoveryProviderId | null }>> {
  const parsed = preferredSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: "Invalid provider" };
  }

  const ctx = await requireStoryContext(parsed.data.storyId);
  if (!ctx.membership || ctx.error) {
    return { success: false, error: ctx.error ?? "Unauthorized" };
  }

  const result = await setPreferredDiscoveryProvider(ctx.supabase, {
    storyId: parsed.data.storyId,
    userId: ctx.user.id,
    provider: parsed.data.provider,
  });

  if (result.error || !result.data) {
    return { success: false, error: result.error ?? "Could not save preference" };
  }

  return {
    success: true,
    data: { provider: result.data.preferred_provider },
  };
}

const webSearchSchema = z.object({
  storyId: z.string().uuid(),
  panelIndex: z.number().int().min(0).max(15),
  /** Live editor text (preferred over saved summary). */
  sceneHeadline: z.string().trim().min(1).max(400).optional(),
  mediaFilter: z.enum(["both", "image", "video"]).optional(),
  limit: z.number().int().min(4).max(24).optional(),
});

const webHitSchema = z.object({
  id: z.string().min(1).max(200),
  provider: z.enum([
    "pexels",
    "unsplash",
    "google_cse",
    "youtube",
    "facebook",
  ]),
  kind: z.enum(["image", "video"]),
  title: z.string().max(300),
  thumbnailUrl: z.string().max(2000),
  previewUrl: z.string().max(2000),
  downloadUrl: z.string().url().max(2000),
  pageUrl: z.string().max(2000),
  photographer: z.string().max(200).optional(),
  licenseInfo: z.string().max(400),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  durationSeconds: z.number().nonnegative().optional(),
  mimeTypeHint: z.string().max(120).optional(),
  linkOnly: z.boolean().optional(),
});

const importWebSchema = z.object({
  storyId: z.string().uuid(),
  panelIndex: z.number().int().min(0).max(15),
  hit: webHitSchema,
});

/**
 * AI expands Sub Headline → stock + YouTube / Google / Facebook search.
 */
export async function searchWebMediaForSubHeadlineAction(
  raw: unknown,
): Promise<AssetDiscoveryActionResult<WebMediaSearchResult>> {
  const parsed = webSearchSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid web search request",
    };
  }

  const ctx = await requireStoryContext(parsed.data.storyId);
  if (!ctx.membership || ctx.error) {
    return { success: false, error: ctx.error ?? "Unauthorized" };
  }

  const { data: story, error: storyError } = await ctx.supabase
    .from("stories")
    .select("id, title, summary, category, language")
    .eq("id", parsed.data.storyId)
    .is("deleted_at", null)
    .maybeSingle();

  if (storyError || !story) {
    return { success: false, error: storyError?.message ?? "Story not found" };
  }

  const slots = parseSubHeadlineSlots(story.summary);
  const sceneHeadline =
    (parsed.data.sceneHeadline ?? "").trim() ||
    (slots[parsed.data.panelIndex] ?? "").trim();
  if (!sceneHeadline) {
    return {
      success: false,
      error: "Enter Sub Headline text first, then search the web.",
    };
  }

  const result = await searchWebMediaForSubHeadline(ctx.supabase, {
    organizationId: ctx.membership.organization.id,
    userId: ctx.user.id,
    storyId: story.id,
    sceneHeadline,
    storyHeadline: story.title?.trim() || sceneHeadline,
    category: story.category ?? undefined,
    language: story.language ?? undefined,
    mediaFilter: parsed.data.mediaFilter ?? "both",
    limit: parsed.data.limit ?? 12,
  });

  if (result.error || !result.data) {
    return { success: false, error: result.error ?? "Web search failed" };
  }

  return { success: true, data: result.data };
}

/**
 * Download a web hit into Media Library and bind to the Sub Headline slot.
 */
export async function importWebMediaAsAssetAction(
  raw: unknown,
): Promise<AssetDiscoveryActionResult<ImportWebMediaResult>> {
  const parsed = importWebSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid import request",
    };
  }

  const ctx = await requireStoryContext(parsed.data.storyId);
  if (!ctx.membership || ctx.error) {
    return { success: false, error: ctx.error ?? "Unauthorized" };
  }

  const result = await importWebMediaAsSubHeadlineAsset(ctx.supabase, {
    organizationId: ctx.membership.organization.id,
    userId: ctx.user.id,
    storyId: parsed.data.storyId,
    panelIndex: parsed.data.panelIndex,
    hit: parsed.data.hit as WebMediaHit,
  });

  if (result.error || !result.data) {
    return { success: false, error: result.error ?? "Import failed" };
  }

  revalidatePath(`/newsroom/stories/${parsed.data.storyId}`);
  revalidatePath("/media-library");
  return { success: true, data: result.data };
}
