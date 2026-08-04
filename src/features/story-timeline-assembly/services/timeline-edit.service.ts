import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getTimelineBundle } from "@/features/story-timeline-assembly/services/timeline-assembly.service";
import type {
  StoryTimelineClipRow,
  StoryTimelineTransitionRow,
  StoryTimelineTransitionType,
} from "@/features/story-timeline-assembly/types/timeline.types";
import type { Database, Json } from "@/shared/types/database.types";

type Client = SupabaseClient<Database>;
type Result<T> = { data: T | null; error: string | null };

function ok<T>(data: T): Result<T> {
  return { data, error: null };
}
function fail<T>(error: string): Result<T> {
  return { data: null, error };
}

function asClip(row: Record<string, unknown>): StoryTimelineClipRow {
  return {
    ...(row as unknown as StoryTimelineClipRow),
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  };
}

async function loadClip(
  client: Client,
  organizationId: string,
  clipId: string,
): Promise<Result<StoryTimelineClipRow>> {
  const { data, error } = await client
    .from("story_timeline_clips")
    .select("*")
    .eq("id", clipId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) return fail(error.message);
  if (!data) return fail("Clip not found");
  return ok(asClip(data as Record<string, unknown>));
}

async function recomputeTimelineDuration(
  client: Client,
  timelineId: string,
  userId: string,
) {
  const { data: clips } = await client
    .from("story_timeline_clips")
    .select("end_ms")
    .eq("timeline_id", timelineId)
    .is("deleted_at", null)
    .eq("enabled", true);

  const duration = Math.max(
    0,
    ...(clips ?? []).map((c) => Number(c.end_ms) || 0),
  );
  await client
    .from("story_timelines")
    .update({
      duration_ms: duration,
      status: "editing",
      updated_by: userId,
    })
    .eq("id", timelineId);
}

/** Non-destructive clip property update — never touches Scene Instances. */
export async function updateTimelineClip(
  client: Client,
  input: {
    organizationId: string;
    userId: string;
    clipId: string;
    startMs?: number;
    endMs?: number;
    trimInMs?: number;
    trimOutMs?: number | null;
    enabled?: boolean;
    locked?: boolean;
    visible?: boolean;
    name?: string;
    trackId?: string;
  },
): Promise<Result<StoryTimelineClipRow>> {
  const existing = await loadClip(client, input.organizationId, input.clipId);
  if (existing.error || !existing.data) {
    return fail(existing.error ?? "Clip not found");
  }
  if (existing.data.locked && input.locked !== false) {
    if (
      input.startMs != null ||
      input.endMs != null ||
      input.trackId != null
    ) {
      return fail("Clip is locked");
    }
  }

  const startMs = input.startMs ?? existing.data.start_ms;
  const endMs = input.endMs ?? existing.data.end_ms;
  if (endMs <= startMs) return fail("End must be after start");

  const patch: Database["public"]["Tables"]["story_timeline_clips"]["Update"] =
    {
      start_ms: startMs,
      end_ms: endMs,
      duration_ms: endMs - startMs,
      updated_by: input.userId,
    };
  if (input.trimInMs != null) patch.trim_in_ms = input.trimInMs;
  if (input.trimOutMs !== undefined) patch.trim_out_ms = input.trimOutMs;
  if (input.enabled != null) patch.enabled = input.enabled;
  if (input.locked != null) patch.locked = input.locked;
  if (input.visible != null) patch.visible = input.visible;
  if (input.name != null) patch.name = input.name;
  if (input.trackId != null) patch.track_id = input.trackId;

  const { data, error } = await client
    .from("story_timeline_clips")
    .update(patch)
    .eq("id", input.clipId)
    .eq("organization_id", input.organizationId)
    .is("deleted_at", null)
    .select("*")
    .single();

  if (error || !data) return fail(error?.message ?? "Update failed");
  await recomputeTimelineDuration(
    client,
    existing.data.timeline_id,
    input.userId,
  );
  return ok(asClip(data as Record<string, unknown>));
}

export async function softDeleteTimelineClip(
  client: Client,
  input: { organizationId: string; userId: string; clipId: string },
): Promise<Result<{ id: string }>> {
  const existing = await loadClip(client, input.organizationId, input.clipId);
  if (existing.error || !existing.data) {
    return fail(existing.error ?? "Clip not found");
  }
  if (existing.data.locked) return fail("Clip is locked");

  const { error } = await client
    .from("story_timeline_clips")
    .update({
      deleted_at: new Date().toISOString(),
      updated_by: input.userId,
    })
    .eq("id", input.clipId);

  if (error) return fail(error.message);
  await recomputeTimelineDuration(
    client,
    existing.data.timeline_id,
    input.userId,
  );
  return ok({ id: input.clipId });
}

export async function duplicateTimelineClip(
  client: Client,
  input: { organizationId: string; userId: string; clipId: string },
): Promise<Result<StoryTimelineClipRow>> {
  const existing = await loadClip(client, input.organizationId, input.clipId);
  if (existing.error || !existing.data) {
    return fail(existing.error ?? "Clip not found");
  }
  const c = existing.data;
  const duration = c.duration_ms;
  const startMs = c.end_ms;
  const endMs = startMs + duration;

  const { data, error } = await client
    .from("story_timeline_clips")
    .insert({
      organization_id: input.organizationId,
      timeline_id: c.timeline_id,
      track_id: c.track_id,
      scene_instance_id: c.scene_instance_id,
      voice_segment_id: c.voice_segment_id,
      name: `${c.name} (copy)`,
      start_ms: startMs,
      end_ms: endMs,
      duration_ms: duration,
      trim_in_ms: c.trim_in_ms,
      trim_out_ms: c.trim_out_ms,
      enabled: c.enabled,
      locked: false,
      visible: c.visible,
      sort_order: c.sort_order + 1,
      scene_synced_at: c.scene_synced_at,
      scene_revision: c.scene_revision,
      metadata: {
        ...c.metadata,
        duplicated_from: c.id,
      } as Json,
      created_by: input.userId,
      updated_by: input.userId,
    })
    .select("*")
    .single();

  if (error || !data) return fail(error?.message ?? "Duplicate failed");
  await recomputeTimelineDuration(client, c.timeline_id, input.userId);
  return ok(asClip(data as Record<string, unknown>));
}

/** Split clip at absolute timeline position (non-destructive to Scene). */
export async function splitTimelineClip(
  client: Client,
  input: {
    organizationId: string;
    userId: string;
    clipId: string;
    atMs: number;
  },
): Promise<Result<{ left: StoryTimelineClipRow; right: StoryTimelineClipRow }>> {
  const existing = await loadClip(client, input.organizationId, input.clipId);
  if (existing.error || !existing.data) {
    return fail(existing.error ?? "Clip not found");
  }
  const c = existing.data;
  if (c.locked) return fail("Clip is locked");
  if (input.atMs <= c.start_ms + 200 || input.atMs >= c.end_ms - 200) {
    return fail("Split point must be inside the clip");
  }

  const leftEnd = input.atMs;
  const rightStart = input.atMs;
  const offsetIntoClip = input.atMs - c.start_ms;

  const left = await updateTimelineClip(client, {
    organizationId: input.organizationId,
    userId: input.userId,
    clipId: c.id,
    endMs: leftEnd,
    trimOutMs:
      c.trim_out_ms != null
        ? c.trim_in_ms + offsetIntoClip
        : offsetIntoClip,
  });
  if (left.error || !left.data) return fail(left.error ?? "Split left failed");

  const { data: rightRow, error } = await client
    .from("story_timeline_clips")
    .insert({
      organization_id: input.organizationId,
      timeline_id: c.timeline_id,
      track_id: c.track_id,
      scene_instance_id: c.scene_instance_id,
      voice_segment_id: c.voice_segment_id,
      name: c.name,
      start_ms: rightStart,
      end_ms: c.end_ms,
      duration_ms: c.end_ms - rightStart,
      trim_in_ms: c.trim_in_ms + offsetIntoClip,
      trim_out_ms: c.trim_out_ms,
      enabled: c.enabled,
      locked: false,
      visible: c.visible,
      sort_order: c.sort_order + 1,
      scene_synced_at: c.scene_synced_at,
      scene_revision: c.scene_revision,
      metadata: {
        ...c.metadata,
        split_from: c.id,
      } as Json,
      created_by: input.userId,
      updated_by: input.userId,
    })
    .select("*")
    .single();

  if (error || !rightRow) return fail(error?.message ?? "Split right failed");
  await recomputeTimelineDuration(client, c.timeline_id, input.userId);
  return ok({
    left: left.data,
    right: asClip(rightRow as Record<string, unknown>),
  });
}

export async function setClipTransition(
  client: Client,
  input: {
    organizationId: string;
    userId: string;
    timelineId: string;
    fromClipId: string;
    toClipId: string;
    transitionType: StoryTimelineTransitionType;
    durationMs?: number;
    parameters?: Record<string, unknown>;
  },
): Promise<Result<StoryTimelineTransitionRow>> {
  const { data: existing } = await client
    .from("story_timeline_transitions")
    .select("id")
    .eq("timeline_id", input.timelineId)
    .eq("from_clip_id", input.fromClipId)
    .eq("to_clip_id", input.toClipId)
    .maybeSingle();

  if (existing?.id) {
    const { data, error } = await client
      .from("story_timeline_transitions")
      .update({
        transition_type: input.transitionType,
        duration_ms: input.durationMs ?? 0,
        parameters: (input.parameters ?? {}) as Json,
      })
      .eq("id", existing.id as string)
      .select("*")
      .single();
    if (error || !data) return fail(error?.message ?? "Transition update failed");
    await client
      .from("story_timelines")
      .update({ status: "editing", updated_by: input.userId })
      .eq("id", input.timelineId);
    return ok({
      ...(data as unknown as StoryTimelineTransitionRow),
      parameters: (data as { parameters: Record<string, unknown> }).parameters ?? {},
    });
  }

  const { data, error } = await client
    .from("story_timeline_transitions")
    .insert({
      organization_id: input.organizationId,
      timeline_id: input.timelineId,
      from_clip_id: input.fromClipId,
      to_clip_id: input.toClipId,
      transition_type: input.transitionType,
      duration_ms: input.durationMs ?? 0,
      parameters: (input.parameters ?? {}) as Json,
    })
    .select("*")
    .single();

  if (error || !data) return fail(error?.message ?? "Transition create failed");
  return ok({
    ...(data as unknown as StoryTimelineTransitionRow),
    parameters: (data as { parameters: Record<string, unknown> }).parameters ?? {},
  });
}

/**
 * Apply or ignore a Scene Instance sync prompt.
 * Apply refreshes name/duration from scene — still does not rewrite Scene docs.
 */
export async function decideSceneSync(
  client: Client,
  input: {
    organizationId: string;
    userId: string;
    clipId: string;
    decision: "apply" | "ignore";
  },
): Promise<Result<StoryTimelineClipRow>> {
  const existing = await loadClip(client, input.organizationId, input.clipId);
  if (existing.error || !existing.data) {
    return fail(existing.error ?? "Clip not found");
  }
  const c = existing.data;
  if (!c.scene_instance_id) return fail("Clip has no Scene Instance reference");

  const { data: scene, error: sceneError } = await client
    .from("story_scene_instances")
    .select("id, name, duration_ms, updated_at")
    .eq("id", c.scene_instance_id)
    .eq("organization_id", input.organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (sceneError || !scene) {
    return fail(sceneError?.message ?? "Scene Instance not found");
  }

  const now = new Date().toISOString();
  const rev = `${scene.updated_at}:${scene.duration_ms}`;

  if (input.decision === "ignore") {
    const { data, error } = await client
      .from("story_timeline_clips")
      .update({
        scene_synced_at: now,
        scene_revision: rev,
        updated_by: input.userId,
        metadata: {
          ...c.metadata,
          syncIgnoredAt: now,
        } as Json,
      })
      .eq("id", c.id)
      .select("*")
      .single();
    if (error || !data) return fail(error?.message ?? "Ignore failed");
    return ok(asClip(data as Record<string, unknown>));
  }

  // Apply: update clip duration from scene, keep timeline start; shift not auto-cascaded
  const newDuration = Math.max(1000, Number(scene.duration_ms) || c.duration_ms);
  const endMs = c.start_ms + newDuration;
  const { data, error } = await client
    .from("story_timeline_clips")
    .update({
      name: String(scene.name) || c.name,
      end_ms: endMs,
      duration_ms: newDuration,
      trim_out_ms: newDuration,
      scene_synced_at: now,
      scene_revision: rev,
      updated_by: input.userId,
    })
    .eq("id", c.id)
    .select("*")
    .single();

  if (error || !data) return fail(error?.message ?? "Apply sync failed");
  await recomputeTimelineDuration(client, c.timeline_id, input.userId);
  return ok(asClip(data as Record<string, unknown>));
}

export { getTimelineBundle };
