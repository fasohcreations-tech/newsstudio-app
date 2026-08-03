import type { SupabaseClient } from "@supabase/supabase-js";

import { TRACK_KIND_COLORS } from "@/features/creative-studio/constants/creative-studio.constants";
import {
  DEFAULT_ENTERPRISE_TRACKS,
  ENTERPRISE_TRACK_COLORS,
} from "@/features/creative-studio/constants/timeline-engine.constants";
import type { EnterpriseTrackKind } from "@/features/creative-studio/types/timeline-engine.types";
import type {
  TimelineBundle,
  TimelineService,
} from "@/features/creative-studio/services/interfaces/timeline.service";
import type {
  ClipTransform,
  CreativeServiceResult,
  CreativeTimeline,
  CreativeTimelineClip,
  CreativeTimelineClipInsert,
  CreativeTimelineClipUpdate,
  CreativeTimelineTrack,
  CreativeTimelineTrackInsert,
  CreativeTimelineUpdate,
} from "@/features/creative-studio/types/creative-studio.types";

type Client = SupabaseClient;

const CREATIVE_TIMELINE_SELECT_BASE =
  "id, organization_id, project_id, title, duration_ms, zoom_level, snap_enabled, playhead_ms, metadata, created_at, updated_at";

const CREATIVE_TIMELINE_SELECT =
  `${CREATIVE_TIMELINE_SELECT_BASE}, story_id, scene_id, content_object_id, voice_segment_id, script_paragraph_id, magnetic_enabled, ripple_mode`;

const CREATIVE_TRACK_SELECT_BASE =
  "id, organization_id, timeline_id, kind, name, sort_order, muted, locked, height, color, metadata, created_at, updated_at";

const CREATIVE_TRACK_SELECT =
  `${CREATIVE_TRACK_SELECT_BASE}, collapsed, visible, solo, color_label`;

const CREATIVE_CLIP_SELECT_BASE =
  "id, organization_id, track_id, media_asset_id, template_id, name, clip_kind, start_ms, end_ms, trim_start_ms, trim_end_ms, position_x, position_y, scale, rotation, opacity, volume, speed, sort_order, metadata, created_at, updated_at, deleted_at";

const CREATIVE_CLIP_SELECT =
  `${CREATIVE_CLIP_SELECT_BASE}, locked, muted, hidden, color_label, content_object_id, scene_id, voice_segment_id, script_paragraph_id, source_clip_id`;

function ok<T>(data: T): CreativeServiceResult<T> {
  return { data, error: null };
}

function fail<T>(error: string): CreativeServiceResult<T> {
  return { data: null, error };
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

async function selectTimeline(
  client: Client,
  filter: { id?: string; projectId?: string },
) {
  let query = client
    .from("creative_studio_timelines")
    .select(CREATIVE_TIMELINE_SELECT);
  if (filter.id) query = query.eq("id", filter.id);
  if (filter.projectId) query = query.eq("project_id", filter.projectId);
  let result = await query.maybeSingle();

  if (result.error && isMissingColumnError(result.error.message)) {
    let fallback = client
      .from("creative_studio_timelines")
      .select(CREATIVE_TIMELINE_SELECT_BASE);
    if (filter.id) fallback = fallback.eq("id", filter.id);
    if (filter.projectId) fallback = fallback.eq("project_id", filter.projectId);
    result = await fallback.maybeSingle();
  }
  return result;
}

export class SupabaseTimelineService implements TimelineService {
  constructor(private client: Client) {}

  async getBundle(timelineId: string): Promise<CreativeServiceResult<TimelineBundle>> {
    const { data: timeline, error } = await selectTimeline(this.client, {
      id: timelineId,
    });

    if (error) return fail(error.message);
    if (!timeline) return fail("Timeline not found.");

    return this.loadTracksAndClips(timeline as CreativeTimeline);
  }

  async getBundleByProject(
    projectId: string,
  ): Promise<CreativeServiceResult<TimelineBundle>> {
    const { data: timeline, error } = await selectTimeline(this.client, {
      projectId,
    });

    if (error) return fail(error.message);
    if (!timeline) return fail("Timeline not found.");

    return this.loadTracksAndClips(timeline as CreativeTimeline);
  }

  private async loadTracksAndClips(
    timeline: CreativeTimeline,
  ): Promise<CreativeServiceResult<TimelineBundle>> {
    let { data: tracks, error: trackError } = await this.client
      .from("creative_studio_timeline_tracks")
      .select(CREATIVE_TRACK_SELECT)
      .eq("timeline_id", timeline.id)
      .order("sort_order", { ascending: true });

    if (trackError && isMissingColumnError(trackError.message)) {
      ({ data: tracks, error: trackError } = await this.client
        .from("creative_studio_timeline_tracks")
        .select(CREATIVE_TRACK_SELECT_BASE)
        .eq("timeline_id", timeline.id)
        .order("sort_order", { ascending: true }));
    }

    if (trackError) return fail(trackError.message);

    const trackRows = (tracks ?? []) as CreativeTimelineTrack[];
    const trackIds = trackRows.map((t) => t.id);
    let clips: CreativeTimelineClip[] = [];

    if (trackIds.length > 0) {
      let { data: clipRows, error: clipError } = await this.client
        .from("creative_studio_timeline_clips")
        .select(CREATIVE_CLIP_SELECT)
        .in("track_id", trackIds)
        .is("deleted_at", null)
        .order("start_ms", { ascending: true });

      if (clipError && isMissingColumnError(clipError.message)) {
        ({ data: clipRows, error: clipError } = await this.client
          .from("creative_studio_timeline_clips")
          .select(CREATIVE_CLIP_SELECT_BASE)
          .in("track_id", trackIds)
          .is("deleted_at", null)
          .order("start_ms", { ascending: true }));
      }

      if (clipError) return fail(clipError.message);
      clips = (clipRows ?? []) as CreativeTimelineClip[];
    }

    return ok({
      timeline,
      tracks: trackRows.map((track) => ({
        ...track,
        clips: clips.filter((c) => c.track_id === track.id),
      })),
    });
  }

  async updateTimeline(
    timelineId: string,
    patch: CreativeTimelineUpdate,
  ): Promise<CreativeServiceResult<CreativeTimeline>> {
    const { data, error } = await this.client
      .from("creative_studio_timelines")
      .update(patch)
      .eq("id", timelineId)
      .select(CREATIVE_TIMELINE_SELECT)
      .single();

    if (error || !data) return fail(error?.message ?? "Update failed");
    return ok(data as CreativeTimeline);
  }

  async addTrack(
    timelineId: string,
    organizationId: string,
    input: Pick<CreativeTimelineTrackInsert, "kind" | "name" | "sort_order">,
  ): Promise<CreativeServiceResult<CreativeTimelineTrack>> {
    const payload = {
      organization_id: organizationId,
      timeline_id: timelineId,
      kind: input.kind,
      name: input.name,
      sort_order: input.sort_order ?? 0,
      color:
        ENTERPRISE_TRACK_COLORS[input.kind as EnterpriseTrackKind] ??
        TRACK_KIND_COLORS[input.kind as keyof typeof TRACK_KIND_COLORS] ??
        "#64748b",
    };

    let { data, error } = await this.client
      .from("creative_studio_timeline_tracks")
      .insert(payload)
      .select(CREATIVE_TRACK_SELECT)
      .single();

    if (error && isMissingColumnError(error.message)) {
      ({ data, error } = await this.client
        .from("creative_studio_timeline_tracks")
        .insert(payload)
        .select(CREATIVE_TRACK_SELECT_BASE)
        .single());
    }

    if (error || !data) {
      return fail(error?.message ?? "Add track failed");
    }
    return ok(data as CreativeTimelineTrack);
  }

  async updateTrack(
    trackId: string,
    patch: Partial<
      Pick<
        CreativeTimelineTrack,
        "name" | "muted" | "locked" | "height" | "color" | "sort_order"
      > & {
        collapsed?: boolean;
        visible?: boolean;
        solo?: boolean;
        color_label?: string;
      }
    >,
  ): Promise<CreativeServiceResult<CreativeTimelineTrack>> {
    const { data, error } = await this.client
      .from("creative_studio_timeline_tracks")
      .update(patch)
      .eq("id", trackId)
      .select(CREATIVE_TRACK_SELECT)
      .single();
    return ok(data as CreativeTimelineTrack);
  }

  async addClip(
    trackId: string,
    organizationId: string,
    input: Omit<
      CreativeTimelineClipInsert,
      "id" | "track_id" | "organization_id" | "created_at" | "updated_at" | "deleted_at"
    >,
  ): Promise<CreativeServiceResult<CreativeTimelineClip>> {
    const { data, error } = await this.client
      .from("creative_studio_timeline_clips")
      .insert({
        organization_id: organizationId,
        track_id: trackId,
        ...input,
      })
      .select(CREATIVE_CLIP_SELECT)
      .single();

    if (error || !data) return fail(error?.message ?? "Add clip failed");
    return ok(data as CreativeTimelineClip);
  }

  async updateClip(
    clipId: string,
    patch: CreativeTimelineClipUpdate,
  ): Promise<CreativeServiceResult<CreativeTimelineClip>> {
    const { data, error } = await this.client
      .from("creative_studio_timeline_clips")
      .update(patch)
      .eq("id", clipId)
      .is("deleted_at", null)
      .select(CREATIVE_CLIP_SELECT)
      .single();

    if (error || !data) return fail(error?.message ?? "Update clip failed");
    return ok(data as CreativeTimelineClip);
  }

  async moveClip(
    clipId: string,
    trackId: string,
    startMs: number,
  ): Promise<CreativeServiceResult<CreativeTimelineClip>> {
    const { data: existing } = await this.client
      .from("creative_studio_timeline_clips")
      .select("end_ms,start_ms")
      .eq("id", clipId)
      .maybeSingle();

    const duration =
      existing && existing.end_ms != null && existing.start_ms != null
        ? Number(existing.end_ms) - Number(existing.start_ms)
        : 5000;

    const { data, error } = await this.client
      .from("creative_studio_timeline_clips")
      .update({
        track_id: trackId,
        start_ms: startMs,
        end_ms: startMs + duration,
      })
      .eq("id", clipId)
      .is("deleted_at", null)
      .select(CREATIVE_CLIP_SELECT)
      .single();

    if (error || !data) return fail(error?.message ?? "Move clip failed");
    return ok(data as CreativeTimelineClip);
  }

  async trimClip(
    clipId: string,
    trim: Pick<ClipTransform, "startMs" | "endMs" | "speed">,
  ): Promise<CreativeServiceResult<CreativeTimelineClip>> {
    return this.updateClip(clipId, {
      start_ms: trim.startMs,
      end_ms: trim.endMs,
      speed: trim.speed,
    });
  }

  async softDeleteClip(
    clipId: string,
  ): Promise<CreativeServiceResult<CreativeTimelineClip>> {
    return this.updateClip(clipId, {
      deleted_at: new Date().toISOString(),
    });
  }

  async addMarker(
    trackId: string,
    organizationId: string,
    startMs: number,
    label: string,
  ): Promise<CreativeServiceResult<CreativeTimelineClip>> {
    return this.addClip(trackId, organizationId, {
      name: label,
      clip_kind: "marker",
      start_ms: startMs,
      end_ms: startMs,
      trim_start_ms: 0,
      trim_end_ms: 0,
      position_x: 0,
      position_y: 0,
      scale: 1,
      rotation: 0,
      opacity: 1,
      volume: 1,
      speed: 1,
      sort_order: 0,
      metadata: {},
      media_asset_id: null,
      template_id: null,
    });
  }

  async ensureDefaultTracks(
    timelineId: string,
    organizationId: string,
  ): Promise<CreativeServiceResult<CreativeTimelineTrack[]>> {
    const { data: existing } = await this.client
      .from("creative_studio_timeline_tracks")
      .select("id")
      .eq("timeline_id", timelineId);

    if ((existing ?? []).length > 0) {
      const bundle = await this.getBundle(timelineId);
      if (!bundle.data) return fail(bundle.error ?? "Load failed");
      return ok(bundle.data.tracks);
    }

    const { data, error } = await this.client
      .from("creative_studio_timeline_tracks")
      .insert(
        DEFAULT_ENTERPRISE_TRACKS.map((t, i) => ({
          organization_id: organizationId,
          timeline_id: timelineId,
          kind: t.kind,
          name: t.name,
          sort_order: i,
          color: ENTERPRISE_TRACK_COLORS[t.kind],
        })),
      )
      .select(CREATIVE_TRACK_SELECT);

    if (error) return fail(error.message);
    return ok((data ?? []) as CreativeTimelineTrack[]);
  }
}

export function createTimelineService(client: Client): TimelineService {
  return new SupabaseTimelineService(client);
}
