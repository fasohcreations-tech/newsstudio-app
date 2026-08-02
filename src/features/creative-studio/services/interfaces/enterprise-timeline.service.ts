import type { CreativeServiceResult } from "@/features/creative-studio/types/creative-studio.types";
import type {
  EnterpriseTimeline,
  RippleMode,
  TimelineLink,
  TimelineMarker,
} from "@/features/creative-studio/types/timeline-engine.types";
import type { TimelineBundle } from "@/features/creative-studio/services/interfaces/timeline.service";

export type EnterpriseTimelineBundle = TimelineBundle & {
  markers: TimelineMarker[];
  links: TimelineLink[];
};

/**
 * Extended timeline document — markers, links, ripple/magnetic settings.
 */
export interface EnterpriseTimelineService {
  getEnterpriseBundle(
    projectId: string,
  ): Promise<CreativeServiceResult<EnterpriseTimelineBundle>>;

  updateEnterpriseSettings(
    timelineId: string,
    patch: Partial<
      Pick<EnterpriseTimeline, "magnetic_enabled" | "ripple_mode" | "playhead_ms">
    >,
  ): Promise<CreativeServiceResult<EnterpriseTimeline>>;

  listMarkers(
    timelineId: string,
  ): Promise<CreativeServiceResult<TimelineMarker[]>>;

  addTimelineMarker(
    timelineId: string,
    organizationId: string,
    userId: string,
    startMs: number,
    label: string,
  ): Promise<CreativeServiceResult<TimelineMarker>>;

  listLinks(
    timelineId: string,
  ): Promise<CreativeServiceResult<TimelineLink[]>>;

  setRippleMode(
    timelineId: string,
    mode: RippleMode,
  ): Promise<CreativeServiceResult<EnterpriseTimeline>>;
}

export type { TimelineBundle };
