import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  ClipService,
  CreateClipInput,
} from "@/features/creative-studio/services/interfaces/clip.service";
import type {
  ClipPatch,
  EnterpriseTimelineClip,
} from "@/features/creative-studio/types/timeline-engine.types";
import type {
  CreativeServiceResult,
  CreativeTimelineClip,
} from "@/features/creative-studio/types/creative-studio.types";
import { createTimelineService } from "@/features/creative-studio/services/timeline.service.impl";

type Client = SupabaseClient;

function ok<T>(data: T): CreativeServiceResult<T> {
  return { data, error: null };
}

function fail<T>(error: string): CreativeServiceResult<T> {
  return { data: null, error };
}

function asEnterpriseClip(row: Record<string, unknown>): EnterpriseTimelineClip {
  const clip = row as unknown as CreativeTimelineClip;
  return {
    ...clip,
    locked: Boolean(row.locked ?? false),
    muted: Boolean(row.muted ?? false),
    hidden: Boolean(row.hidden ?? false),
    color_label: String(row.color_label ?? "default"),
    content_object_id: (row.content_object_id as string) ?? null,
    scene_id: (row.scene_id as string) ?? null,
    voice_segment_id: (row.voice_segment_id as string) ?? null,
    script_paragraph_id: (row.script_paragraph_id as string) ?? null,
    source_clip_id: (row.source_clip_id as string) ?? null,
  };
}

export class SupabaseClipService implements ClipService {
  constructor(private client: Client) {}

  async create(
    input: CreateClipInput,
  ): Promise<CreativeServiceResult<EnterpriseTimelineClip>> {
    const timeline = createTimelineService(this.client);
    const endMs = input.startMs + input.durationMs;
    const result = await timeline.addClip(input.trackId, input.organizationId, {
      name: input.name,
      clip_kind: input.clipKind,
      start_ms: input.startMs,
      end_ms: endMs,
      trim_start_ms: 0,
      trim_end_ms: input.durationMs,
      position_x: 0,
      position_y: 0,
      scale: 1,
      rotation: 0,
      opacity: 1,
      volume: 1,
      speed: 1,
      sort_order: 0,
      metadata: input.metadata ?? {},
      media_asset_id: input.mediaAssetId ?? null,
      template_id: null,
    });

    if (!result.data) {
      return fail<EnterpriseTimelineClip>(result.error ?? "Create failed");
    }

    if (input.colorLabel && input.colorLabel !== "default") {
      const { data } = await this.client
        .from("creative_studio_timeline_clips")
        .update({ color_label: input.colorLabel })
        .eq("id", result.data.id)
        .select("*")
        .single();
      if (data) {
        return ok(asEnterpriseClip(data as Record<string, unknown>));
      }
    }

    return ok(asEnterpriseClip(result.data as unknown as Record<string, unknown>));
  }

  async update(
    clipId: string,
    patch: ClipPatch,
  ): Promise<CreativeServiceResult<EnterpriseTimelineClip>> {
    const timeline = createTimelineService(this.client);
    const result = await timeline.updateClip(clipId, patch);
    if (!result.data) {
      return fail<EnterpriseTimelineClip>(result.error ?? "Update failed");
    }
    return ok(asEnterpriseClip(result.data as unknown as Record<string, unknown>));
  }

  async move(
    clipId: string,
    trackId: string,
    startMs: number,
  ): Promise<CreativeServiceResult<EnterpriseTimelineClip>> {
    const timeline = createTimelineService(this.client);
    const result = await timeline.moveClip(clipId, trackId, startMs);
    if (!result.data) {
      return fail<EnterpriseTimelineClip>(result.error ?? "Move failed");
    }
    return ok(asEnterpriseClip(result.data as unknown as Record<string, unknown>));
  }

  async trim(
    clipId: string,
    startMs: number,
    endMs: number,
  ): Promise<CreativeServiceResult<EnterpriseTimelineClip>> {
    const timeline = createTimelineService(this.client);
    const result = await timeline.trimClip(clipId, {
      startMs,
      endMs,
      speed: 1,
    });
    if (!result.data) {
      return fail<EnterpriseTimelineClip>(result.error ?? "Trim failed");
    }
    return ok(asEnterpriseClip(result.data as unknown as Record<string, unknown>));
  }

  async split(
    clipId: string,
    atMs: number,
  ): Promise<CreativeServiceResult<EnterpriseTimelineClip[]>> {
    const { data: clip, error } = await this.client
      .from("creative_studio_timeline_clips")
      .select("*")
      .eq("id", clipId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error || !clip) {
      return fail<EnterpriseTimelineClip[]>(error?.message ?? "Clip not found");
    }
    if (atMs <= clip.start_ms || atMs >= clip.end_ms) {
      return fail<EnterpriseTimelineClip[]>(
        "Split point must be inside the clip.",
      );
    }

    const left = await this.trim(clipId, clip.start_ms, atMs);
    if (!left.data) {
      return fail<EnterpriseTimelineClip[]>(left.error ?? "Split failed");
    }

    const rightDuration = clip.end_ms - atMs;
    const right = await this.create({
      trackId: clip.track_id,
      organizationId: clip.organization_id,
      name: `${clip.name} (2)`,
      clipKind: clip.clip_kind,
      startMs: atMs,
      durationMs: rightDuration,
      mediaAssetId: clip.media_asset_id,
      metadata: { ...(clip.metadata as object), source_clip_id: clipId },
    });

    if (!right.data) {
      return fail<EnterpriseTimelineClip[]>(right.error ?? "Split failed");
    }
    return ok([left.data, right.data]);
  }

  async duplicate(
    clipId: string,
  ): Promise<CreativeServiceResult<EnterpriseTimelineClip>> {
    const { data: clip, error } = await this.client
      .from("creative_studio_timeline_clips")
      .select("*")
      .eq("id", clipId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error || !clip) {
      return fail<EnterpriseTimelineClip>(error?.message ?? "Clip not found");
    }

    const duration = clip.end_ms - clip.start_ms;
    const result = await this.create({
      trackId: clip.track_id,
      organizationId: clip.organization_id,
      name: `${clip.name} copy`,
      clipKind: clip.clip_kind,
      startMs: clip.end_ms + 100,
      durationMs: duration,
      mediaAssetId: clip.media_asset_id,
      metadata: clip.metadata as Record<string, unknown>,
    });

    if (!result.data) {
      return fail<EnterpriseTimelineClip>(result.error ?? "Duplicate failed");
    }

    const { data: linked } = await this.client
      .from("creative_studio_timeline_clips")
      .update({ source_clip_id: clipId })
      .eq("id", result.data.id)
      .select("*")
      .single();

    return ok(
      asEnterpriseClip(
        (linked ?? result.data) as unknown as Record<string, unknown>,
      ),
    );
  }

  async softDelete(
    clipId: string,
  ): Promise<CreativeServiceResult<EnterpriseTimelineClip>> {
    const timeline = createTimelineService(this.client);
    const result = await timeline.softDeleteClip(clipId);
    if (!result.data) {
      return fail<EnterpriseTimelineClip>(result.error ?? "Delete failed");
    }
    return ok(asEnterpriseClip(result.data as unknown as Record<string, unknown>));
  }

  async setLocked(clipId: string, locked: boolean) {
    return this.update(clipId, { locked });
  }

  async setMuted(clipId: string, muted: boolean) {
    return this.update(clipId, { muted });
  }

  async setHidden(clipId: string, hidden: boolean) {
    return this.update(clipId, { hidden });
  }
}

export function createClipService(client: Client): ClipService {
  return new SupabaseClipService(client);
}
