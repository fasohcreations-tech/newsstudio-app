import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  EnterpriseTimelineService,
  EnterpriseTimelineBundle,
} from "@/features/creative-studio/services/interfaces/enterprise-timeline.service";
import { createTimelineService } from "@/features/creative-studio/services/timeline.service.impl";
import type { CreativeServiceResult } from "@/features/creative-studio/types/creative-studio.types";
import type {
  EnterpriseTimeline,
  RippleMode,
  TimelineLink,
  TimelineMarker,
} from "@/features/creative-studio/types/timeline-engine.types";

type Client = SupabaseClient;

function ok<T>(data: T): CreativeServiceResult<T> {
  return { data, error: null };
}

function fail<T>(error: string): CreativeServiceResult<T> {
  return { data: null, error };
}

export class SupabaseEnterpriseTimelineService implements EnterpriseTimelineService {
  constructor(private client: Client) {}

  async getEnterpriseBundle(
    projectId: string,
  ): Promise<CreativeServiceResult<EnterpriseTimelineBundle>> {
    const bundle = await createTimelineService(this.client).getBundleByProject(
      projectId,
    );
    if (!bundle.data) {
      return fail<EnterpriseTimelineBundle>(bundle.error ?? "Load failed");
    }

    const timelineId = bundle.data.timeline.id;
    const [markersResult, linksResult] = await Promise.all([
      this.listMarkers(timelineId),
      this.listLinks(timelineId),
    ]);

    return ok({
      ...bundle.data,
      timeline: bundle.data.timeline as EnterpriseTimeline,
      markers: markersResult.data ?? [],
      links: linksResult.data ?? [],
    });
  }

  async listLinks(
    timelineId: string,
  ): Promise<CreativeServiceResult<TimelineLink[]>> {
    const { data, error } = await this.client
      .from("creative_studio_timeline_links")
      .select("*")
      .eq("timeline_id", timelineId)
      .order("created_at", { ascending: true });

    if (error) return fail<TimelineLink[]>(error.message);
    return ok((data ?? []) as TimelineLink[]);
  }

  async updateEnterpriseSettings(
    timelineId: string,
    patch: Partial<
      Pick<EnterpriseTimeline, "magnetic_enabled" | "ripple_mode" | "playhead_ms">
    >,
  ): Promise<CreativeServiceResult<EnterpriseTimeline>> {
    const { data, error } = await this.client
      .from("creative_studio_timelines")
      .update(patch)
      .eq("id", timelineId)
      .select("*")
      .single();

    if (error || !data) {
      return fail<EnterpriseTimeline>(error?.message ?? "Update failed");
    }
    return ok(data as EnterpriseTimeline);
  }

  async listMarkers(
    timelineId: string,
  ): Promise<CreativeServiceResult<TimelineMarker[]>> {
    const { data, error } = await this.client
      .from("creative_studio_timeline_markers")
      .select("*")
      .eq("timeline_id", timelineId)
      .order("start_ms", { ascending: true });

    if (error) return fail<TimelineMarker[]>(error.message);
    return ok((data ?? []) as TimelineMarker[]);
  }

  async addTimelineMarker(
    timelineId: string,
    organizationId: string,
    userId: string,
    startMs: number,
    label: string,
  ): Promise<CreativeServiceResult<TimelineMarker>> {
    const { data, error } = await this.client
      .from("creative_studio_timeline_markers")
      .insert({
        organization_id: organizationId,
        timeline_id: timelineId,
        start_ms: startMs,
        label,
        created_by: userId,
      })
      .select("*")
      .single();

    if (error || !data) {
      return fail<TimelineMarker>(error?.message ?? "Add marker failed");
    }
    return ok(data as TimelineMarker);
  }

  async setRippleMode(
    timelineId: string,
    mode: RippleMode,
  ): Promise<CreativeServiceResult<EnterpriseTimeline>> {
    return this.updateEnterpriseSettings(timelineId, { ripple_mode: mode });
  }
}

export function createEnterpriseTimelineService(
  client: Client,
): EnterpriseTimelineService {
  return new SupabaseEnterpriseTimelineService(client);
}
