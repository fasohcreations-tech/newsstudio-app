import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  AssetClipCreateInput,
  AssetClipUpdateInput,
} from "@/features/asset-clip-editor/schemas/clip.schemas";
import type {
  MediaAssetClipWithParent,
} from "@/features/asset-clip-editor/types/clip.types";
import { extractYouTubeVideoId } from "@/features/asset-clip-editor/lib/timecode";
import { registerUploadedAsset } from "@/features/media/services/media.service";
import type { Database } from "@/shared/types/database.types";

type Client = SupabaseClient<Database>;

const CLIP_SELECT = `
  id,
  organization_id,
  parent_asset_id,
  name,
  notes,
  tags,
  in_point_ms,
  out_point_ms,
  duration_ms,
  frame_rate,
  width,
  height,
  thumbnail_url,
  poster_storage_bucket,
  poster_storage_path,
  proxy_storage_bucket,
  proxy_storage_path,
  audio_extracted,
  metadata,
  created_by,
  updated_by,
  created_at,
  updated_at,
  deleted_at,
  parent_asset:media_assets!media_asset_clips_parent_asset_id_fkey(
    id,
    name,
    file_type,
    mime_type,
    storage_bucket,
    storage_path,
    duration_seconds,
    width,
    height,
    external_url,
    source_provider
  )
`;

function mapClip(row: Record<string, unknown>): MediaAssetClipWithParent {
  const raw = row.parent_asset;
  const parent = Array.isArray(raw) ? raw[0] ?? null : raw ?? null;
  return {
    id: row.id as string,
    organization_id: row.organization_id as string,
    parent_asset_id: row.parent_asset_id as string,
    name: row.name as string,
    notes: (row.notes as string | null) ?? null,
    tags: (row.tags as string[]) ?? [],
    in_point_ms: row.in_point_ms as number,
    out_point_ms: row.out_point_ms as number,
    duration_ms: row.duration_ms as number,
    frame_rate: Number(row.frame_rate ?? 30),
    width: (row.width as number | null) ?? null,
    height: (row.height as number | null) ?? null,
    thumbnail_url: (row.thumbnail_url as string | null) ?? null,
    poster_storage_bucket: (row.poster_storage_bucket as string | null) ?? null,
    poster_storage_path: (row.poster_storage_path as string | null) ?? null,
    proxy_storage_bucket: (row.proxy_storage_bucket as string | null) ?? null,
    proxy_storage_path: (row.proxy_storage_path as string | null) ?? null,
    audio_extracted: Boolean(row.audio_extracted),
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    created_by: row.created_by as string,
    updated_by: (row.updated_by as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    deleted_at: (row.deleted_at as string | null) ?? null,
    parent_asset: parent
      ? {
          id: (parent as { id: string }).id,
          name: (parent as { name: string }).name,
          file_type: (parent as { file_type: string }).file_type,
          mime_type: (parent as { mime_type: string }).mime_type,
          storage_bucket: (parent as { storage_bucket: string }).storage_bucket,
          storage_path: (parent as { storage_path: string }).storage_path,
          duration_seconds:
            (parent as { duration_seconds: number | null }).duration_seconds ??
            null,
          width: (parent as { width: number | null }).width ?? null,
          height: (parent as { height: number | null }).height ?? null,
          external_url:
            (parent as { external_url: string | null }).external_url ?? null,
          source_provider:
            (parent as { source_provider: string | null }).source_provider ??
            null,
        }
      : null,
  };
}

export async function listAssetClips(
  client: Client,
  organizationId: string,
  parentAssetId?: string,
): Promise<{ clips: MediaAssetClipWithParent[]; error: string | null }> {
  let query = client
    .from("media_asset_clips")
    .select(CLIP_SELECT)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (parentAssetId) {
    query = query.eq("parent_asset_id", parentAssetId);
  }

  const { data, error } = await query;
  if (error) return { clips: [], error: error.message };
  return {
    clips: (data ?? []).map((row) => mapClip(row as Record<string, unknown>)),
    error: null,
  };
}

export async function getAssetClipById(
  client: Client,
  organizationId: string,
  clipId: string,
): Promise<{ clip: MediaAssetClipWithParent | null; error: string | null }> {
  const { data, error } = await client
    .from("media_asset_clips")
    .select(CLIP_SELECT)
    .eq("organization_id", organizationId)
    .eq("id", clipId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) return { clip: null, error: error.message };
  if (!data) return { clip: null, error: "Clip not found." };
  return { clip: mapClip(data as Record<string, unknown>), error: null };
}

export async function createAssetClip(
  client: Client,
  organizationId: string,
  userId: string,
  input: AssetClipCreateInput,
): Promise<{ clip: MediaAssetClipWithParent | null; error: string | null }> {
  const { data: parent, error: parentError } = await client
    .from("media_assets")
    .select("id, duration_seconds, width, height, name")
    .eq("organization_id", organizationId)
    .eq("id", input.parentAssetId)
    .is("deleted_at", null)
    .maybeSingle();

  if (parentError) return { clip: null, error: parentError.message };
  if (!parent) return { clip: null, error: "Parent media asset not found." };

  if (
    parent.duration_seconds != null &&
    input.outPointMs > Number(parent.duration_seconds) * 1000 + 500
  ) {
    return { clip: null, error: "OUT point exceeds the source media duration." };
  }

  const durationMs = input.outPointMs - input.inPointMs;
  const thumbnail =
    input.thumbnailUrl && input.thumbnailUrl.length > 0
      ? input.thumbnailUrl
      : null;

  const { data, error } = await client
    .from("media_asset_clips")
    .insert({
      organization_id: organizationId,
      parent_asset_id: input.parentAssetId,
      name: input.name,
      notes: input.notes?.trim() ? input.notes.trim() : null,
      tags: input.tags ?? [],
      in_point_ms: input.inPointMs,
      out_point_ms: input.outPointMs,
      duration_ms: durationMs,
      frame_rate: input.frameRate ?? 30,
      width: input.width ?? parent.width,
      height: input.height ?? parent.height,
      thumbnail_url: thumbnail,
      metadata: input.metadata ?? {},
      created_by: userId,
      updated_by: userId,
    })
    .select(CLIP_SELECT)
    .single();

  if (error) return { clip: null, error: error.message };
  return { clip: mapClip(data as Record<string, unknown>), error: null };
}

export async function updateAssetClip(
  client: Client,
  organizationId: string,
  userId: string,
  clipId: string,
  input: AssetClipUpdateInput,
): Promise<{ clip: MediaAssetClipWithParent | null; error: string | null }> {
  const existing = await getAssetClipById(client, organizationId, clipId);
  if (existing.error || !existing.clip) {
    return { clip: null, error: existing.error ?? "Clip not found." };
  }

  const inPointMs = input.inPointMs ?? existing.clip.in_point_ms;
  const outPointMs = input.outPointMs ?? existing.clip.out_point_ms;
  if (outPointMs <= inPointMs) {
    return { clip: null, error: "OUT point must be after IN point." };
  }

  const patch: Database["public"]["Tables"]["media_asset_clips"]["Update"] = {
    updated_by: userId,
    in_point_ms: inPointMs,
    out_point_ms: outPointMs,
    duration_ms: outPointMs - inPointMs,
  };
  if (input.name != null) patch.name = input.name;
  if (input.notes !== undefined) {
    patch.notes = input.notes?.trim() ? input.notes.trim() : null;
  }
  if (input.tags != null) patch.tags = input.tags;
  if (input.frameRate != null) patch.frame_rate = input.frameRate;
  if (input.thumbnailUrl !== undefined) {
    patch.thumbnail_url =
      input.thumbnailUrl && input.thumbnailUrl.length > 0
        ? input.thumbnailUrl
        : null;
  }
  if (input.metadata != null) patch.metadata = input.metadata;

  const { data, error } = await client
    .from("media_asset_clips")
    .update(patch)
    .eq("id", clipId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .select(CLIP_SELECT)
    .single();

  if (error) return { clip: null, error: error.message };
  return { clip: mapClip(data as Record<string, unknown>), error: null };
}

export async function duplicateAssetClip(
  client: Client,
  organizationId: string,
  userId: string,
  clipId: string,
): Promise<{ clip: MediaAssetClipWithParent | null; error: string | null }> {
  const existing = await getAssetClipById(client, organizationId, clipId);
  if (!existing.clip) return { clip: null, error: existing.error ?? "Not found" };

  return createAssetClip(client, organizationId, userId, {
    parentAssetId: existing.clip.parent_asset_id,
    name: `${existing.clip.name} (copy)`,
    notes: existing.clip.notes,
    tags: existing.clip.tags,
    inPointMs: existing.clip.in_point_ms,
    outPointMs: existing.clip.out_point_ms,
    frameRate: existing.clip.frame_rate,
    thumbnailUrl: existing.clip.thumbnail_url ?? "",
    width: existing.clip.width,
    height: existing.clip.height,
    metadata: {
      ...existing.clip.metadata,
      duplicated_from: existing.clip.id,
    },
  });
}

export async function softDeleteAssetClip(
  client: Client,
  organizationId: string,
  userId: string,
  clipId: string,
): Promise<{ error: string | null }> {
  const { error } = await client
    .from("media_asset_clips")
    .update({
      deleted_at: new Date().toISOString(),
      updated_by: userId,
    })
    .eq("id", clipId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  return { error: error?.message ?? null };
}

/**
 * Register a YouTube URL as an external media_assets row (no Storage download).
 */
export async function importYoutubeAsAsset(
  client: Client,
  organizationId: string,
  userId: string,
  url: string,
  name?: string,
): Promise<{ assetId: string | null; error: string | null }> {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    return { assetId: null, error: "Invalid YouTube URL." };
  }

  const pageUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const thumb = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  const displayName = name?.trim() || `YouTube ${videoId}`;

  const registered = await registerUploadedAsset(client, userId, {
    organizationId,
    folderId: null,
    name: displayName,
    originalFilename: `youtube-${videoId}.url`,
    storageBucket: "temporary",
    storagePath: `external/youtube/${organizationId}/${videoId}`,
    fileType: "video",
    mimeType: "video/youtube",
    fileSize: 0,
    width: 1280,
    height: 720,
    durationSeconds: null,
  });

  if (registered.error || !registered.asset) {
    return {
      assetId: null,
      error: registered.error ?? "Could not register YouTube asset.",
    };
  }

  const { error: patchError } = await client
    .from("media_assets")
    .update({
      external_url: pageUrl,
      source_provider: "youtube",
      updated_by: userId,
      // stash thumb in checksum-unused? keep via metadata not available — use notes N/A
    })
    .eq("id", registered.asset.id);

  if (patchError) {
    return { assetId: null, error: patchError.message };
  }

  // Primary poster as clip_thumbnails later; store thumb URL on a synthetic field via update if we add thumbnail — use external for now
  void thumb;

  return { assetId: registered.asset.id, error: null };
}

export async function captureClipPoster(
  client: Client,
  organizationId: string,
  userId: string,
  clipId: string,
  input: { timecodeMs: number; publicUrl: string; setPrimary?: boolean },
): Promise<{ error: string | null }> {
  if (input.setPrimary) {
    await client
      .from("clip_thumbnails")
      .update({ is_primary: false })
      .eq("clip_id", clipId)
      .eq("organization_id", organizationId);
  }

  const { error } = await client.from("clip_thumbnails").insert({
    organization_id: organizationId,
    clip_id: clipId,
    kind: "capture",
    timecode_ms: input.timecodeMs,
    public_url: input.publicUrl,
    is_primary: input.setPrimary ?? true,
    created_by: userId,
  });

  if (error) return { error: error.message };

  if (input.setPrimary !== false) {
    await client
      .from("media_asset_clips")
      .update({
        thumbnail_url: input.publicUrl,
        updated_by: userId,
      })
      .eq("id", clipId)
      .eq("organization_id", organizationId);
  }

  return { error: null };
}

/** Mark audio extraction / proxy flags (actual media jobs can fill later). */
export async function markClipOperation(
  client: Client,
  organizationId: string,
  userId: string,
  clipId: string,
  operation: "extract_audio" | "create_proxy" | "generate_poster",
): Promise<{ error: string | null }> {
  const existing = await getAssetClipById(client, organizationId, clipId);
  if (!existing.clip) return { error: existing.error ?? "Not found" };

  const metadata = {
    ...existing.clip.metadata,
    operations: {
      ...((existing.clip.metadata.operations as Record<string, unknown>) ?? {}),
      [operation]: {
        requested_at: new Date().toISOString(),
        status: "queued",
      },
    },
  };

  const patch: Database["public"]["Tables"]["media_asset_clips"]["Update"] = {
    metadata,
    updated_by: userId,
  };
  if (operation === "extract_audio") patch.audio_extracted = true;

  const { error } = await client
    .from("media_asset_clips")
    .update(patch)
    .eq("id", clipId)
    .eq("organization_id", organizationId);

  return { error: error?.message ?? null };
}
