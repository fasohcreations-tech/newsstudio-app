"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAuth } from "@/features/auth/guards/require-auth";
import { resolveActiveMembership } from "@/features/organization/services/resolve-active-membership";
import { getCurrentProfile } from "@/features/profile/services/profile.service";
import {
  assembleTimelineSchema,
  setTransitionSchema,
  splitClipSchema,
  syncDecisionSchema,
  updateClipSchema,
} from "@/features/story-timeline-assembly/schemas/timeline.schemas";
import {
  assembleStoryTimeline,
  getTimelineBundle,
  listSceneSyncPrompts,
} from "@/features/story-timeline-assembly/services/timeline-assembly.service";
import {
  decideSceneSync,
  duplicateTimelineClip,
  setClipTransition,
  softDeleteTimelineClip,
  splitTimelineClip,
  updateTimelineClip,
} from "@/features/story-timeline-assembly/services/timeline-edit.service";
import type {
  AssembleTimelineResult,
  SceneSyncPrompt,
  StoryTimelineBundle,
  StoryTimelineClipRow,
  StoryTimelineTransitionRow,
} from "@/features/story-timeline-assembly/types/timeline.types";
import { createClient } from "@/shared/lib/supabase/server";

export type TimelineActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

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
    .eq("organization_id", membership.organization.id)
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

  return { user, supabase, membership, error: null as string | null };
}

export async function getStoryTimelineAction(
  storyId: string,
): Promise<TimelineActionResult<StoryTimelineBundle | null>> {
  const id = z.string().uuid().safeParse(storyId);
  if (!id.success) return { success: false, error: "Invalid story id" };

  const ctx = await requireStoryContext(id.data);
  if (!ctx.membership || ctx.error) {
    return { success: false, error: ctx.error ?? "Unauthorized" };
  }

  const result = await getTimelineBundle(
    ctx.supabase,
    ctx.membership.organization.id,
    id.data,
  );
  if (result.error) return { success: false, error: result.error };
  return { success: true, data: result.data };
}

export async function assembleStoryTimelineAction(
  raw: unknown,
): Promise<TimelineActionResult<AssembleTimelineResult>> {
  const parsed = assembleTimelineSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const ctx = await requireStoryContext(parsed.data.storyId);
  if (!ctx.membership || ctx.error) {
    return { success: false, error: ctx.error ?? "Unauthorized" };
  }

  const result = await assembleStoryTimeline(ctx.supabase, {
    organizationId: ctx.membership.organization.id,
    userId: ctx.user.id,
    storyId: parsed.data.storyId,
    replaceAssemblyClips: parsed.data.replaceAssemblyClips,
  });

  if (result.error || !result.data) {
    return { success: false, error: result.error ?? "Assembly failed" };
  }

  revalidatePath(`/newsroom/stories/${parsed.data.storyId}`);
  return { success: true, data: result.data };
}

export async function updateTimelineClipAction(
  raw: unknown,
): Promise<TimelineActionResult<StoryTimelineClipRow>> {
  const parsed = updateClipSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const user = await requireAuth("/newsroom");
  const supabase = await createClient();
  const { profile } = await getCurrentProfile(supabase, user.id);
  const { membership, error } = await resolveActiveMembership(
    supabase,
    user.id,
    profile?.email ?? user.email ?? "",
    profile?.full_name,
  );
  if (!membership) {
    return { success: false, error: error ?? "Unauthorized" };
  }

  const result = await updateTimelineClip(supabase, {
    organizationId: membership.organization.id,
    userId: user.id,
    ...parsed.data,
  });
  if (result.error || !result.data) {
    return { success: false, error: result.error ?? "Update failed" };
  }
  return { success: true, data: result.data };
}

export async function deleteTimelineClipAction(
  clipId: string,
): Promise<TimelineActionResult<{ id: string }>> {
  const id = z.string().uuid().safeParse(clipId);
  if (!id.success) return { success: false, error: "Invalid clip id" };

  const user = await requireAuth("/newsroom");
  const supabase = await createClient();
  const { profile } = await getCurrentProfile(supabase, user.id);
  const { membership, error } = await resolveActiveMembership(
    supabase,
    user.id,
    profile?.email ?? user.email ?? "",
    profile?.full_name,
  );
  if (!membership) return { success: false, error: error ?? "Unauthorized" };

  const result = await softDeleteTimelineClip(supabase, {
    organizationId: membership.organization.id,
    userId: user.id,
    clipId: id.data,
  });
  if (result.error || !result.data) {
    return { success: false, error: result.error ?? "Delete failed" };
  }
  return { success: true, data: result.data };
}

export async function duplicateTimelineClipAction(
  clipId: string,
): Promise<TimelineActionResult<StoryTimelineClipRow>> {
  const id = z.string().uuid().safeParse(clipId);
  if (!id.success) return { success: false, error: "Invalid clip id" };

  const user = await requireAuth("/newsroom");
  const supabase = await createClient();
  const { profile } = await getCurrentProfile(supabase, user.id);
  const { membership, error } = await resolveActiveMembership(
    supabase,
    user.id,
    profile?.email ?? user.email ?? "",
    profile?.full_name,
  );
  if (!membership) return { success: false, error: error ?? "Unauthorized" };

  const result = await duplicateTimelineClip(supabase, {
    organizationId: membership.organization.id,
    userId: user.id,
    clipId: id.data,
  });
  if (result.error || !result.data) {
    return { success: false, error: result.error ?? "Duplicate failed" };
  }
  return { success: true, data: result.data };
}

export async function splitTimelineClipAction(
  raw: unknown,
): Promise<
  TimelineActionResult<{ left: StoryTimelineClipRow; right: StoryTimelineClipRow }>
> {
  const parsed = splitClipSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const user = await requireAuth("/newsroom");
  const supabase = await createClient();
  const { profile } = await getCurrentProfile(supabase, user.id);
  const { membership, error } = await resolveActiveMembership(
    supabase,
    user.id,
    profile?.email ?? user.email ?? "",
    profile?.full_name,
  );
  if (!membership) return { success: false, error: error ?? "Unauthorized" };

  const result = await splitTimelineClip(supabase, {
    organizationId: membership.organization.id,
    userId: user.id,
    clipId: parsed.data.clipId,
    atMs: parsed.data.atMs,
  });
  if (result.error || !result.data) {
    return { success: false, error: result.error ?? "Split failed" };
  }
  return { success: true, data: result.data };
}

export async function setTimelineTransitionAction(
  raw: unknown,
): Promise<TimelineActionResult<StoryTimelineTransitionRow>> {
  const parsed = setTransitionSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const user = await requireAuth("/newsroom");
  const supabase = await createClient();
  const { profile } = await getCurrentProfile(supabase, user.id);
  const { membership, error } = await resolveActiveMembership(
    supabase,
    user.id,
    profile?.email ?? user.email ?? "",
    profile?.full_name,
  );
  if (!membership) return { success: false, error: error ?? "Unauthorized" };

  const result = await setClipTransition(supabase, {
    organizationId: membership.organization.id,
    userId: user.id,
    ...parsed.data,
  });
  if (result.error || !result.data) {
    return { success: false, error: result.error ?? "Transition failed" };
  }
  return { success: true, data: result.data };
}

export async function listSceneSyncPromptsAction(
  storyId: string,
): Promise<TimelineActionResult<SceneSyncPrompt[]>> {
  const id = z.string().uuid().safeParse(storyId);
  if (!id.success) return { success: false, error: "Invalid story id" };

  const ctx = await requireStoryContext(id.data);
  if (!ctx.membership || ctx.error) {
    return { success: false, error: ctx.error ?? "Unauthorized" };
  }

  const result = await listSceneSyncPrompts(
    ctx.supabase,
    ctx.membership.organization.id,
    id.data,
  );
  if (result.error || !result.data) {
    return { success: false, error: result.error ?? "Failed" };
  }
  return { success: true, data: result.data };
}

export async function decideSceneSyncAction(
  raw: unknown,
): Promise<TimelineActionResult<StoryTimelineClipRow>> {
  const parsed = syncDecisionSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const user = await requireAuth("/newsroom");
  const supabase = await createClient();
  const { profile } = await getCurrentProfile(supabase, user.id);
  const { membership, error } = await resolveActiveMembership(
    supabase,
    user.id,
    profile?.email ?? user.email ?? "",
    profile?.full_name,
  );
  if (!membership) return { success: false, error: error ?? "Unauthorized" };

  const result = await decideSceneSync(supabase, {
    organizationId: membership.organization.id,
    userId: user.id,
    clipId: parsed.data.clipId,
    decision: parsed.data.decision,
  });
  if (result.error || !result.data) {
    return { success: false, error: result.error ?? "Sync decision failed" };
  }
  return { success: true, data: result.data };
}
