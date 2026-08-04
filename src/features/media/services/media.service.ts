import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, MediaFileType } from "@/shared/types/database.types";
import type {
  MediaAssetWithMeta,
  MediaFolder,
  MediaListFilters,
  MediaListResult,
} from "@/features/media/types/media.types";
import { MEDIA_PAGE_SIZE } from "@/features/media/constants/media.constants";
import type {
  MediaFolderCreateInput,
  MediaMoveInput,
  MediaRenameInput,
  StoryMediaAttachInput,
} from "@/features/media/schemas/media.schemas";

type Client = SupabaseClient<Database>;

const ASSET_SELECT = `
  id,
  organization_id,
  folder_id,
  name,
  original_filename,
  storage_bucket,
  storage_path,
  file_type,
  mime_type,
  file_size,
  width,
  height,
  duration_seconds,
  checksum,
  external_url,
  source_provider,
  created_by,
  updated_by,
  created_at,
  updated_at,
  deleted_at,
  folder:media_folders(id, name),
  story_links:story_media(
    id,
    story_id,
    label,
    deleted_at,
    story:stories(id, title)
  )
`;

const FOLDER_SELECT =
  "id, organization_id, parent_id, name, created_by, created_at, updated_at, deleted_at";

export async function listMediaFolders(
  client: Client,
  organizationId: string,
  parentId: string | null = null,
): Promise<{ folders: MediaFolder[]; error: string | null }> {
  let query = client
    .from("media_folders")
    .select(FOLDER_SELECT)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (parentId) {
    query = query.eq("parent_id", parentId);
  } else {
    query = query.is("parent_id", null);
  }

  const { data, error } = await query;
  if (error) return { folders: [], error: error.message };
  return { folders: data ?? [], error: null };
}

export async function listAllMediaFolders(
  client: Client,
  organizationId: string,
): Promise<{ folders: MediaFolder[]; error: string | null }> {
  const { data, error } = await client
    .from("media_folders")
    .select(FOLDER_SELECT)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (error) return { folders: [], error: error.message };
  return { folders: data ?? [], error: null };
}

export async function listMediaAssets(
  client: Client,
  filters: MediaListFilters,
): Promise<{ data: MediaListResult | null; error: string | null }> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = filters.pageSize ?? MEDIA_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = client
    .from("media_assets")
    .select(ASSET_SELECT, { count: "exact" })
    .eq("organization_id", filters.organizationId);

  if (filters.includeDeleted) {
    query = query.not("deleted_at", "is", null);
  } else {
    query = query.is("deleted_at", null);
  }

  if (filters.folderId) {
    query = query.eq("folder_id", filters.folderId);
  } else if (
    !filters.includeDeleted &&
    !filters.storyId &&
    !filters.search?.trim() &&
    !filters.includeAllFolders
  ) {
    query = query.is("folder_id", null);
  }

  if (filters.fileType && filters.fileType !== "all") {
    query = query.eq("file_type", filters.fileType);
  }

  if (filters.search?.trim()) {
    const term = filters.search
      .trim()
      .replace(/[%_,]/g, " ")
      .replace(/\s+/g, " ")
      .slice(0, 100);
    if (term) {
      query = query.or(
        `name.ilike.%${term}%,original_filename.ilike.%${term}%`,
      );
    }
  }

  if (filters.storyId) {
    const { data: links, error: linkError } = await client
      .from("story_media")
      .select("media_asset_id")
      .eq("story_id", filters.storyId)
      .is("deleted_at", null);

    if (linkError) {
      return { data: null, error: linkError.message };
    }

    const ids = (links ?? []).map((row) => row.media_asset_id);
    if (ids.length === 0) {
      const foldersResult = await listMediaFolders(
        client,
        filters.organizationId,
        filters.folderId ?? null,
      );
      return {
        data: {
          assets: [],
          folders: foldersResult.folders,
          total: 0,
          page,
          pageSize,
        },
        error: null,
      };
    }
    query = query.in("id", ids);
  }

  query = query.order("updated_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) return { data: null, error: error.message };

  const foldersResult = filters.includeDeleted
    ? { folders: [] as MediaFolder[], error: null }
    : await listMediaFolders(
        client,
        filters.organizationId,
        filters.folderId ?? null,
      );

  const assets = ((data ?? []) as unknown as MediaAssetWithMeta[]).map(
    (asset) => ({
      ...asset,
      story_links: (asset.story_links ?? []).filter((link) => !link.deleted_at),
    }),
  );

  return {
    data: {
      assets,
      folders: foldersResult.folders,
      total: count ?? 0,
      page,
      pageSize,
      },
    error: null,
  };
}

export async function getMediaAssetById(
  client: Client,
  assetId: string,
): Promise<{ asset: MediaAssetWithMeta | null; error: string | null }> {
  const { data, error } = await client
    .from("media_assets")
    .select(ASSET_SELECT)
    .eq("id", assetId)
    .maybeSingle();

  if (error) return { asset: null, error: error.message };

  if (!data) return { asset: null, error: null };

  const asset = data as unknown as MediaAssetWithMeta;
  return {
    asset: {
      ...asset,
      story_links: (asset.story_links ?? []).filter((link) => !link.deleted_at),
    },
    error: null,
  };
}

export async function createMediaFolder(
  client: Client,
  userId: string,
  input: MediaFolderCreateInput,
): Promise<{ folder: MediaFolder | null; error: string | null }> {
  const { data, error } = await client
    .from("media_folders")
    .insert({
      organization_id: input.organizationId,
      parent_id: input.parentId ?? null,
      name: input.name.trim(),
      created_by: userId,
    })
    .select(FOLDER_SELECT)
    .single();

  if (error) return { folder: null, error: error.message };
  return { folder: data, error: null };
}

export async function renameMediaAsset(
  client: Client,
  assetId: string,
  userId: string,
  input: MediaRenameInput,
): Promise<{ error: string | null }> {
  const { error } = await client
    .from("media_assets")
    .update({ name: input.name.trim(), updated_by: userId })
    .eq("id", assetId)
    .is("deleted_at", null);

  return { error: error?.message ?? null };
}

export async function moveMediaAsset(
  client: Client,
  assetId: string,
  userId: string,
  input: MediaMoveInput,
): Promise<{ error: string | null }> {
  const { error } = await client
    .from("media_assets")
    .update({ folder_id: input.folderId, updated_by: userId })
    .eq("id", assetId)
    .is("deleted_at", null);

  return { error: error?.message ?? null };
}

export async function softDeleteMediaAsset(
  client: Client,
  assetId: string,
  userId: string,
): Promise<{ error: string | null }> {
  const { error } = await client
    .from("media_assets")
    .update({
      deleted_at: new Date().toISOString(),
      updated_by: userId,
    })
    .eq("id", assetId)
    .is("deleted_at", null);

  return { error: error?.message ?? null };
}

export async function restoreMediaAsset(
  client: Client,
  assetId: string,
  userId: string,
): Promise<{ error: string | null }> {
  const { error } = await client
    .from("media_assets")
    .update({
      deleted_at: null,
      updated_by: userId,
    })
    .eq("id", assetId)
    .not("deleted_at", "is", null);

  return { error: error?.message ?? null };
}

export async function softDeleteMediaFolder(
  client: Client,
  folderId: string,
): Promise<{ error: string | null }> {
  const { error } = await client
    .from("media_folders")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", folderId)
    .is("deleted_at", null);

  return { error: error?.message ?? null };
}

export async function attachAssetToStory(
  client: Client,
  userId: string,
  input: StoryMediaAttachInput,
): Promise<{ error: string | null }> {
  const { error } = await client.from("story_media").insert({
    organization_id: input.organizationId,
    story_id: input.storyId,
    media_asset_id: input.mediaAssetId,
    label: input.label?.trim() || null,
    created_by: userId,
  });

  return { error: error?.message ?? null };
}

export async function detachAssetFromStory(
  client: Client,
  storyMediaId: string,
): Promise<{ error: string | null }> {
  const { error } = await client
    .from("story_media")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", storyMediaId)
    .is("deleted_at", null);

  return { error: error?.message ?? null };
}

export async function listStoryAssets(
  client: Client,
  storyId: string,
): Promise<{ assets: MediaAssetWithMeta[]; error: string | null }> {
  const { data, error } = await client
    .from("story_media")
    .select(
      `
      id,
      label,
      sort_order,
      media_asset:media_assets(
        *,
        folder:media_folders(id, name)
      )
    `,
    )
    .eq("story_id", storyId)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });

  if (error) return { assets: [], error: error.message };

  const assets = (data ?? [])
    .map((row) => {
      const asset = row.media_asset as unknown as MediaAssetWithMeta | null;
      if (!asset || asset.deleted_at) return null;
      const mapped: MediaAssetWithMeta = {
        ...asset,
        story_links: [
          {
            id: row.id,
            story_id: storyId,
            label: row.label,
            story: null,
          },
        ],
      };
      return mapped;
    })
    .filter((asset): asset is MediaAssetWithMeta => asset !== null);

  return { assets, error: null };
}

export async function listOrganizationStories(
  client: Client,
  organizationId: string,
): Promise<{ stories: Array<{ id: string; title: string }>; error: string | null }> {
  const { data, error } = await client
    .from("stories")
    .select("id, title")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) return { stories: [], error: error.message };
  return { stories: data ?? [], error: null };
}

export type RegisterUploadedAssetInput = {
  organizationId: string;
  folderId?: string | null;
  name: string;
  originalFilename: string;
  storageBucket: Database["public"]["Enums"]["media_storage_scope"];
  storagePath: string;
  fileType: MediaFileType;
  mimeType: string;
  fileSize: number;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
};

export async function registerUploadedAsset(
  client: Client,
  userId: string,
  input: RegisterUploadedAssetInput,
): Promise<{ asset: MediaAssetWithMeta | null; error: string | null }> {
  const { data, error } = await client
    .from("media_assets")
    .insert({
      organization_id: input.organizationId,
      folder_id: input.folderId ?? null,
      name: input.name,
      original_filename: input.originalFilename,
      storage_bucket: input.storageBucket,
      storage_path: input.storagePath,
      file_type: input.fileType,
      mime_type: input.mimeType,
      file_size: input.fileSize,
      width: input.width ?? null,
      height: input.height ?? null,
      duration_seconds: input.durationSeconds ?? null,
      created_by: userId,
      updated_by: userId,
    })
    .select(ASSET_SELECT)
    .single();

  if (error) return { asset: null, error: error.message };
  return { asset: data as unknown as MediaAssetWithMeta, error: null };
}

type SignedUrlCacheEntry = {
  url: string;
  expiresAt: number;
};

const signedUrlCache = new Map<string, SignedUrlCacheEntry>();

export async function createSignedAssetUrl(
  client: Client,
  bucket: string,
  path: string,
  expiresIn = 3600,
): Promise<{ url: string | null; error: string | null }> {
  const cacheKey = `${bucket}:${path}`;
  const cached = signedUrlCache.get(cacheKey);
  // Refresh 60s before expiry so clients never receive a near-dead URL.
  if (cached && cached.expiresAt - 60_000 > Date.now()) {
    return { url: cached.url, error: null };
  }

  const { data, error } = await client.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) return { url: null, error: error.message };

  signedUrlCache.set(cacheKey, {
    url: data.signedUrl,
    expiresAt: Date.now() + expiresIn * 1000,
  });
  return { url: data.signedUrl, error: null };
}
