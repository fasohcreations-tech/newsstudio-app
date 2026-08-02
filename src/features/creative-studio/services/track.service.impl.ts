import type { SupabaseClient } from "@supabase/supabase-js";

import {
  MAX_TRACK_HEIGHT,
  MIN_TRACK_HEIGHT,
} from "@/features/creative-studio/constants/timeline-engine.constants";
import type { TrackService } from "@/features/creative-studio/services/interfaces/track.service";
import type {
  EnterpriseTimelineTrack,
  EnterpriseTimelineTrackWithClips,
  TrackPatch,
} from "@/features/creative-studio/types/timeline-engine.types";
import type {
  CreativeServiceResult,
  CreativeTimelineTrack,
} from "@/features/creative-studio/types/creative-studio.types";
import { createTimelineService } from "@/features/creative-studio/services/timeline.service.impl";

type Client = SupabaseClient;

function ok<T>(data: T): CreativeServiceResult<T> {
  return { data, error: null };
}

function fail<T>(error: string): CreativeServiceResult<T> {
  return { data: null, error };
}

function asEnterpriseTrack(row: Record<string, unknown>): EnterpriseTimelineTrack {
  const track = row as unknown as CreativeTimelineTrack;
  return {
    ...track,
    collapsed: Boolean(row.collapsed ?? false),
    visible: row.visible !== false,
    solo: Boolean(row.solo ?? false),
    color_label: String(row.color_label ?? "default"),
  };
}

export class SupabaseTrackService implements TrackService {
  constructor(private client: Client) {}

  async list(
    timelineId: string,
  ): Promise<CreativeServiceResult<EnterpriseTimelineTrackWithClips[]>> {
    const timeline = createTimelineService(this.client);
    const bundle = await timeline.getBundle(timelineId);
    if (!bundle.data) {
      return fail<EnterpriseTimelineTrackWithClips[]>(
        bundle.error ?? "Failed to load tracks",
      );
    }

    return ok(
      bundle.data.tracks.map((track) => ({
        ...asEnterpriseTrack(track as unknown as Record<string, unknown>),
        clips: track.clips.map((clip) => ({
          ...clip,
          locked: Boolean((clip as Record<string, unknown>).locked ?? false),
          muted: Boolean((clip as Record<string, unknown>).muted ?? false),
          hidden: Boolean((clip as Record<string, unknown>).hidden ?? false),
          color_label: String(
            (clip as Record<string, unknown>).color_label ?? "default",
          ),
          content_object_id:
            ((clip as Record<string, unknown>).content_object_id as string) ??
            null,
          scene_id:
            ((clip as Record<string, unknown>).scene_id as string) ?? null,
          voice_segment_id:
            ((clip as Record<string, unknown>).voice_segment_id as string) ??
            null,
          script_paragraph_id:
            ((clip as Record<string, unknown>).script_paragraph_id as string) ??
            null,
          source_clip_id:
            ((clip as Record<string, unknown>).source_clip_id as string) ??
            null,
        })),
      })),
    );
  }

  async add(
    timelineId: string,
    organizationId: string,
    input: Pick<EnterpriseTimelineTrack, "kind" | "name" | "sort_order">,
  ): Promise<CreativeServiceResult<EnterpriseTimelineTrack>> {
    const timeline = createTimelineService(this.client);
    const result = await timeline.addTrack(timelineId, organizationId, {
      kind: input.kind as EnterpriseTimelineTrack["kind"],
      name: input.name,
      sort_order: input.sort_order,
    });
    if (!result.data) {
      return fail<EnterpriseTimelineTrack>(result.error ?? "Add track failed");
    }
    return ok(asEnterpriseTrack(result.data as unknown as Record<string, unknown>));
  }

  async update(
    trackId: string,
    patch: TrackPatch,
  ): Promise<CreativeServiceResult<EnterpriseTimelineTrack>> {
    const timeline = createTimelineService(this.client);
    const result = await timeline.updateTrack(trackId, patch);
    if (!result.data) {
      return fail<EnterpriseTimelineTrack>(result.error ?? "Update track failed");
    }
    return ok(asEnterpriseTrack(result.data as unknown as Record<string, unknown>));
  }

  async reorder(
    timelineId: string,
    trackIds: string[],
  ): Promise<CreativeServiceResult<EnterpriseTimelineTrack[]>> {
    const updates = await Promise.all(
      trackIds.map((id, index) => this.update(id, { sort_order: index })),
    );
    const failed = updates.find((u) => !u.data);
    if (failed) {
      return fail<EnterpriseTimelineTrack[]>(failed.error ?? "Reorder failed");
    }
    return ok(updates.map((u) => u.data!));
  }

  async setHeight(
    trackId: string,
    height: number,
  ): Promise<CreativeServiceResult<EnterpriseTimelineTrack>> {
    const clamped = Math.min(
      MAX_TRACK_HEIGHT,
      Math.max(MIN_TRACK_HEIGHT, height),
    );
    return this.update(trackId, { height: clamped });
  }
}

export function createTrackService(client: Client): TrackService {
  return new SupabaseTrackService(client);
}
