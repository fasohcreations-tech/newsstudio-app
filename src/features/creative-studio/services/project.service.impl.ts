import type { SupabaseClient } from "@supabase/supabase-js";

import {
  DEFAULT_FRAME_RATE,
  DEFAULT_RESOLUTION,
  DEFAULT_TIMELINE_DURATION_MS,
} from "@/features/creative-studio/constants/creative-studio.constants";
import {
  DEFAULT_ENTERPRISE_TRACKS,
  ENTERPRISE_TRACK_COLORS,
} from "@/features/creative-studio/constants/timeline-engine.constants";
import type {
  CreateProjectInput,
  ProjectService,
} from "@/features/creative-studio/services/interfaces/project.service";
import type {
  CreativeProject,
  CreativeProjectListFilters,
  CreativeProjectUpdate,
  CreativeProjectWithTimeline,
  CreativeServiceResult,
  CreativeTimeline,
  CreativeTimelineClip,
  CreativeTimelineTrack,
} from "@/features/creative-studio/types/creative-studio.types";

type Client = SupabaseClient;

/** Base Creative Studio columns (migration 000013). */
const CREATIVE_PROJECT_SELECT =
  "id, organization_id, story_id, title, description, status, frame_rate, resolution_width, resolution_height, duration_ms, thumbnail_url, settings, metadata, created_by, updated_by, created_at, updated_at, deleted_at";

const CREATIVE_TIMELINE_SELECT_BASE =
  "id, organization_id, project_id, title, duration_ms, zoom_level, snap_enabled, playhead_ms, metadata, created_at, updated_at";

/** Includes Module 3.1 timeline engine columns (migration 000014). */
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

export class SupabaseProjectService implements ProjectService {
  constructor(private client: Client) {}

  async list(
    organizationId: string,
    filters: CreativeProjectListFilters = {},
  ): Promise<CreativeServiceResult<CreativeProject[]>> {
    let query = this.client
      .from("creative_studio_projects")
      .select(CREATIVE_PROJECT_SELECT)
      .eq("organization_id", organizationId)
      .order("updated_at", { ascending: false });

    if (!filters.includeDeleted) query = query.is("deleted_at", null);
    if (!filters.includeArchived) query = query.neq("status", "archived");
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.storyId) query = query.eq("story_id", filters.storyId);
    if (filters.search?.trim()) {
      query = query.ilike("title", `%${filters.search.trim()}%`);
    }

    const { data, error } = await query;
    if (error) return fail(error.message);
    return ok((data ?? []) as CreativeProject[]);
  }

  async get(projectId: string): Promise<CreativeServiceResult<CreativeProject>> {
    const { data, error } = await this.client
      .from("creative_studio_projects")
      .select(CREATIVE_PROJECT_SELECT)
      .eq("id", projectId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) return fail(error.message);
    if (!data) return fail("Project not found.");
    return ok(data as CreativeProject);
  }

  async getWithTimeline(
    projectId: string,
  ): Promise<CreativeServiceResult<CreativeProjectWithTimeline>> {
    const projectResult = await this.get(projectId);
    if (!projectResult.data) return fail(projectResult.error ?? "Not found");

    let timelineSelect = CREATIVE_TIMELINE_SELECT;
    let { data: timeline, error: tlError } = await this.client
      .from("creative_studio_timelines")
      .select(timelineSelect)
      .eq("project_id", projectId)
      .maybeSingle();

    // Fallback when Module 3.1 columns are not applied yet.
    if (tlError && isMissingColumnError(tlError.message)) {
      timelineSelect = CREATIVE_TIMELINE_SELECT_BASE;
      ({ data: timeline, error: tlError } = await this.client
        .from("creative_studio_timelines")
        .select(timelineSelect)
        .eq("project_id", projectId)
        .maybeSingle());
    }

    if (tlError) return fail(tlError.message);
    if (!timeline) {
      return ok({
        ...projectResult.data,
        timeline: null,
        tracks: [],
      });
    }

    let trackSelect = CREATIVE_TRACK_SELECT;
    let { data: tracks, error: trackError } = await this.client
      .from("creative_studio_timeline_tracks")
      .select(trackSelect)
      .eq("timeline_id", timeline.id)
      .order("sort_order", { ascending: true });

    if (trackError && isMissingColumnError(trackError.message)) {
      trackSelect = CREATIVE_TRACK_SELECT_BASE;
      ({ data: tracks, error: trackError } = await this.client
        .from("creative_studio_timeline_tracks")
        .select(trackSelect)
        .eq("timeline_id", timeline.id)
        .order("sort_order", { ascending: true }));
    }

    if (trackError) return fail(trackError.message);

    const trackRows = (tracks ?? []) as CreativeTimelineTrack[];
    const trackIds = trackRows.map((t) => t.id);
    let clips: CreativeTimelineClip[] = [];

    if (trackIds.length > 0) {
      let clipSelect = CREATIVE_CLIP_SELECT;
      let { data: clipRows, error: clipError } = await this.client
        .from("creative_studio_timeline_clips")
        .select(clipSelect)
        .in("track_id", trackIds)
        .is("deleted_at", null)
        .order("start_ms", { ascending: true });

      if (clipError && isMissingColumnError(clipError.message)) {
        clipSelect = CREATIVE_CLIP_SELECT_BASE;
        ({ data: clipRows, error: clipError } = await this.client
          .from("creative_studio_timeline_clips")
          .select(clipSelect)
          .in("track_id", trackIds)
          .is("deleted_at", null)
          .order("start_ms", { ascending: true }));
      }

      if (clipError) return fail(clipError.message);
      clips = (clipRows ?? []) as CreativeTimelineClip[];
    }

    return ok({
      ...projectResult.data,
      timeline: timeline as CreativeTimeline,
      tracks: trackRows.map((track) => ({
        ...track,
        clips: clips.filter((c) => c.track_id === track.id),
      })),
    });
  }

  async create(
    input: CreateProjectInput,
  ): Promise<CreativeServiceResult<CreativeProject>> {
    const { data: project, error } = await this.client
      .from("creative_studio_projects")
      .insert({
        organization_id: input.organizationId,
        story_id: input.storyId ?? null,
        title: input.title.trim(),
        description: input.description?.trim() ?? "",
        status: "draft",
        frame_rate: input.frameRate ?? DEFAULT_FRAME_RATE,
        resolution_width: input.resolutionWidth ?? DEFAULT_RESOLUTION.width,
        resolution_height: input.resolutionHeight ?? DEFAULT_RESOLUTION.height,
        duration_ms: 0,
        created_by: input.userId,
        updated_by: input.userId,
      })
      .select(CREATIVE_PROJECT_SELECT)
      .single();

    if (error || !project) return fail(error?.message ?? "Create failed");

    const timelineInsert = await this.client
      .from("creative_studio_timelines")
      .insert({
        organization_id: input.organizationId,
        project_id: project.id,
        title: "Main Timeline",
        duration_ms: DEFAULT_TIMELINE_DURATION_MS,
      })
      .select(CREATIVE_TIMELINE_SELECT)
      .single();

    if (!timelineInsert.error && timelineInsert.data) {
      const timelineId = timelineInsert.data.id;
      await this.client.from("creative_studio_timeline_tracks").insert(
        DEFAULT_ENTERPRISE_TRACKS.map((t, i) => ({
          organization_id: input.organizationId,
          timeline_id: timelineId,
          kind: t.kind,
          name: t.name,
          sort_order: i,
          color: ENTERPRISE_TRACK_COLORS[t.kind],
        })),
      );
    }

    return ok(project as CreativeProject);
  }

  async update(
    projectId: string,
    patch: CreativeProjectUpdate,
    userId: string,
  ): Promise<CreativeServiceResult<CreativeProject>> {
    const { data, error } = await this.client
      .from("creative_studio_projects")
      .update({ ...patch, updated_by: userId })
      .eq("id", projectId)
      .is("deleted_at", null)
      .select(CREATIVE_PROJECT_SELECT)
      .single();

    if (error || !data) return fail(error?.message ?? "Update failed");
    return ok(data as CreativeProject);
  }

  async duplicate(
    projectId: string,
    userId: string,
    title?: string,
  ): Promise<CreativeServiceResult<CreativeProject>> {
    const bundle = await this.getWithTimeline(projectId);
    if (!bundle.data) return fail(bundle.error ?? "Not found");

    const src = bundle.data;
    const createResult = await this.create({
      organizationId: src.organization_id,
      userId,
      title: title ?? `${src.title} (Copy)`,
      description: src.description,
      storyId: src.story_id,
      frameRate: Number(src.frame_rate),
      resolutionWidth: src.resolution_width,
      resolutionHeight: src.resolution_height,
    });

    if (!createResult.data) return fail(createResult.error ?? "Duplicate failed");

    const newBundle = await this.getWithTimeline(createResult.data.id);
    if (!newBundle.data?.timeline || !src.timeline) {
      return createResult;
    }

    const trackMap = new Map<string, string>();
    for (let i = 0; i < src.tracks.length; i++) {
      const newTrack = newBundle.data.tracks[i];
      if (newTrack) trackMap.set(src.tracks[i]!.id, newTrack.id);
    }

    const clipRows = src.tracks.flatMap((track) =>
      track.clips.map((clip) => ({
        organization_id: src.organization_id,
        track_id: trackMap.get(clip.track_id) ?? clip.track_id,
        media_asset_id: clip.media_asset_id,
        template_id: clip.template_id,
        name: clip.name,
        clip_kind: clip.clip_kind,
        start_ms: clip.start_ms,
        end_ms: clip.end_ms,
        trim_start_ms: clip.trim_start_ms,
        trim_end_ms: clip.trim_end_ms,
        position_x: clip.position_x,
        position_y: clip.position_y,
        scale: clip.scale,
        rotation: clip.rotation,
        opacity: clip.opacity,
        volume: clip.volume,
        speed: clip.speed,
        sort_order: clip.sort_order,
        metadata: clip.metadata,
      })),
    );

    if (clipRows.length > 0) {
      await this.client.from("creative_studio_timeline_clips").insert(clipRows);
    }

    return createResult;
  }

  async archive(
    projectId: string,
    userId: string,
  ): Promise<CreativeServiceResult<CreativeProject>> {
    return this.update(projectId, { status: "archived" }, userId);
  }

  async softDelete(
    projectId: string,
    userId: string,
  ): Promise<CreativeServiceResult<CreativeProject>> {
    return this.update(
      projectId,
      { deleted_at: new Date().toISOString(), updated_by: userId },
      userId,
    );
  }
}

export function createProjectService(client: Client): ProjectService {
  return new SupabaseProjectService(client);
}
