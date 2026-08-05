import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  RENDER_AUDIO,
  RENDER_STORAGE_BUCKET,
  VIDEO_EXPORT_RESOLUTIONS,
} from "@/features/video-render-export/constants/render.constants";
import { buildRenderPlan } from "@/features/video-render-export/lib/build-render-plan";
import { videoRenderDb } from "@/features/video-render-export/lib/video-render-db";
import type {
  CreateVideoRenderInput,
  VideoRenderProgressPatch,
  VideoRenderRow,
} from "@/features/video-render-export/types/render.types";
import { getTimelineBundle } from "@/features/story-timeline-assembly/services/timeline-assembly.service";
import { getStoryPackageByStoryId } from "@/features/story-scene-builder/services/story-package.service";
import { createSignedAssetUrl } from "@/features/media/services/media.service";
import {
  collectClipIds,
  collectLibraryAssetIds,
  resolveLibraryRefsInBindings,
} from "@/features/story-production/lib/library-media-reference";
import type { Database, Json } from "@/shared/types/database.types";

type Client = SupabaseClient<Database>;
type Result<T> = { data: T | null; error: string | null };

function ok<T>(data: T): Result<T> {
  return { data, error: null };
}
function fail<T>(error: string): Result<T> {
  return { data: null, error };
}

function asRender(row: Record<string, unknown>): VideoRenderRow {
  return {
    ...(row as unknown as VideoRenderRow),
    progress: Number(row.progress ?? 0),
    settings: (row.settings as Record<string, unknown>) ?? {},
    render_plan: (row.render_plan as VideoRenderRow["render_plan"]) ?? {
      version: 1,
      storyId: "",
      timelineId: "",
      durationMs: 0,
      width: 1920,
      height: 1080,
      frameRate: 30,
      format: "mp4",
      bitrateKbps: 8000,
      voiceUrl: null,
      musicUrl: null,
      clips: [],
      builtAt: new Date().toISOString(),
    },
  };
}

async function resolveMediaUrls(
  client: Client,
  bindings: Record<string, string>,
): Promise<Record<string, string>> {
  const assetIds = collectLibraryAssetIds(bindings);
  const clipIds = collectClipIds(bindings);
  const urlByAssetId: Record<string, string> = {};
  const urlByClipId: Record<string, string> = {};

  if (assetIds.length) {
    const { data: assets } = await client
      .from("media_assets")
      .select("id, storage_bucket, storage_path, external_url")
      .in("id", assetIds)
      .is("deleted_at", null);
    for (const asset of assets ?? []) {
      if (asset.external_url) {
        urlByAssetId[asset.id] = asset.external_url;
        continue;
      }
      const { url } = await createSignedAssetUrl(
        client,
        asset.storage_bucket,
        asset.storage_path,
        60 * 60,
      );
      if (url) urlByAssetId[asset.id] = url;
    }
  }

  if (clipIds.length) {
    const { data: clips } = await client
      .from("media_asset_clips")
      .select("id, parent_asset_id")
      .in("id", clipIds)
      .is("deleted_at", null);
    for (const clip of clips ?? []) {
      const assetId = clip.parent_asset_id as string;
      if (assetId && urlByAssetId[assetId]) {
        urlByClipId[clip.id as string] = urlByAssetId[assetId]!;
        continue;
      }
      if (assetId) {
        const { data: asset } = await client
          .from("media_assets")
          .select("storage_bucket, storage_path, external_url")
          .eq("id", assetId)
          .maybeSingle();
        if (asset?.external_url) {
          urlByClipId[clip.id as string] = asset.external_url;
        } else if (asset) {
          const { url } = await createSignedAssetUrl(
            client,
            asset.storage_bucket,
            asset.storage_path,
            60 * 60,
          );
          if (url) urlByClipId[clip.id as string] = url;
        }
      }
    }
  }

  return resolveLibraryRefsInBindings(bindings, urlByAssetId, urlByClipId);
}

export async function listVideoRenders(
  client: Client,
  organizationId: string,
  storyId: string,
): Promise<Result<VideoRenderRow[]>> {
  const db = videoRenderDb(client);
  const { data, error } = await db
    .from("story_video_renders")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("story_id", storyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) return fail(error.message);
  return ok((data ?? []).map((r: Record<string, unknown>) => asRender(r)));
}

export async function getVideoRender(
  client: Client,
  organizationId: string,
  renderId: string,
): Promise<Result<VideoRenderRow>> {
  const db = videoRenderDb(client);
  const { data, error } = await db
    .from("story_video_renders")
    .select("*")
    .eq("id", renderId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) return fail(error.message);
  if (!data) return fail("Render job not found");
  return ok(asRender(data as Record<string, unknown>));
}

/**
 * Create a queued render job with an immutable plan snapshot.
 * Does not mutate Timeline / Scenes / Masters / Story.
 */
export async function createVideoRenderJob(
  client: Client,
  input: CreateVideoRenderInput & {
    organizationId: string;
    userId: string;
    voiceUrl: string | null;
  },
): Promise<Result<VideoRenderRow>> {
  const bundle = await getTimelineBundle(
    client,
    input.organizationId,
    input.storyId,
  );
  if (bundle.error) return fail(bundle.error);
  if (!bundle.data) {
    return fail("Assemble a Timeline before exporting.");
  }
  if (bundle.data.timeline.status !== "ready") {
    return fail(
      `Timeline status is “${bundle.data.timeline.status}”. Ready timeline required.`,
    );
  }

  const pkg = await getStoryPackageByStoryId(client, input.storyId);
  if (pkg.error || !pkg.data) {
    return fail(pkg.error ?? "Scene Collection required for export.");
  }

  const res = VIDEO_EXPORT_RESOLUTIONS.find(
    (r) => r.id === input.settings.resolution,
  );
  if (!res?.ready) {
    return fail("Selected resolution is not available yet.");
  }

  const resolvedMedia: Record<
    string,
    {
      videoUrl: string | null;
      imageUrl: string | null;
      logoUrl: string | null;
      advertisementUrl: string | null;
    }
  > = {};

  for (const scene of pkg.data.scenes) {
    const bindings: Record<string, string> = {};
    if (scene.video_asset_ref) bindings.main_video = scene.video_asset_ref;
    if (scene.image_asset_ref) bindings.main_image = scene.image_asset_ref;
    if (scene.logo_ref) bindings.logo = scene.logo_ref;
    if (scene.advertisement_ref) bindings.advertisement = scene.advertisement_ref;
    const urls = await resolveMediaUrls(client, bindings);
    resolvedMedia[scene.id] = {
      videoUrl: urls.main_video?.trim() || null,
      imageUrl: urls.main_image?.trim() || null,
      logoUrl: urls.logo?.trim() || null,
      advertisementUrl: urls.advertisement?.trim() || null,
    };
  }

  const plan = buildRenderPlan({
    storyId: input.storyId,
    bundle: bundle.data,
    scenes: pkg.data.scenes,
    settings: input.settings,
    resolvedMedia,
    voiceUrl: input.voiceUrl,
    musicUrl: null,
  });

  if (plan.clips.length === 0) {
    return fail("Timeline has no scene clips to render.");
  }

  const videoCodec =
    input.settings.format === "webm" ? "vp9" : "h264";

  const db = videoRenderDb(client);
  const { data, error } = await db
    .from("story_video_renders")
    .insert({
      organization_id: input.organizationId,
      story_id: input.storyId,
      timeline_id: bundle.data.timeline.id,
      status: "queued",
      progress: 0,
      format: input.settings.format,
      resolution_width: res.width,
      resolution_height: res.height,
      frame_rate: input.settings.frameRate,
      bitrate_kbps: input.settings.bitrateKbps,
      audio_codec: RENDER_AUDIO.codec,
      audio_channels: RENDER_AUDIO.channels,
      audio_sample_rate: RENDER_AUDIO.sampleRate,
      video_codec: videoCodec,
      settings: input.settings as unknown as Json,
      render_plan: plan as unknown as Json,
      created_by: input.userId,
      updated_by: input.userId,
    })
    .select("*")
    .single();

  if (error || !data) return fail(error?.message ?? "Failed to enqueue render");
  return ok(asRender(data as Record<string, unknown>));
}

export async function updateVideoRenderProgress(
  client: Client,
  organizationId: string,
  userId: string,
  patch: VideoRenderProgressPatch,
): Promise<Result<VideoRenderRow>> {
  const updates: Record<string, unknown> = {
    updated_by: userId,
  };
  if (patch.status !== undefined) updates.status = patch.status;
  if (patch.progress !== undefined) updates.progress = patch.progress;
  if (patch.elapsedMs !== undefined) updates.elapsed_ms = patch.elapsedMs;
  if (patch.etaMs !== undefined) updates.eta_ms = patch.etaMs;
  if (patch.error !== undefined) updates.error = patch.error;
  if (patch.outputBucket !== undefined) updates.output_bucket = patch.outputBucket;
  if (patch.outputPath !== undefined) updates.output_path = patch.outputPath;
  if (patch.outputUrl !== undefined) updates.output_url = patch.outputUrl;
  if (patch.thumbnailPath !== undefined) {
    updates.thumbnail_path = patch.thumbnailPath;
  }
  if (patch.thumbnailUrl !== undefined) updates.thumbnail_url = patch.thumbnailUrl;
  if (patch.durationMs !== undefined) updates.duration_ms = patch.durationMs;
  if (patch.fileSizeBytes !== undefined) {
    updates.file_size_bytes = patch.fileSizeBytes;
  }
  if (patch.videoCodec !== undefined) updates.video_codec = patch.videoCodec;

  if (patch.status === "preparing") {
    updates.started_at = new Date().toISOString();
  }
  if (
    patch.finished ||
    patch.status === "succeeded" ||
    patch.status === "failed" ||
    patch.status === "cancelled"
  ) {
    updates.finished_at = new Date().toISOString();
  }

  const db = videoRenderDb(client);
  const { data, error } = await db
    .from("story_video_renders")
    .update(updates)
    .eq("id", patch.renderId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .select("*")
    .maybeSingle();

  if (error) return fail(error.message);
  if (!data) return fail("Render job not found");
  return ok(asRender(data as Record<string, unknown>));
}

export async function cancelVideoRender(
  client: Client,
  organizationId: string,
  userId: string,
  renderId: string,
): Promise<Result<VideoRenderRow>> {
  return updateVideoRenderProgress(client, organizationId, userId, {
    renderId,
    status: "cancelled",
    progress: 0,
    error: "Cancelled by user",
    finished: true,
  });
}

/**
 * Remove render jobs for a story from the queue.
 * Uses hard delete — soft-delete UPDATE fails under RLS when setting deleted_at
 * (WITH CHECK inherited `deleted_at is null`).
 */
export async function clearVideoRenders(
  client: Client,
  organizationId: string,
  storyId: string,
  options?: {
    finishedOnly?: boolean;
    /** Keep these jobs (e.g. the one currently encoding). */
    excludeIds?: string[];
  },
): Promise<Result<{ cleared: number; renderIds: string[] }>> {
  const db = videoRenderDb(client);
  const { data, error } = await db
    .from("story_video_renders")
    .select("id, status")
    .eq("organization_id", organizationId)
    .eq("story_id", storyId)
    .is("deleted_at", null);

  if (error) return fail(error.message);

  const rows = (data ?? []) as Array<{ id: string; status: string }>;
  const finished = new Set(["succeeded", "failed", "cancelled"]);
  const exclude = new Set(options?.excludeIds ?? []);
  const targets = rows.filter((r) => {
    if (exclude.has(r.id)) return false;
    if (options?.finishedOnly) return finished.has(r.status);
    return true;
  });
  const renderIds = targets.map((r) => r.id);
  if (renderIds.length === 0) {
    return ok({ cleared: 0, renderIds: [] });
  }

  const { error: deleteError } = await db
    .from("story_video_renders")
    .delete()
    .eq("organization_id", organizationId)
    .eq("story_id", storyId)
    .in("id", renderIds);

  if (deleteError) return fail(deleteError.message);
  return ok({ cleared: renderIds.length, renderIds });
}

export function buildRenderStoragePath(input: {
  organizationId: string;
  storyId: string;
  renderId: string;
  format: string;
}): { bucket: string; path: string } {
  const ext = input.format === "mov" ? "mov" : input.format === "webm" ? "webm" : "mp4";
  return {
    bucket: RENDER_STORAGE_BUCKET,
    path: `${input.organizationId}/renders/${input.storyId}/${input.renderId}.${ext}`,
  };
}
