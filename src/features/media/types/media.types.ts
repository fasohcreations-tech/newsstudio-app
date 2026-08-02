import type {
  MediaFileType,
  MediaStorageScope,
  Tables,
} from "@/shared/types/database.types";

export type MediaFolder = Tables<"media_folders">;
export type MediaAsset = Tables<"media_assets">;
export type MediaTag = Tables<"media_tags">;
export type StoryMedia = Tables<"story_media">;

export type MediaAssetWithMeta = MediaAsset & {
  folder: Pick<MediaFolder, "id" | "name"> | null;
  story_links?: Array<{
    id: string;
    story_id: string;
    label: string | null;
    deleted_at?: string | null;
    story: { id: string; title: string } | null;
  }>;
};

export type MediaBrowserView = "grid" | "list";

export type MediaListFilters = {
  organizationId: string;
  folderId?: string | null;
  fileType?: MediaFileType | "all";
  storyId?: string | null;
  search?: string;
  includeDeleted?: boolean;
  includeAllFolders?: boolean;
  page?: number;
  pageSize?: number;
};

export type MediaListResult = {
  assets: MediaAssetWithMeta[];
  folders: MediaFolder[];
  total: number;
  page: number;
  pageSize: number;
};

export type UploadAssetInput = {
  organizationId: string;
  folderId?: string | null;
  file: File;
  bucket?: MediaStorageScope;
  storyId?: string | null;
};
