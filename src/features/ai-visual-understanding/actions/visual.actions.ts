"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  acceptClipSuggestion,
  buildPanelContextFromStory,
  listPanelSuggestions,
  recommendClipForPanel,
  rejectClipSuggestion,
} from "@/features/ai-visual-understanding/services/clip-recommendation.service";
import {
  analyzeMediaAsset,
  getAnalysisBundle,
} from "@/features/ai-visual-understanding/services/visual-analysis.service";
import {
  analyzeAssetSchema,
  recommendClipSchema,
  suggestionDecisionSchema,
} from "@/features/ai-visual-understanding/schemas/visual.schemas";
import type {
  AnalysisBundle,
  ClipRecommendation,
  StoryPanelClipSuggestionRow,
} from "@/features/ai-visual-understanding/types/visual.types";
import { requireAuth } from "@/features/auth/guards/require-auth";
import { resolveActiveMembership } from "@/features/organization/services/resolve-active-membership";
import { getCurrentProfile } from "@/features/profile/services/profile.service";
import { createClient } from "@/shared/lib/supabase/server";

export type VisualActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

async function requireOrgContext(redirectTo = "/media-library/clip-editor") {
  const user = await requireAuth(redirectTo);
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
  return { user, supabase, membership, error: null as string | null };
}

/** Queue + run visual analysis (reuses ready packages unless force). */
export async function analyzeVideoAssetAction(
  raw: unknown,
): Promise<VisualActionResult<AnalysisBundle>> {
  const parsed = analyzeAssetSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const ctx = await requireOrgContext();
  if (!ctx.membership || ctx.error) {
    return { success: false, error: ctx.error ?? "Unauthorized" };
  }

  const result = await analyzeMediaAsset(ctx.supabase, {
    organizationId: ctx.membership.organization.id,
    userId: ctx.user.id,
    mediaAssetId: parsed.data.mediaAssetId,
    force: parsed.data.force,
    durationMs: parsed.data.durationMs,
  });

  if (result.error || !result.data) {
    return { success: false, error: result.error ?? "Analysis failed" };
  }

  revalidatePath("/media-library/clip-editor");
  return { success: true, data: result.data };
}

export async function getVideoAnalysisAction(
  mediaAssetId: string,
): Promise<VisualActionResult<AnalysisBundle | null>> {
  const id = z.string().uuid().safeParse(mediaAssetId);
  if (!id.success) return { success: false, error: "Invalid asset id" };

  const ctx = await requireOrgContext();
  if (!ctx.membership || ctx.error) {
    return { success: false, error: ctx.error ?? "Unauthorized" };
  }

  const result = await getAnalysisBundle(
    ctx.supabase,
    ctx.membership.organization.id,
    id.data,
  );
  if (result.error) return { success: false, error: result.error };
  return { success: true, data: result.data };
}

/** Semantic clip recommendation for a Story Panel + video asset. */
export async function recommendClipForPanelAction(
  raw: unknown,
): Promise<VisualActionResult<ClipRecommendation>> {
  const parsed = recommendClipSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const ctx = await requireOrgContext(`/newsroom/stories/${parsed.data.storyId}`);
  if (!ctx.membership || ctx.error) {
    return { success: false, error: ctx.error ?? "Unauthorized" };
  }

  const panelCtx = await buildPanelContextFromStory(
    ctx.supabase,
    ctx.membership.organization.id,
    parsed.data.storyId,
    parsed.data.panelIndex,
  );
  if (panelCtx.error || !panelCtx.data) {
    return { success: false, error: panelCtx.error ?? "Panel context failed" };
  }

  const result = await recommendClipForPanel(ctx.supabase, {
    organizationId: ctx.membership.organization.id,
    userId: ctx.user.id,
    mediaAssetId: parsed.data.mediaAssetId,
    panel: panelCtx.data,
    excludeSuggestionId: parsed.data.excludeSuggestionId,
    targetDurationMs: parsed.data.targetDurationMs,
  });

  if (result.error || !result.data) {
    return { success: false, error: result.error ?? "Recommendation failed" };
  }

  revalidatePath(`/newsroom/stories/${parsed.data.storyId}`);
  revalidatePath("/media-library/clip-editor");
  return { success: true, data: result.data };
}

export async function listClipSuggestionsAction(
  storyId: string,
  panelIndex?: number,
): Promise<VisualActionResult<StoryPanelClipSuggestionRow[]>> {
  const id = z.string().uuid().safeParse(storyId);
  if (!id.success) return { success: false, error: "Invalid story id" };

  const ctx = await requireOrgContext(`/newsroom/stories/${storyId}`);
  if (!ctx.membership || ctx.error) {
    return { success: false, error: ctx.error ?? "Unauthorized" };
  }

  const result = await listPanelSuggestions(
    ctx.supabase,
    ctx.membership.organization.id,
    id.data,
    panelIndex,
  );
  if (result.error || !result.data) {
    return { success: false, error: result.error ?? "Failed to list suggestions" };
  }
  return { success: true, data: result.data };
}

export async function acceptClipSuggestionAction(
  raw: unknown,
): Promise<
  VisualActionResult<{
    suggestion: StoryPanelClipSuggestionRow;
    clipId: string;
    mediaRef: string;
  }>
> {
  const parsed = suggestionDecisionSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const ctx = await requireOrgContext();
  if (!ctx.membership || ctx.error) {
    return { success: false, error: ctx.error ?? "Unauthorized" };
  }

  const result = await acceptClipSuggestion(ctx.supabase, {
    organizationId: ctx.membership.organization.id,
    userId: ctx.user.id,
    suggestionId: parsed.data.suggestionId,
    inPointMs: parsed.data.inPointMs,
    outPointMs: parsed.data.outPointMs,
    clipName: parsed.data.clipName,
    attachToStoryPanel: parsed.data.attachToStoryPanel,
  });

  if (result.error || !result.data) {
    return { success: false, error: result.error ?? "Accept failed" };
  }

  revalidatePath("/media-library/clip-editor");
  revalidatePath("/media-library/clips");
  revalidatePath(`/newsroom/stories/${result.data.suggestion.story_id}`);
  return { success: true, data: result.data };
}

export async function rejectClipSuggestionAction(
  suggestionId: string,
): Promise<VisualActionResult<StoryPanelClipSuggestionRow>> {
  const id = z.string().uuid().safeParse(suggestionId);
  if (!id.success) return { success: false, error: "Invalid suggestion id" };

  const ctx = await requireOrgContext();
  if (!ctx.membership || ctx.error) {
    return { success: false, error: ctx.error ?? "Unauthorized" };
  }

  const result = await rejectClipSuggestion(ctx.supabase, {
    organizationId: ctx.membership.organization.id,
    userId: ctx.user.id,
    suggestionId: id.data,
  });

  if (result.error || !result.data) {
    return { success: false, error: result.error ?? "Reject failed" };
  }

  revalidatePath(`/newsroom/stories/${result.data.story_id}`);
  revalidatePath("/media-library/clip-editor");
  return { success: true, data: result.data };
}

/** Request another suggestion (supersedes pending, returns a new one). */
export async function requestAnotherClipSuggestionAction(
  raw: unknown,
): Promise<VisualActionResult<ClipRecommendation>> {
  const parsed = recommendClipSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  return recommendClipForPanelAction({
    ...parsed.data,
    excludeSuggestionId: parsed.data.excludeSuggestionId,
  });
}
