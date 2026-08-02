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

function ok<T>(data: T): CreativeServiceResult<T> {
  return { data, error: null };
}

function fail<T>(error: string): CreativeServiceResult<T> {
  return { data: null, error };
}

export class SupabaseTimelineService implements TimelineService {
  constructor(private client: Client) {}

  async getBundle(timelineId: string): Promise<CreativeServiceResult<TimelineBundle>> {
    const { data: timeline, error } = await this.client
      .from("creative_studio_timelines")
      .select("*")
      .eq("id", timelineId)
      .maybeSingle();

    if (error) return fail(error.message);
    if (!timeline) return fail("Timeline not found.");

    return this.loadTracksAndClips(timeline as CreativeTimeline);
  }

  async getBundleByProject(
    projectId: string,
  ): Promise<CreativeServiceResult<TimelineBundle>> {
    const { data: timeline, error } = await this.client
      .from("creative_studio_timelines")
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle();

    if (error) return fail(error.message);
    if (!timeline) return fail("Timeline not found.");

    return this.loadTracksAndClips(timeline as CreativeTimeline);
  }

  private async loadTracksAndClips(
    timeline: CreativeTimeline,
  ): Promise<CreativeServiceResult<TimelineBundle>> {
    const { data: tracks, error: trackError } = await this.client
      .from("creative_studio_timeline_tracks")
      .select("*")
      .eq("timeline_id", timeline.id)
      .order("sort_order", { ascending: true });

    if (trackError) return fail(trackError.message);

    const trackRows = (tracks ?? []) as CreativeTimelineTrack[];
    const trackIds = trackRows.map((t) => t.id);
    let clips: CreativeTimelineClip[] = [];

    if (trackIds.length > 0) {
      const { data: clipRows, error: clipError } = await this.client
        .from("creative_studio_timeline_clips")
        .select("*")
        .in("track_id", trackIds)
        .is("deleted_at", null)
        .order("start_ms", { ascending: true });

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
      .select("*")
      .single();

    if (error || !data) return fail(error?.message ?? "Update failed");
    return ok(data as CreativeTimeline);
  }

  async addTrack(
    timelineId: string,
    organizationId: string,
    input: Pick<CreativeTimelineTrackInsert, "kind" | "name" | "sort_order">,
  ): Promise<CreativeServiceResult<CreativeTimelineTrack>> {
    const { data, error } = await this.client
      .from("creative_studio_timeline_tracks")
      .insert({
        organization_id: organizationId,
        timeline_id: timelineId,
        kind: input.kind,
        name: input.name,
        sort_order: input.sort_order ?? 0,
        color:
          ENTERPRISE_TRACK_COLORS[input.kind as EnterpriseTrackKind] ??
          TRACK_KIND_COLORS[input.kind as keyof typeof TRACK_KIND_COLORS] ??
          "#64748b",
      })
      .select("*")
      .single();

    if (error || !data) return fail(error?.message ?? "Add track failed");
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
      .select("*")
      .single();

    if (error || !data) return fail(error?.message ?? "Update track failed");
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
      .select("*")
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
      .select("*")
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
      .select("*")
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
      .select("*");

    if (error) return fail(error.message);
    return ok((data ?? []) as CreativeTimelineTrack[]);
  }
}

export function createTimelineService(client: Client): TimelineService {
  return new SupabaseTimelineService(client);
}
