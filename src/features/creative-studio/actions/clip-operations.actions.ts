"use server";

import { z } from "zod";

import { requireAuth } from "@/features/auth/guards/require-auth";
import { createClient } from "@/shared/lib/supabase/server";
import { getCurrentProfile } from "@/features/profile/services/profile.service";
import { resolveActiveMembership } from "@/features/organization/services/resolve-active-membership";
import { createClipService } from "@/features/creative-studio/services/clip.service.impl";
import { createTrackService } from "@/features/creative-studio/services/track.service.impl";
import { createEnterpriseTimelineService } from "@/features/creative-studio/services/enterprise-timeline.service.impl";
import type { StudioActionResult } from "@/features/creative-studio/actions/project.actions";
import type {
  CreativeTimelineClip,
  CreativeTimelineTrack,
} from "@/features/creative-studio/types/creative-studio.types";
import type {
  EnterpriseTimeline,
  EnterpriseTimelineClip,
  RippleMode,
  TimelineMarker,
} from "@/features/creative-studio/types/timeline-engine.types";

const clipIdSchema = z.object({ clipId: z.string().uuid() });

const splitSchema = z.object({
  clipId: z.string().uuid(),
  atMs: z.number().int().min(0),
});

const clipFlagsSchema = z.object({
  clipId: z.string().uuid(),
  locked: z.boolean().optional(),
  muted: z.boolean().optional(),
  hidden: z.boolean().optional(),
  colorLabel: z.string().optional(),
  name: z.string().trim().min(1).max(200).optional(),
});

const trackPatchSchema = z.object({
  trackId: z.string().uuid(),
  name: z.string().trim().min(1).max(200).optional(),
  muted: z.boolean().optional(),
  locked: z.boolean().optional(),
  collapsed: z.boolean().optional(),
  visible: z.boolean().optional(),
  solo: z.boolean().optional(),
  height: z.number().int().positive().optional(),
  colorLabel: z.string().optional(),
});

const markerSchema = z.object({
  timelineId: z.string().uuid(),
  startMs: z.number().int().min(0),
  label: z.string().trim().min(1).max(200).default("Marker"),
});

const enterpriseSettingsSchema = z.object({
  timelineId: z.string().uuid(),
  magneticEnabled: z.boolean().optional(),
  rippleMode: z.enum(["off", "standard", "trim", "roll"]).optional(),
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
  return { supabase, membership, user, error };
}

export async function splitTimelineClipAction(
  raw: z.infer<typeof splitSchema>,
): Promise<StudioActionResult<EnterpriseTimelineClip[]>> {
  const parsed = splitSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, membership, error } = await requireStudioContext();
  if (!membership) return { success: false, error: error ?? "Organization required" };

  const service = createClipService(supabase);
  const result = await service.split(parsed.data.clipId, parsed.data.atMs);
  if (!result.data) return { success: false, error: result.error };
  return { success: true, data: result.data };
}

export async function duplicateTimelineClipAction(
  raw: z.infer<typeof clipIdSchema>,
): Promise<StudioActionResult<EnterpriseTimelineClip>> {
  const parsed = clipIdSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, membership, error } = await requireStudioContext();
  if (!membership) return { success: false, error: error ?? "Organization required" };

  const service = createClipService(supabase);
  const result = await service.duplicate(parsed.data.clipId);
  if (!result.data) return { success: false, error: result.error };
  return { success: true, data: result.data };
}

export async function deleteTimelineClipAction(
  raw: z.infer<typeof clipIdSchema>,
): Promise<StudioActionResult<EnterpriseTimelineClip>> {
  const parsed = clipIdSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, membership, error } = await requireStudioContext();
  if (!membership) return { success: false, error: error ?? "Organization required" };

  const service = createClipService(supabase);
  const result = await service.softDelete(parsed.data.clipId);
  if (!result.data) return { success: false, error: result.error };
  return { success: true, data: result.data };
}

export async function updateClipFlagsAction(
  raw: z.infer<typeof clipFlagsSchema>,
): Promise<StudioActionResult<CreativeTimelineClip>> {
  const parsed = clipFlagsSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, membership, error } = await requireStudioContext();
  if (!membership) return { success: false, error: error ?? "Organization required" };

  const service = createClipService(supabase);
  const patch: Record<string, unknown> = {};
  if (parsed.data.locked !== undefined) patch.locked = parsed.data.locked;
  if (parsed.data.muted !== undefined) patch.muted = parsed.data.muted;
  if (parsed.data.hidden !== undefined) patch.hidden = parsed.data.hidden;
  if (parsed.data.colorLabel !== undefined) patch.color_label = parsed.data.colorLabel;
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;

  const result = await service.update(parsed.data.clipId, patch);
  if (!result.data) return { success: false, error: result.error };
  return { success: true, data: result.data };
}

export async function updateTimelineTrackAction(
  raw: z.infer<typeof trackPatchSchema>,
): Promise<StudioActionResult<CreativeTimelineTrack>> {
  const parsed = trackPatchSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, membership, error } = await requireStudioContext();
  if (!membership) return { success: false, error: error ?? "Organization required" };

  const service = createTrackService(supabase);
  const patch: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.muted !== undefined) patch.muted = parsed.data.muted;
  if (parsed.data.locked !== undefined) patch.locked = parsed.data.locked;
  if (parsed.data.collapsed !== undefined) patch.collapsed = parsed.data.collapsed;
  if (parsed.data.visible !== undefined) patch.visible = parsed.data.visible;
  if (parsed.data.solo !== undefined) patch.solo = parsed.data.solo;
  if (parsed.data.height !== undefined) patch.height = parsed.data.height;
  if (parsed.data.colorLabel !== undefined) patch.color_label = parsed.data.colorLabel;

  const result = await service.update(parsed.data.trackId, patch);
  if (!result.data) return { success: false, error: result.error };
  return { success: true, data: result.data };
}

export async function addTimelineMarkerAction(
  raw: z.infer<typeof markerSchema>,
): Promise<StudioActionResult<TimelineMarker>> {
  const parsed = markerSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, membership, user, error } = await requireStudioContext();
  if (!membership) return { success: false, error: error ?? "Organization required" };

  const service = createEnterpriseTimelineService(supabase);
  const result = await service.addTimelineMarker(
    parsed.data.timelineId,
    membership.organization.id,
    user.id,
    parsed.data.startMs,
    parsed.data.label,
  );
  if (!result.data) return { success: false, error: result.error };
  return { success: true, data: result.data };
}

export async function updateEnterpriseTimelineAction(
  raw: z.infer<typeof enterpriseSettingsSchema>,
): Promise<StudioActionResult<EnterpriseTimeline>> {
  const parsed = enterpriseSettingsSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, membership, error } = await requireStudioContext();
  if (!membership) return { success: false, error: error ?? "Organization required" };

  const service = createEnterpriseTimelineService(supabase);
  const patch: Partial<Pick<EnterpriseTimeline, "magnetic_enabled" | "ripple_mode">> = {};
  if (parsed.data.magneticEnabled !== undefined) {
    patch.magnetic_enabled = parsed.data.magneticEnabled;
  }
  if (parsed.data.rippleMode !== undefined) {
    patch.ripple_mode = parsed.data.rippleMode as RippleMode;
  }

  const result = await service.updateEnterpriseSettings(parsed.data.timelineId, patch);
  if (!result.data) return { success: false, error: result.error };
  return { success: true, data: result.data };
}
