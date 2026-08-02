import type {
  ClipPatch,
  EnterpriseTimelineClip,
  EnterpriseTimelineTrack,
  EnterpriseTimelineTrackWithClips,
  TimelineLink,
  TimelineMarker,
  TrackPatch,
} from "@/features/creative-studio/types/timeline-engine.types";
import type { CreativeServiceResult } from "@/features/creative-studio/types/creative-studio.types";

/**
 * Track lifecycle — reorder, collapse, mute, lock, visibility.
 */
export interface TrackService {
  list(
    timelineId: string,
  ): Promise<CreativeServiceResult<EnterpriseTimelineTrackWithClips[]>>;

  add(
    timelineId: string,
    organizationId: string,
    input: Pick<EnterpriseTimelineTrack, "kind" | "name" | "sort_order">,
  ): Promise<CreativeServiceResult<EnterpriseTimelineTrack>>;

  update(
    trackId: string,
    patch: TrackPatch,
  ): Promise<CreativeServiceResult<EnterpriseTimelineTrack>>;

  reorder(
    timelineId: string,
    trackIds: string[],
  ): Promise<CreativeServiceResult<EnterpriseTimelineTrack[]>>;

  setHeight(
    trackId: string,
    height: number,
  ): Promise<CreativeServiceResult<EnterpriseTimelineTrack>>;
}

export type { TrackPatch };
