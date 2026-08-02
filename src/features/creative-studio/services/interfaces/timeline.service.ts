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
  CreativeTrackKind,
} from "@/features/creative-studio/types/creative-studio.types";

export type TimelineBundle = {
  timeline: CreativeTimeline;
  tracks: Array<CreativeTimelineTrack & { clips: CreativeTimelineClip[] }>;
};

/**
 * Multi-track timeline — tracks, clips, markers, zoom, snap.
 * Ripple editing is a future extension point.
 */
export interface TimelineService {
  getBundle(timelineId: string): Promise<CreativeServiceResult<TimelineBundle>>;

  getBundleByProject(
    projectId: string,
  ): Promise<CreativeServiceResult<TimelineBundle>>;

  updateTimeline(
    timelineId: string,
    patch: CreativeTimelineUpdate,
  ): Promise<CreativeServiceResult<CreativeTimeline>>;

  addTrack(
    timelineId: string,
    organizationId: string,
    input: Pick<CreativeTimelineTrackInsert, "kind" | "name" | "sort_order">,
  ): Promise<CreativeServiceResult<CreativeTimelineTrack>>;

  updateTrack(
    trackId: string,
    patch: Partial<
      Pick<
        CreativeTimelineTrack,
        "name" | "muted" | "locked" | "height" | "color" | "sort_order"
      >
    >,
  ): Promise<CreativeServiceResult<CreativeTimelineTrack>>;

  addClip(
    trackId: string,
    organizationId: string,
    input: Omit<
      CreativeTimelineClipInsert,
      "id" | "track_id" | "organization_id" | "created_at" | "updated_at"
    >,
  ): Promise<CreativeServiceResult<CreativeTimelineClip>>;

  updateClip(
    clipId: string,
    patch: CreativeTimelineClipUpdate,
  ): Promise<CreativeServiceResult<CreativeTimelineClip>>;

  moveClip(
    clipId: string,
    trackId: string,
    startMs: number,
  ): Promise<CreativeServiceResult<CreativeTimelineClip>>;

  trimClip(
    clipId: string,
    trim: Pick<ClipTransform, "startMs" | "endMs" | "speed">,
  ): Promise<CreativeServiceResult<CreativeTimelineClip>>;

  softDeleteClip(
    clipId: string,
  ): Promise<CreativeServiceResult<CreativeTimelineClip>>;

  addMarker(
    trackId: string,
    organizationId: string,
    startMs: number,
    label: string,
  ): Promise<CreativeServiceResult<CreativeTimelineClip>>;

  ensureDefaultTracks(
    timelineId: string,
    organizationId: string,
  ): Promise<CreativeServiceResult<CreativeTimelineTrack[]>>;
}

export type { CreativeTrackKind };
