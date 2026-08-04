"use server";

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/features/auth/guards/require-auth";
import { resolveActiveMembership } from "@/features/organization/services/resolve-active-membership";
import { getCurrentProfile } from "@/features/profile/services/profile.service";
import {
  createVideoRenderSchema,
  renderIdSchema,
  updateRenderProgressSchema,
} from "@/features/video-render-export/schemas/render.schemas";
import {
  buildRenderStoragePath,
  cancelVideoRender,
  createVideoRenderJob,
  getVideoRender,
  listVideoRenders,
  updateVideoRenderProgress,
} from "@/features/video-render-export/services/render-job.service";
import type { VideoRenderRow } from "@/features/video-render-export/types/render.types";
import { getStoryVoiceSignedUrlAction } from "@/features/story-voice/actions/voice.actions";
import { createClient } from "@/shared/lib/supabase/server";
import { videoRenderDb } from "@/features/video-render-export/lib/video-render-db";

export type RenderActionResult<T> =
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

export async function listVideoRendersAction(
  storyId: string,
): Promise<RenderActionResult<VideoRenderRow[]>> {
  const ctx = await requireStoryContext(storyId);
  if (!ctx.membership) return { success: false, error: ctx.error ?? "Unauthorized" };

  const result = await listVideoRenders(
    ctx.supabase,
    ctx.membership.organization.id,
    storyId,
  );
  if (result.error || !result.data) {
    return { success: false, error: result.error ?? "Failed to list renders" };
  }
  return { success: true, data: result.data };
}

export async function createVideoRenderAction(
  input: unknown,
): Promise<RenderActionResult<VideoRenderRow>> {
  const parsed = createVideoRenderSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const ctx = await requireStoryContext(parsed.data.storyId);
  if (!ctx.membership) return { success: false, error: ctx.error ?? "Unauthorized" };

  const voice = await getStoryVoiceSignedUrlAction(parsed.data.storyId);
  const voiceUrl = voice.success ? voice.data.url : null;

  const result = await createVideoRenderJob(ctx.supabase, {
    storyId: parsed.data.storyId,
    settings: parsed.data.settings,
    organizationId: ctx.membership.organization.id,
    userId: ctx.user.id,
    voiceUrl,
  });

  if (result.error || !result.data) {
    return { success: false, error: result.error ?? "Failed to create render" };
  }

  revalidatePath(`/newsroom/stories/${parsed.data.storyId}`);
  return { success: true, data: result.data };
}

export async function updateVideoRenderProgressAction(
  input: unknown,
): Promise<RenderActionResult<VideoRenderRow>> {
  const parsed = updateRenderProgressSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
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
    return { success: false, error: error ?? "Organization required" };
  }

  const result = await updateVideoRenderProgress(
    supabase,
    membership.organization.id,
    user.id,
    parsed.data,
  );
  if (result.error || !result.data) {
    return { success: false, error: result.error ?? "Failed to update render" };
  }
  return { success: true, data: result.data };
}

export async function cancelVideoRenderAction(
  input: unknown,
): Promise<RenderActionResult<VideoRenderRow>> {
  const parsed = renderIdSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid render id" };
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
    return { success: false, error: error ?? "Organization required" };
  }

  const result = await cancelVideoRender(
    supabase,
    membership.organization.id,
    user.id,
    parsed.data.renderId,
  );
  if (result.error || !result.data) {
    return { success: false, error: result.error ?? "Failed to cancel" };
  }
  return { success: true, data: result.data };
}

export async function getVideoRenderAction(
  renderId: string,
): Promise<RenderActionResult<VideoRenderRow>> {
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
    return { success: false, error: error ?? "Organization required" };
  }

  const result = await getVideoRender(
    supabase,
    membership.organization.id,
    renderId,
  );
  if (result.error || !result.data) {
    return { success: false, error: result.error ?? "Not found" };
  }
  return { success: true, data: result.data };
}

/**
 * Upload finished render bytes to Supabase Storage and mark job succeeded.
 * Accepts base64 to stay within server action payload limits for moderate files.
 */
export async function uploadVideoRenderOutputAction(input: {
  renderId: string;
  storyId: string;
  format: string;
  mimeType: string;
  base64: string;
  durationMs: number;
  thumbnailBase64?: string | null;
}): Promise<RenderActionResult<VideoRenderRow>> {
  const ctx = await requireStoryContext(input.storyId);
  if (!ctx.membership) return { success: false, error: ctx.error ?? "Unauthorized" };

  const existing = await getVideoRender(
    ctx.supabase,
    ctx.membership.organization.id,
    input.renderId,
  );
  if (existing.error || !existing.data) {
    return { success: false, error: existing.error ?? "Render not found" };
  }
  if (existing.data.status === "cancelled") {
    return { success: false, error: "Render was cancelled" };
  }

  const { bucket, path } = buildRenderStoragePath({
    organizationId: ctx.membership.organization.id,
    storyId: input.storyId,
    renderId: input.renderId,
    format: input.format,
  });

  const binary = Buffer.from(input.base64, "base64");
  const db = videoRenderDb(ctx.supabase);
  const { error: uploadError } = await db.storage.from(bucket).upload(path, binary, {
    contentType: input.mimeType,
    upsert: true,
  });
  if (uploadError) {
    await updateVideoRenderProgress(
      ctx.supabase,
      ctx.membership.organization.id,
      ctx.user.id,
      {
        renderId: input.renderId,
        status: "failed",
        error: uploadError.message,
        finished: true,
      },
    );
    return { success: false, error: uploadError.message };
  }

  let thumbnailPath: string | undefined;
  let thumbnailUrl: string | undefined;
  if (input.thumbnailBase64) {
    thumbnailPath = path.replace(/\.[^.]+$/, ".jpg");
    const thumbBinary = Buffer.from(input.thumbnailBase64, "base64");
    await db.storage.from(bucket).upload(thumbnailPath, thumbBinary, {
      contentType: "image/jpeg",
      upsert: true,
    });
    const { data: thumbSigned } = await db.storage
      .from(bucket)
      .createSignedUrl(thumbnailPath, 60 * 60 * 24 * 7);
    thumbnailUrl = thumbSigned?.signedUrl;
  }

  const { data: signed } = await db.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60 * 24 * 7);

  const result = await updateVideoRenderProgress(
    ctx.supabase,
    ctx.membership.organization.id,
    ctx.user.id,
    {
      renderId: input.renderId,
      status: "succeeded",
      progress: 100,
      outputBucket: bucket,
      outputPath: path,
      outputUrl: signed?.signedUrl,
      thumbnailPath,
      thumbnailUrl,
      durationMs: input.durationMs,
      fileSizeBytes: binary.byteLength,
      finished: true,
    },
  );

  if (result.error || !result.data) {
    return { success: false, error: result.error ?? "Upload succeeded but status update failed" };
  }

  revalidatePath(`/newsroom/stories/${input.storyId}`);
  return { success: true, data: result.data };
}
