"use server";

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/features/auth/guards/require-auth";
import { createClient } from "@/shared/lib/supabase/server";
import { getCurrentProfile } from "@/features/profile/services/profile.service";
import { resolveActiveMembership } from "@/features/organization/services/resolve-active-membership";
import { getStoryById } from "@/features/newsroom/services/story.service";
import { checkAIRateLimit } from "@/features/ai/lib/rate-limit";
import {
  NEWS_PRODUCER_ACTIONS,
  type NewsProducerActionId,
} from "@/features/ai-news-producer/constants/producer.constants";
import {
  approveProducerOutput,
  generateProducerOutput,
  generateSeoPackage,
  generateSocialPackage,
  listProducerOutputs,
  regenerateProducerOutput,
  rejectProducerOutput,
  saveProducerAsContentObject,
  updateProducerBody,
  type StoryProducerContext,
} from "@/features/ai-news-producer/services/news-producer.service";
import type {
  NewsProducerBundle,
  NewsProducerOutput,
} from "@/features/ai-news-producer/types/producer.types";
import type { AppliedProducerStoryPatch } from "@/features/ai-news-producer/services/news-producer.service";

export type ProducerActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type ApproveProducerActionData = NewsProducerOutput & {
  applied?: AppliedProducerStoryPatch;
};

async function requireOrg() {
  const user = await requireAuth();
  const supabase = await createClient();
  const { profile } = await getCurrentProfile(supabase, user.id);
  const { membership, error } = await resolveActiveMembership(
    supabase,
    user.id,
    profile?.email ?? user.email ?? "",
    profile?.full_name,
  );
  return { user, supabase, membership, error };
}

function revalidateStory(storyId: string) {
  revalidatePath(`/newsroom/stories/${storyId}`);
}

async function loadContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  storyId: string,
  organizationId: string,
): Promise<{ context: StoryProducerContext | null; error: string | null }> {
  const { story, error } = await getStoryById(supabase, storyId);
  if (error || !story) {
    return { context: null, error: error ?? "Story not found." };
  }
  if (story.organization_id !== organizationId) {
    return { context: null, error: "Story is outside your organization." };
  }
  return {
    context: {
      organizationId,
      storyId: story.id,
      userId,
      title: story.title,
      summary: story.summary,
      language: story.language,
      category: story.category,
    },
    error: null,
  };
}

export async function getNewsProducerBundleAction(
  storyId: string,
): Promise<ProducerActionResult<NewsProducerBundle>> {
  const { supabase, membership, error } = await requireOrg();
  if (!membership) {
    return { success: false, error: error ?? "Organization required." };
  }

  const listed = await listProducerOutputs(supabase, {
    organizationId: membership.organization.id,
    storyId,
  });
  if (listed.error) return { success: false, error: listed.error };
  return { success: true, data: { outputs: listed.data ?? [] } };
}

export async function runNewsProducerAction(
  storyId: string,
  actionId: NewsProducerActionId,
): Promise<ProducerActionResult<NewsProducerOutput[]>> {
  const { user, supabase, membership, error } = await requireOrg();
  if (!membership) {
    return { success: false, error: error ?? "Organization required." };
  }

  const rate = checkAIRateLimit(`news-producer:${user.id}`, {
    limit: 12,
    windowMs: 60_000,
  });
  if (!rate.allowed) {
    return {
      success: false,
      error: `Rate limit reached. Retry in ${Math.ceil(rate.retryAfterMs / 1000)}s.`,
    };
  }

  const action = NEWS_PRODUCER_ACTIONS.find((a) => a.id === actionId);
  if (!action) {
    return { success: false, error: "Unknown producer action." };
  }

  const loaded = await loadContext(
    supabase,
    user.id,
    storyId,
    membership.organization.id,
  );
  if (!loaded.context) {
    return { success: false, error: loaded.error ?? "Story not found." };
  }

  if (actionId === "generate_social") {
    const result = await generateSocialPackage(supabase, loaded.context);
    if (result.error && (!result.data || result.data.length === 0)) {
      return { success: false, error: result.error };
    }
    revalidateStory(storyId);
    return { success: true, data: result.data ?? [] };
  }

  if (actionId === "generate_seo") {
    const result = await generateSeoPackage(supabase, loaded.context);
    if (result.error && (!result.data || result.data.length === 0)) {
      return { success: false, error: result.error };
    }
    revalidateStory(storyId);
    return { success: true, data: result.data ?? [] };
  }

  const result = await generateProducerOutput(supabase, {
    context: loaded.context,
    kind: action.kind,
    section: action.section,
  });
  if (result.error || !result.data) {
    return { success: false, error: result.error ?? "Generation failed." };
  }

  revalidateStory(storyId);
  return { success: true, data: [result.data] };
}

export async function approveNewsProducerOutputAction(
  outputId: string,
  storyId: string,
): Promise<ProducerActionResult<ApproveProducerActionData>> {
  const { user, supabase, membership, error } = await requireOrg();
  if (!membership) {
    return { success: false, error: error ?? "Organization required." };
  }

  const result = await approveProducerOutput(supabase, {
    outputId,
    userId: user.id,
    storyId,
    organizationId: membership.organization.id,
  });
  if (result.error || !result.data) {
    return { success: false, error: result.error ?? "Approve failed." };
  }
  revalidateStory(storyId);
  return { success: true, data: result.data };
}

export async function rejectNewsProducerOutputAction(
  outputId: string,
  storyId: string,
): Promise<ProducerActionResult<NewsProducerOutput>> {
  const { user, supabase, membership, error } = await requireOrg();
  if (!membership) {
    return { success: false, error: error ?? "Organization required." };
  }

  const result = await rejectProducerOutput(supabase, {
    outputId,
    userId: user.id,
  });
  if (result.error || !result.data) {
    return { success: false, error: result.error ?? "Reject failed." };
  }
  revalidateStory(storyId);
  return { success: true, data: result.data };
}

export async function updateNewsProducerOutputAction(args: {
  outputId: string;
  storyId: string;
  body: string;
  subHeadlineMedia?: import("@/features/story-production/lib/sub-headlines").SubHeadlineMediaRef[];
}): Promise<ProducerActionResult<NewsProducerOutput>> {
  const { user, supabase, membership, error } = await requireOrg();
  if (!membership) {
    return { success: false, error: error ?? "Organization required." };
  }

  const result = await updateProducerBody(supabase, {
    outputId: args.outputId,
    userId: user.id,
    body: args.body,
    subHeadlineMedia: args.subHeadlineMedia,
  });
  if (result.error || !result.data) {
    return { success: false, error: result.error ?? "Update failed." };
  }
  revalidateStory(args.storyId);
  return { success: true, data: result.data };
}

export async function regenerateNewsProducerOutputAction(
  outputId: string,
  storyId: string,
): Promise<ProducerActionResult<NewsProducerOutput>> {
  const { user, supabase, membership, error } = await requireOrg();
  if (!membership) {
    return { success: false, error: error ?? "Organization required." };
  }

  const rate = checkAIRateLimit(`news-producer:${user.id}`, {
    limit: 12,
    windowMs: 60_000,
  });
  if (!rate.allowed) {
    return {
      success: false,
      error: `Rate limit reached. Retry in ${Math.ceil(rate.retryAfterMs / 1000)}s.`,
    };
  }

  const loaded = await loadContext(
    supabase,
    user.id,
    storyId,
    membership.organization.id,
  );
  if (!loaded.context) {
    return { success: false, error: loaded.error ?? "Story not found." };
  }

  const result = await regenerateProducerOutput(supabase, {
    outputId,
    context: loaded.context,
  });
  if (result.error || !result.data) {
    return { success: false, error: result.error ?? "Regenerate failed." };
  }
  revalidateStory(storyId);
  return { success: true, data: result.data };
}

export async function saveNewsProducerContentObjectAction(
  outputId: string,
  storyId: string,
): Promise<ProducerActionResult<ApproveProducerActionData>> {
  const { user, supabase, membership, error } = await requireOrg();
  if (!membership) {
    return { success: false, error: error ?? "Organization required." };
  }

  const result = await saveProducerAsContentObject(supabase, {
    outputId,
    userId: user.id,
    storyId,
    organizationId: membership.organization.id,
  });
  if (result.error || !result.data) {
    return { success: false, error: result.error ?? "Save failed." };
  }
  revalidateStory(storyId);
  return { success: true, data: result.data };
}
