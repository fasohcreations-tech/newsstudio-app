import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getStoryPackageByStoryId } from "@/features/story-scene-builder/services/story-package.service";
import {
  ASSEMBLY_CLIP_ORIGIN,
  DEFAULT_ASPECT_RATIO,
  DEFAULT_FRAME_RATE,
  DEFAULT_RESOLUTION,
  DEFAULT_TIMELINE_TRACKS,
} from "@/features/story-timeline-assembly/constants/timeline.constants";
import type {
  AssembleTimelineResult,
  SceneSyncPrompt,
  StoryTimelineBundle,
  StoryTimelineClipRow,
  StoryTimelineRow,
  StoryTimelineTrackRow,
  StoryTimelineTransitionRow,
} from "@/features/story-timeline-assembly/types/timeline.types";
import type {
  StorySceneInstanceRow,
  StoryVoiceSegmentRow,
} from "@/features/story-scene-builder/types/scene-builder.types";
import type { Database, Json } from "@/shared/types/database.types";

type Client = SupabaseClient<Database>;
type Result<T> = { data: T | null; error: string | null };

function ok<T>(data: T): Result<T> {
  return { data, error: null };
}
function fail<T>(error: string): Result<T> {
  return { data: null, error };
}

function asTimeline(row: Record<string, unknown>): StoryTimelineRow {
  return {
    ...(row as unknown as StoryTimelineRow),
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  };
}

function asTrack(row: Record<string, unknown>): StoryTimelineTrackRow {
  return {
    ...(row as unknown as StoryTimelineTrackRow),
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  };
}

function asClip(row: Record<string, unknown>): StoryTimelineClipRow {
  return {
    ...(row as unknown as StoryTimelineClipRow),
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  };
}

function asTransition(row: Record<string, unknown>): StoryTimelineTransitionRow {
  return {
    ...(row as unknown as StoryTimelineTransitionRow),
    parameters: (row.parameters as Record<string, unknown>) ?? {},
  };
}

function sceneRevision(updatedAt: string, durationMs: number): string {
  return `${updatedAt}:${durationMs}`;
}

export async function getTimelineBundle(
  client: Client,
  organizationId: string,
  storyId: string,
): Promise<Result<StoryTimelineBundle | null>> {
  const { data: timeline, error } = await client
    .from("story_timelines")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("story_id", storyId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) return fail(error.message);
  if (!timeline) return ok(null);

  const timelineId = (timeline as { id: string }).id;

  const [{ data: tracks }, { data: clips }, { data: transitions }] =
    await Promise.all([
      client
        .from("story_timeline_tracks")
        .select("*")
        .eq("timeline_id", timelineId)
        .order("sort_order", { ascending: true }),
      client
        .from("story_timeline_clips")
        .select("*")
        .eq("timeline_id", timelineId)
        .is("deleted_at", null)
        .order("start_ms", { ascending: true }),
      client
        .from("story_timeline_transitions")
        .select("*")
        .eq("timeline_id", timelineId),
    ]);

  return ok({
    timeline: asTimeline(timeline as Record<string, unknown>),
    tracks: (tracks ?? []).map((t) => asTrack(t as Record<string, unknown>)),
    clips: (clips ?? []).map((c) => asClip(c as Record<string, unknown>)),
    transitions: (transitions ?? []).map((t) =>
      asTransition(t as Record<string, unknown>),
    ),
  });
}

async function ensureDefaultTracks(
  client: Client,
  organizationId: string,
  timelineId: string,
): Promise<Result<StoryTimelineTrackRow[]>> {
  const { data: existing } = await client
    .from("story_timeline_tracks")
    .select("*")
    .eq("timeline_id", timelineId)
    .order("sort_order", { ascending: true });

  if (existing && existing.length > 0) {
    return ok(existing.map((t) => asTrack(t as Record<string, unknown>)));
  }

  const { data, error } = await client
    .from("story_timeline_tracks")
    .insert(
      DEFAULT_TIMELINE_TRACKS.map((t) => ({
        organization_id: organizationId,
        timeline_id: timelineId,
        kind: t.kind,
        name: t.name,
        sort_order: t.sortOrder,
        height: t.height,
        color: t.color,
      })),
    )
    .select("*");

  if (error || !data) return fail(error?.message ?? "Failed to create tracks");
  return ok(data.map((t) => asTrack(t as Record<string, unknown>)));
}

/**
 * Assemble a production Timeline from a ready Story Scene Collection.
 * Soft-replaces prior assembly-origin clips; never mutates Scene Instances.
 */
export async function assembleStoryTimeline(
  client: Client,
  input: {
    organizationId: string;
    userId: string;
    storyId: string;
    replaceAssemblyClips?: boolean;
  },
): Promise<Result<AssembleTimelineResult>> {
  const pkg = await getStoryPackageByStoryId(client, input.storyId);
  if (pkg.error || !pkg.data) {
    return fail(pkg.error ?? "Story Scene Collection not found. Build Scenes first.");
  }
  if (pkg.data.package.status !== "ready") {
    return fail(
      `Scene Collection status is “${pkg.data.package.status}”. Ready package required.`,
    );
  }
  if (pkg.data.scenes.length === 0) {
    return fail("No Scene Instances to assemble.");
  }

  const scenes = [...pkg.data.scenes].sort(
    (a, b) => a.timeline_order - b.timeline_order || a.sort_order - b.sort_order,
  );
  const voiceById = new Map(
    pkg.data.voiceSegments.map((v) => [v.id, v] as const),
  );

  let existing = await getTimelineBundle(
    client,
    input.organizationId,
    input.storyId,
  );
  if (existing.error) return fail(existing.error);

  let timelineId: string;
  let created = false;

  if (!existing.data) {
    const { data: inserted, error } = await client
      .from("story_timelines")
      .insert({
        organization_id: input.organizationId,
        story_id: input.storyId,
        package_id: pkg.data.package.id,
        title: `${pkg.data.package.title} Timeline`,
        status: "assembling",
        duration_ms: 0,
        resolution_width: DEFAULT_RESOLUTION.width,
        resolution_height: DEFAULT_RESOLUTION.height,
        frame_rate: DEFAULT_FRAME_RATE,
        aspect_ratio: DEFAULT_ASPECT_RATIO,
        metadata: { origin: ASSEMBLY_CLIP_ORIGIN, version: 1 } as Json,
        created_by: input.userId,
        updated_by: input.userId,
      })
      .select("*")
      .single();

    if (error || !inserted) {
      return fail(error?.message ?? "Failed to create timeline");
    }
    timelineId = (inserted as { id: string }).id;
    created = true;
  } else {
    timelineId = existing.data.timeline.id;
    await client
      .from("story_timelines")
      .update({
        status: "assembling",
        package_id: pkg.data.package.id,
        updated_by: input.userId,
      })
      .eq("id", timelineId);
  }

  const tracksResult = await ensureDefaultTracks(
    client,
    input.organizationId,
    timelineId,
  );
  if (tracksResult.error || !tracksResult.data) {
    return fail(tracksResult.error ?? "Tracks missing");
  }
  const tracks = tracksResult.data;
  const sceneTrack = tracks.find((t) => t.kind === "scene");
  const voiceTrack = tracks.find((t) => t.kind === "voice");
  if (!sceneTrack || !voiceTrack) {
    return fail("Required Scene / Voice tracks missing");
  }

  let replacedClipCount = 0;
  if (input.replaceAssemblyClips !== false) {
    const { data: prior } = await client
      .from("story_timeline_clips")
      .select("id, metadata")
      .eq("timeline_id", timelineId)
      .is("deleted_at", null);

    const assemblyIds = (prior ?? [])
      .filter((c) => {
        const meta = (c.metadata as Record<string, unknown>) ?? {};
        return meta.origin === ASSEMBLY_CLIP_ORIGIN;
      })
      .map((c) => c.id as string);

    if (assemblyIds.length) {
      // Drop transitions for this timeline; they are recreated from scene clips.
      await client
        .from("story_timeline_transitions")
        .delete()
        .eq("timeline_id", timelineId);

      const { error: softErr } = await client
        .from("story_timeline_clips")
        .update({
          deleted_at: new Date().toISOString(),
          updated_by: input.userId,
        })
        .in("id", assemblyIds);
      if (softErr) return fail(softErr.message);
      replacedClipCount = assemblyIds.length;
    }
  }

  let cursor = 0;
  const sceneClipIds: string[] = [];
  const now = new Date().toISOString();

  function assemblyDurationForScene(
    scene: StorySceneInstanceRow,
    seg: StoryVoiceSegmentRow | undefined,
  ): number {
    const metaStart = Number(scene.metadata?.voice_start_ms);
    const metaEnd = Number(scene.metadata?.voice_end_ms);
    const fromMeta =
      Number.isFinite(metaStart) &&
      Number.isFinite(metaEnd) &&
      metaEnd > metaStart
        ? metaEnd - metaStart
        : 0;
    const fromSeg =
      seg && seg.end_ms > seg.start_ms ? seg.end_ms - seg.start_ms : 0;
    const fromScene = Number(scene.duration_ms) || 0;
    return Math.max(1000, fromMeta || fromSeg || fromScene || 5000);
  }

  for (let i = 0; i < scenes.length; i += 1) {
    const scene = scenes[i]!;
    const seg = scene.voice_segment_id
      ? voiceById.get(scene.voice_segment_id)
      : undefined;
    const duration = assemblyDurationForScene(scene, seg);
    const startMs = cursor;
    const endMs = cursor + duration;
    cursor = endMs;

    const { data: clip, error: clipError } = await client
      .from("story_timeline_clips")
      .insert({
        organization_id: input.organizationId,
        timeline_id: timelineId,
        track_id: sceneTrack.id,
        scene_instance_id: scene.id,
        voice_segment_id: scene.voice_segment_id,
        name: scene.name || `Scene ${String(i + 1).padStart(2, "0")}`,
        start_ms: startMs,
        end_ms: endMs,
        duration_ms: duration,
        trim_in_ms: 0,
        trim_out_ms: duration,
        enabled: true,
        locked: false,
        visible: true,
        sort_order: i,
        scene_synced_at: now,
        scene_revision: sceneRevision(scene.updated_at, scene.duration_ms),
        metadata: {
          origin: ASSEMBLY_CLIP_ORIGIN,
          panelOrder: scene.timeline_order,
          sceneId: scene.scene_id,
          masterTemplateId: scene.master_template_id,
          voiceStartMs: scene.metadata?.voice_start_ms ?? seg?.start_ms ?? null,
          voiceEndMs: scene.metadata?.voice_end_ms ?? seg?.end_ms ?? null,
          // References only — editors resolve media/animations from Scene Instance
          references: {
            sceneInstanceId: scene.id,
            motionSceneId: scene.scene_id,
            voiceSegmentId: scene.voice_segment_id,
            videoAssetRef: scene.video_asset_ref,
            imageAssetRef: scene.image_asset_ref,
            animations: true,
            behaviors: true,
          },
        } as Json,
        created_by: input.userId,
        updated_by: input.userId,
      })
      .select("id")
      .single();

    if (clipError || !clip) {
      return fail(clipError?.message ?? "Failed to place scene clip");
    }
    sceneClipIds.push((clip as { id: string }).id);
  }

  // One continuous voiceover clip spanning the full timeline (seamless join).
  // Source file is the story voice asset from 0 → totalDuration.
  if (cursor > 0) {
    const voiceEndSource = Math.max(
      cursor,
      ...pkg.data.voiceSegments.map((v) => Number(v.end_ms) || 0),
      Number(pkg.data.package.voice_duration_ms) || 0,
    );
    await client.from("story_timeline_clips").insert({
      organization_id: input.organizationId,
      timeline_id: timelineId,
      track_id: voiceTrack.id,
      scene_instance_id: null,
      voice_segment_id: pkg.data.voiceSegments[0]?.id ?? null,
      name: "Story Voiceover",
      start_ms: 0,
      end_ms: cursor,
      duration_ms: cursor,
      trim_in_ms: 0,
      trim_out_ms: voiceEndSource,
      enabled: true,
      locked: false,
      visible: true,
      sort_order: 0,
      scene_synced_at: now,
      scene_revision: null,
      metadata: {
        origin: ASSEMBLY_CLIP_ORIGIN,
        seamless: true,
        continuous: true,
        voiceSegmentCount: pkg.data.voiceSegments.length,
      } as Json,
      created_by: input.userId,
      updated_by: input.userId,
    });
  }

  // Default Cut transitions between consecutive scene clips
  for (let i = 0; i < sceneClipIds.length - 1; i += 1) {
    await client.from("story_timeline_transitions").insert({
      organization_id: input.organizationId,
      timeline_id: timelineId,
      from_clip_id: sceneClipIds[i]!,
      to_clip_id: sceneClipIds[i + 1]!,
      transition_type: "cut",
      duration_ms: 0,
      parameters: {},
    });
  }

  const totalDuration = cursor;
  await client
    .from("story_timelines")
    .update({
      status: "ready",
      duration_ms: totalDuration,
      assembled_at: now,
      assembled_by: input.userId,
      updated_by: input.userId,
      metadata: {
        origin: ASSEMBLY_CLIP_ORIGIN,
        sceneCount: scenes.length,
        packageId: pkg.data.package.id,
      } as Json,
    })
    .eq("id", timelineId);

  const bundle = await getTimelineBundle(
    client,
    input.organizationId,
    input.storyId,
  );
  if (bundle.error || !bundle.data) {
    return fail(bundle.error ?? "Timeline assembled but reload failed");
  }

  return ok({
    bundle: bundle.data,
    created,
    replacedClipCount,
  });
}

/**
 * Detect Scene Instance edits that may need Timeline sync (prompt only).
 */
export async function listSceneSyncPrompts(
  client: Client,
  organizationId: string,
  storyId: string,
): Promise<Result<SceneSyncPrompt[]>> {
  const bundle = await getTimelineBundle(client, organizationId, storyId);
  if (bundle.error) return fail(bundle.error);
  if (!bundle.data) return ok([]);

  const sceneClips = bundle.data.clips.filter(
    (c) => c.scene_instance_id && c.track_id,
  );
  const instanceIds = [
    ...new Set(
      sceneClips
        .map((c) => c.scene_instance_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  if (!instanceIds.length) return ok([]);

  const { data: instances, error } = await client
    .from("story_scene_instances")
    .select("id, name, updated_at, duration_ms")
    .eq("organization_id", organizationId)
    .in("id", instanceIds)
    .is("deleted_at", null);

  if (error) return fail(error.message);

  const byId = new Map(
    (instances ?? []).map((i) => [i.id as string, i] as const),
  );
  const prompts: SceneSyncPrompt[] = [];

  for (const clip of sceneClips) {
    if (!clip.scene_instance_id) continue;
    // Only scene-track clips (skip voice mirrors)
    const track = bundle.data.tracks.find((t) => t.id === clip.track_id);
    if (track?.kind !== "scene") continue;

    const scene = byId.get(clip.scene_instance_id);
    if (!scene) continue;
    const rev = sceneRevision(
      String(scene.updated_at),
      Number(scene.duration_ms),
    );
    if (clip.scene_revision && clip.scene_revision === rev) continue;
    if (
      clip.scene_synced_at &&
      new Date(String(scene.updated_at)).getTime() <=
        new Date(clip.scene_synced_at).getTime()
    ) {
      continue;
    }
    prompts.push({
      clipId: clip.id,
      sceneInstanceId: clip.scene_instance_id,
      clipName: clip.name,
      sceneName: String(scene.name),
      sceneUpdatedAt: String(scene.updated_at),
      clipSyncedAt: clip.scene_synced_at,
    });
  }

  return ok(prompts);
}
