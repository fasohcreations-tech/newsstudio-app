import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  acceptRecommendation,
  getRecommendation,
} from "@/features/ai/intelligence/services/recommendation.service";
import type {
  AIRecommendation,
  IntelligenceServiceResult,
  TimelineDraftPayload,
  TimelineDraftScene,
} from "@/features/ai/intelligence/types/intelligence.types";
import { DEFAULT_TIMELINE_DURATION_MS } from "@/features/creative-studio/constants/creative-studio.constants";
import {
  DEFAULT_ENTERPRISE_TRACKS,
  ENTERPRISE_TRACK_COLORS,
} from "@/features/creative-studio/constants/timeline-engine.constants";
import { createTimelineService } from "@/features/creative-studio/services/timeline.service.impl";
import type {
  CreativeTimeline,
  CreativeTimelineClip,
  CreativeTimelineTrack,
} from "@/features/creative-studio/types/creative-studio.types";
import type { TimelineBundle } from "@/features/creative-studio/services/interfaces/timeline.service";

type Client = SupabaseClient;

const CLIP_SELECT =
  "id, organization_id, track_id, media_asset_id, template_id, name, clip_kind, start_ms, end_ms, trim_start_ms, trim_end_ms, position_x, position_y, scale, rotation, opacity, volume, speed, sort_order, metadata, created_at, updated_at, deleted_at, locked, muted, hidden, color_label, content_object_id, scene_id, voice_segment_id, script_paragraph_id, source_clip_id";

const CLIP_SELECT_BASE =
  "id, organization_id, track_id, media_asset_id, template_id, name, clip_kind, start_ms, end_ms, trim_start_ms, trim_end_ms, position_x, position_y, scale, rotation, opacity, volume, speed, sort_order, metadata, created_at, updated_at, deleted_at";

export type ApplyTimelineDraftResult = {
  recommendation: AIRecommendation;
  clips: CreativeTimelineClip[];
  trackId: string;
  track: CreativeTimelineTrack;
  timeline: CreativeTimeline;
  projectId: string | null;
  timelineId: string;
  createdTimeline: boolean;
};

function ok<T>(data: T): IntelligenceServiceResult<T> {
  return { data, error: null };
}

function fail<T>(error: string): IntelligenceServiceResult<T> {
  return { data: null, error };
}

function asDraftScenes(payload: Record<string, unknown>): TimelineDraftScene[] {
  const draft = payload as Partial<TimelineDraftPayload>;
  return Array.isArray(draft.scenes) ? draft.scenes : [];
}

function isMissingColumnError(message: string | undefined): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("does not exist") ||
    (lower.includes("column") && lower.includes("not find")) ||
    lower.includes("could not find")
  );
}

async function ensureTimelineForProject(
  client: Client,
  input: {
    organizationId: string;
    projectId: string;
    title?: string;
  },
): Promise<IntelligenceServiceResult<{ timelineId: string }>> {
  const { data: project, error: projectError } = await client
    .from("creative_studio_projects")
    .select("id, title, organization_id")
    .eq("id", input.projectId)
    .eq("organization_id", input.organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (projectError) return fail(projectError.message);
  if (!project) return fail("Creative Studio project not found.");

  const insert = await client
    .from("creative_studio_timelines")
    .insert({
      organization_id: input.organizationId,
      project_id: input.projectId,
      title: input.title ?? "Main Timeline",
      duration_ms: DEFAULT_TIMELINE_DURATION_MS,
    })
    .select("id")
    .single();

  if (insert.error || !insert.data) {
    // Race: another request may have created it.
    const existing = await client
      .from("creative_studio_timelines")
      .select("id")
      .eq("project_id", input.projectId)
      .maybeSingle();
    if (existing.data?.id) {
      return ok({ timelineId: existing.data.id as string });
    }
    return fail(insert.error?.message ?? "Failed to create project timeline.");
  }

  const timelineId = insert.data.id as string;
  const trackRows = DEFAULT_ENTERPRISE_TRACKS.map((track, index) => ({
    organization_id: input.organizationId,
    timeline_id: timelineId,
    kind: track.kind,
    name: track.name,
    sort_order: index,
    color: ENTERPRISE_TRACK_COLORS[track.kind],
  }));

  const trackInsert = await client
    .from("creative_studio_timeline_tracks")
    .insert(trackRows);

  if (trackInsert.error) {
    // Enum / column mismatch on older DBs — fall back to core kinds.
    const fallback = await client.from("creative_studio_timeline_tracks").insert([
      {
        organization_id: input.organizationId,
        timeline_id: timelineId,
        kind: "video",
        name: "Video",
        sort_order: 0,
        color: "#3b82f6",
      },
      {
        organization_id: input.organizationId,
        timeline_id: timelineId,
        kind: "graphics",
        name: "Graphics",
        sort_order: 1,
        color: "#a855f7",
      },
      {
        organization_id: input.organizationId,
        timeline_id: timelineId,
        kind: "audio",
        name: "Audio",
        sort_order: 2,
        color: "#22c55e",
      },
    ]);
    if (fallback.error) {
      return fail(
        fallback.error.message ||
          trackInsert.error.message ||
          "Failed to create timeline tracks.",
      );
    }
  }

  return ok({ timelineId });
}

async function resolveTimelineBundle(
  client: Client,
  input: {
    organizationId: string;
    projectId: string | null;
    timelineIdHint: string | null;
  },
): Promise<
  IntelligenceServiceResult<{ bundle: TimelineBundle; createdTimeline: boolean }>
> {
  const timelineService = createTimelineService(client);

  if (input.timelineIdHint) {
    const byId = await timelineService.getBundle(input.timelineIdHint);
    if (byId.data) {
      return ok({ bundle: byId.data, createdTimeline: false });
    }
  }

  if (input.projectId) {
    const byProject = await timelineService.getBundleByProject(input.projectId);
    if (byProject.data) {
      return ok({ bundle: byProject.data, createdTimeline: false });
    }

    const ensured = await ensureTimelineForProject(client, {
      organizationId: input.organizationId,
      projectId: input.projectId,
    });
    if (!ensured.data) {
      return fail(
        ensured.error ??
          "Timeline not found for this project, and creating one failed.",
      );
    }

    const created = await timelineService.getBundle(ensured.data.timelineId);
    if (!created.data) {
      return fail(created.error ?? "Timeline was created but could not be loaded.");
    }
    return ok({ bundle: created.data, createdTimeline: true });
  }

  return fail(
    input.timelineIdHint
      ? "Timeline not found. Open the Creative Studio project and Accept again."
      : "Open a Creative Studio project, then Accept again to place beats on its timeline.",
  );
}

/**
 * Accept a timeline draft and place editable scene beats on the project timeline.
 * Never renders video — only creates graphic clips linked to Scene Library templates.
 */
export async function applyTimelineDraft(
  client: Client,
  input: {
    organizationId: string;
    userId: string;
    recommendationId: string;
    projectId?: string | null;
    timelineId?: string | null;
  },
): Promise<IntelligenceServiceResult<ApplyTimelineDraftResult>> {
  const loaded = await getRecommendation(client, input.recommendationId);
  if (!loaded.data) {
    return fail(loaded.error ?? "Recommendation not found");
  }

  const recommendation = loaded.data;
  if (recommendation.organization_id !== input.organizationId) {
    return fail("Recommendation not found");
  }
  if (recommendation.domain !== "timeline") {
    return fail("Only timeline drafts can be applied to a project timeline.");
  }
  if (recommendation.status !== "pending") {
    return fail("Only pending drafts can be accepted and applied.");
  }

  const scenes = asDraftScenes(recommendation.payload);
  if (scenes.length === 0) {
    return fail("This draft has no scene beats to place.");
  }

  const projectId = input.projectId ?? recommendation.project_id ?? null;
  const timelineIdHint =
    input.timelineId ?? recommendation.timeline_id ?? null;

  if (!projectId && !timelineIdHint) {
    return fail(
      "Open a Creative Studio project, then Accept again to place beats on its timeline.",
    );
  }

  const resolved = await resolveTimelineBundle(client, {
    organizationId: input.organizationId,
    projectId,
    timelineIdHint,
  });
  if (!resolved.data) {
    return fail(resolved.error ?? "Timeline not found for this project.");
  }

  const { bundle, createdTimeline } = resolved.data;
  const timelineService = createTimelineService(client);

  let track =
    bundle.tracks.find((row) => row.kind === "graphics") ??
    bundle.tracks.find((row) => row.kind === "video") ??
    bundle.tracks[0] ??
    null;

  if (!track) {
    // Existing timeline with zero tracks (failed seed earlier) — seed core tracks.
    const seeded = await client.from("creative_studio_timeline_tracks").insert([
      {
        organization_id: input.organizationId,
        timeline_id: bundle.timeline.id,
        kind: "video",
        name: "Video",
        sort_order: 0,
        color: "#3b82f6",
      },
      {
        organization_id: input.organizationId,
        timeline_id: bundle.timeline.id,
        kind: "graphics",
        name: "Graphics",
        sort_order: 1,
        color: "#a855f7",
      },
      {
        organization_id: input.organizationId,
        timeline_id: bundle.timeline.id,
        kind: "audio",
        name: "Audio",
        sort_order: 2,
        color: "#22c55e",
      },
    ]);

    if (!seeded.error) {
      const reloaded = await timelineService.getBundle(bundle.timeline.id);
      track =
        reloaded.data?.tracks.find((row) => row.kind === "graphics") ??
        reloaded.data?.tracks.find((row) => row.kind === "video") ??
        reloaded.data?.tracks[0] ??
        null;
    }

    if (!track) {
      const graphicsTrack = await timelineService.addTrack(
        bundle.timeline.id,
        input.organizationId,
        { kind: "graphics", name: "Graphics", sort_order: 0 },
      );

      if (graphicsTrack.data) {
        track = { ...graphicsTrack.data, clips: [] };
      } else {
        const videoTrack = await timelineService.addTrack(
          bundle.timeline.id,
          input.organizationId,
          { kind: "video", name: "Video", sort_order: 0 },
        );
        if (videoTrack.data) {
          track = { ...videoTrack.data, clips: [] };
        } else {
          return fail(
            graphicsTrack.error ||
              videoTrack.error ||
              seeded.error?.message ||
              "Could not create a timeline track to place AI beats.",
          );
        }
      }
    }
  }

  const clips: CreativeTimelineClip[] = [];

  for (let index = 0; index < scenes.length; index += 1) {
    const scene = scenes[index]!;
    const durationMs = Math.max(500, Math.round(scene.durationMs || 5000));
    const startMs = Math.max(0, Math.round(scene.startMs ?? 0));
    const endMs = startMs + durationMs;

    let { data, error } = await client
      .from("creative_studio_timeline_clips")
      .insert({
        organization_id: input.organizationId,
        track_id: track.id,
        name: scene.sceneName || `AI beat ${index + 1}`,
        clip_kind: "graphic",
        start_ms: startMs,
        end_ms: endMs,
        trim_start_ms: 0,
        trim_end_ms: durationMs,
        position_x: 0,
        position_y: 0,
        scale: 1,
        rotation: 0,
        opacity: 1,
        volume: 1,
        speed: 1,
        sort_order: index,
        metadata: {
          aiGenerated: true,
          recommendationId: recommendation.id,
          sceneType: scene.sceneType ?? null,
          notes: scene.notes ?? null,
        },
        media_asset_id: null,
        template_id: null,
        scene_id: scene.sceneId ?? null,
      })
      .select(CLIP_SELECT)
      .single();

    if (error && isMissingColumnError(error.message)) {
      ({ data, error } = await client
        .from("creative_studio_timeline_clips")
        .insert({
          organization_id: input.organizationId,
          track_id: track.id,
          name: scene.sceneName || `AI beat ${index + 1}`,
          clip_kind: "graphic",
          start_ms: startMs,
          end_ms: endMs,
          trim_start_ms: 0,
          trim_end_ms: durationMs,
          position_x: 0,
          position_y: 0,
          scale: 1,
          rotation: 0,
          opacity: 1,
          volume: 1,
          speed: 1,
          sort_order: index,
          metadata: {
            aiGenerated: true,
            recommendationId: recommendation.id,
            sceneType: scene.sceneType ?? null,
            notes: scene.notes ?? null,
          },
          media_asset_id: null,
          template_id: null,
        })
        .select(CLIP_SELECT_BASE)
        .single());
    }

    if (error || !data) {
      return fail(
        error?.message ??
          `Failed to place beat “${scene.sceneName}” on the timeline.`,
      );
    }

    clips.push(data as CreativeTimelineClip);
  }

  const payloadDuration = Number(
    (recommendation.payload as Partial<TimelineDraftPayload>).durationMs ?? 0,
  );
  const maxEnd = Math.max(
    bundle.timeline.duration_ms ?? 0,
    payloadDuration,
    ...clips.map((clip) => clip.end_ms),
  );

  let timeline = bundle.timeline;
  if (maxEnd > (bundle.timeline.duration_ms ?? 0)) {
    const updated = await timelineService.updateTimeline(bundle.timeline.id, {
      duration_ms: maxEnd,
    });
    if (updated.data) timeline = updated.data;
  }

  const accepted = await acceptRecommendation(
    client,
    recommendation.id,
    input.userId,
  );
  if (!accepted.data) {
    return fail(
      accepted.error ??
        "Clips were placed, but marking the draft accepted failed. Refresh and check the timeline.",
    );
  }

  return ok({
    recommendation: accepted.data,
    clips,
    trackId: track.id,
    track,
    timeline,
    projectId,
    timelineId: timeline.id,
    createdTimeline,
  });
}
