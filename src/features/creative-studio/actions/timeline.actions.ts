"use server";

import { z } from "zod";

import { requireAuth } from "@/features/auth/guards/require-auth";
import { createClient } from "@/shared/lib/supabase/server";
import { getCurrentProfile } from "@/features/profile/services/profile.service";
import { resolveActiveMembership } from "@/features/organization/services/resolve-active-membership";
import { createTimelineService } from "@/features/creative-studio/services/timeline.service.impl";
import { CREATIVE_CLIP_KINDS } from "@/features/creative-studio/constants/creative-studio.constants";
import type { StudioActionResult } from "@/features/creative-studio/actions/project.actions";
import type {
  CreativeTimeline,
  CreativeTimelineClip,
} from "@/features/creative-studio/types/creative-studio.types";

const updateTimelineSchema = z.object({
  timelineId: z.string().uuid(),
  playheadMs: z.number().int().min(0).optional(),
  zoomLevel: z.number().positive().optional(),
  snapEnabled: z.boolean().optional(),
});

const createClipSchema = z.object({
  trackId: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  clipKind: z.enum(CREATIVE_CLIP_KINDS),
  startMs: z.number().int().min(0),
  durationMs: z.number().int().positive().default(5000),
  mediaAssetId: z.string().uuid().optional().nullable(),
});

const trimClipSchema = z.object({
  clipId: z.string().uuid(),
  startMs: z.number().int().min(0),
  endMs: z.number().int().min(0),
});

const moveClipSchema = z.object({
  clipId: z.string().uuid(),
  trackId: z.string().uuid(),
  startMs: z.number().int().min(0),
});

async function requireStudioContext() {
  const user = await requireAuth("/creative-studio");
  const supabase = await createClient();
  const { profile } = await getCurrentProfile(supabase, user.id);
  const { membership, error } = await resolveActiveMembership(
    supabase,
    user.id,
    profile?.email ?? user.email ?? "",
    profile?.full_name,
  );
  return { supabase, membership, error };
}

export async function updateTimelineSettingsAction(
  raw: z.infer<typeof updateTimelineSchema>,
): Promise<StudioActionResult<CreativeTimeline>> {
  const parsed = updateTimelineSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { supabase, membership, error } = await requireStudioContext();
  if (!membership) {
    return { success: false, error: error ?? "Organization required" };
  }

  const service = createTimelineService(supabase);
  const result = await service.updateTimeline(parsed.data.timelineId, {
    playhead_ms: parsed.data.playheadMs,
    zoom_level: parsed.data.zoomLevel,
    snap_enabled: parsed.data.snapEnabled,
  });

  if (!result.data) return { success: false, error: result.error };
  return { success: true, data: result.data };
}

export async function createTimelineClipAction(
  raw: z.infer<typeof createClipSchema>,
): Promise<StudioActionResult<CreativeTimelineClip>> {
  const parsed = createClipSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { supabase, membership, error } = await requireStudioContext();
  if (!membership) {
    return { success: false, error: error ?? "Organization required" };
  }

  const service = createTimelineService(supabase);
  const endMs = parsed.data.startMs + parsed.data.durationMs;
  const result = await service.addClip(parsed.data.trackId, membership.organization.id, {
    name: parsed.data.name,
    clip_kind: parsed.data.clipKind,
    start_ms: parsed.data.startMs,
    end_ms: endMs,
    trim_start_ms: 0,
    trim_end_ms: parsed.data.durationMs,
    position_x: 0,
    position_y: 0,
    scale: 1,
    rotation: 0,
    opacity: 1,
    volume: 1,
    speed: 1,
    sort_order: 0,
    metadata: {},
    media_asset_id: parsed.data.mediaAssetId ?? null,
    template_id: null,
  });

  if (!result.data) return { success: false, error: result.error };
  return { success: true, data: result.data };
}

export async function trimTimelineClipAction(
  raw: z.infer<typeof trimClipSchema>,
): Promise<StudioActionResult<CreativeTimelineClip>> {
  const parsed = trimClipSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { supabase, membership, error } = await requireStudioContext();
  if (!membership) {
    return { success: false, error: error ?? "Organization required" };
  }

  const service = createTimelineService(supabase);
  const result = await service.updateClip(parsed.data.clipId, {
    start_ms: parsed.data.startMs,
    end_ms: parsed.data.endMs,
  });

  if (!result.data) return { success: false, error: result.error };
  return { success: true, data: result.data };
}

export async function moveTimelineClipAction(
  raw: z.infer<typeof moveClipSchema>,
): Promise<StudioActionResult<CreativeTimelineClip>> {
  const parsed = moveClipSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { supabase, membership, error } = await requireStudioContext();
  if (!membership) {
    return { success: false, error: error ?? "Organization required" };
  }

  const service = createTimelineService(supabase);
  const result = await service.moveClip(
    parsed.data.clipId,
    parsed.data.trackId,
    parsed.data.startMs,
  );

  if (!result.data) return { success: false, error: result.error };
  return { success: true, data: result.data };
}

export async function listStoryCreativeProjectsAction(
  storyId: string,
): Promise<
  StudioActionResult<
    import("@/features/creative-studio/types/creative-studio.types").CreativeProject[]
  >
> {
  const { supabase, membership, error } = await requireStudioContext();
  if (!membership) {
    return { success: false, error: error ?? "Organization required" };
  }

  const { createProjectService } = await import(
    "@/features/creative-studio/services/project.service.impl"
  );
  const service = createProjectService(supabase);
  const result = await service.list(membership.organization.id, { storyId });
  if (!result.data) return { success: false, error: result.error };
  return { success: true, data: result.data };
}
