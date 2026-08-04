export type AssetSourceProvider =
  | "local_upload"
  | "supabase_storage"
  | "media_library"
  | "youtube"
  | "web_search"
  | "other";

export type MediaAssetClipRow = {
  id: string;
  organization_id: string;
  parent_asset_id: string;
  name: string;
  notes: string | null;
  tags: string[];
  in_point_ms: number;
  out_point_ms: number;
  duration_ms: number;
  frame_rate: number;
  width: number | null;
  height: number | null;
  thumbnail_url: string | null;
  poster_storage_bucket: string | null;
  poster_storage_path: string | null;
  proxy_storage_bucket: string | null;
  proxy_storage_path: string | null;
  audio_extracted: boolean;
  metadata: Record<string, unknown>;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type MediaAssetClipWithParent = MediaAssetClipRow & {
  parent_asset: {
    id: string;
    name: string;
    file_type: string;
    mime_type: string;
    storage_bucket: string;
    storage_path: string;
    duration_seconds: number | null;
    width: number | null;
    height: number | null;
    external_url: string | null;
    source_provider: string | null;
  } | null;
};

export type ClipThumbnailRow = {
  id: string;
  organization_id: string;
  clip_id: string;
  kind: string;
  timecode_ms: number;
  storage_bucket: string | null;
  storage_path: string | null;
  public_url: string | null;
  width: number | null;
  height: number | null;
  is_primary: boolean;
  created_by: string | null;
  created_at: string;
};

export type ImportSourceResult = {
  assetId: string;
  name: string;
  provider: AssetSourceProvider;
  playbackUrl: string | null;
  durationMs: number | null;
  external: boolean;
};
