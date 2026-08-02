"use client";

import { createClient } from "@/shared/lib/supabase/client";
import {
  attachAssetToStory,
  registerUploadedAsset,
} from "@/features/media/services/media.service";
import {
  buildOrganizationStoragePath,
  defaultBucketForUpload,
  detectMediaFileType,
  readImageDimensions,
  readMediaDuration,
} from "@/features/media/lib/media-utils";
import { MAX_UPLOAD_BYTES } from "@/features/media/constants/media.constants";
import type { MediaAssetWithMeta } from "@/features/media/types/media.types";

export type UploadProgress = {
  filename: string;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
};

type UploadFilesArgs = {
  organizationId: string;
  folderId?: string | null;
  files: File[];
  storyId?: string | null;
  onProgress?: (items: UploadProgress[]) => void;
};

export async function uploadMediaFiles({
  organizationId,
  folderId = null,
  files,
  storyId = null,
  onProgress,
}: UploadFilesArgs): Promise<{
  assets: MediaAssetWithMeta[];
  errors: string[];
}> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { assets: [], errors: ["You must be signed in to upload."] };
  }

  const progress: UploadProgress[] = files.map((file) => ({
    filename: file.name,
    progress: 0,
    status: "pending",
  }));
  onProgress?.([...progress]);

  const assets: MediaAssetWithMeta[] = [];
  const errors: string[] = [];
  const bucket = defaultBucketForUpload();

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index]!;
    progress[index] = {
      filename: file.name,
      progress: 5,
      status: "uploading",
    };
    onProgress?.([...progress]);

    if (file.size > MAX_UPLOAD_BYTES) {
      progress[index] = {
        filename: file.name,
        progress: 100,
        status: "error",
        error: "File exceeds the 500MB limit.",
      };
      errors.push(`${file.name}: File exceeds the 500MB limit.`);
      onProgress?.([...progress]);
      continue;
    }

    const storagePath = buildOrganizationStoragePath(
      organizationId,
      folderId,
      file.name,
    );

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || "application/octet-stream",
      });

    if (uploadError) {
      progress[index] = {
        filename: file.name,
        progress: 100,
        status: "error",
        error: uploadError.message,
      };
      errors.push(`${file.name}: ${uploadError.message}`);
      onProgress?.([...progress]);
      continue;
    }

    progress[index] = {
      filename: file.name,
      progress: 70,
      status: "uploading",
    };
    onProgress?.([...progress]);

    const [dimensions, duration] = await Promise.all([
      readImageDimensions(file),
      readMediaDuration(file),
    ]);

    const displayName = file.name.replace(/\.[^.]+$/, "") || file.name;

    const { asset, error: registerError } = await registerUploadedAsset(
      supabase,
      user.id,
      {
        organizationId,
        folderId,
        name: displayName,
        originalFilename: file.name,
        storageBucket: bucket,
        storagePath,
        fileType: detectMediaFileType(file.type, file.name),
        mimeType: file.type || "application/octet-stream",
        fileSize: file.size,
        width: dimensions?.width ?? null,
        height: dimensions?.height ?? null,
        durationSeconds: duration,
      },
    );

    if (registerError || !asset) {
      await supabase.storage.from(bucket).remove([storagePath]);
      progress[index] = {
        filename: file.name,
        progress: 100,
        status: "error",
        error: registerError ?? "Unable to register asset.",
      };
      errors.push(`${file.name}: ${registerError ?? "Unable to register asset."}`);
      onProgress?.([...progress]);
      continue;
    }

    if (storyId) {
      await attachAssetToStory(supabase, user.id, {
        organizationId,
        storyId,
        mediaAssetId: asset.id,
      });
    }

    assets.push(asset);
    progress[index] = {
      filename: file.name,
      progress: 100,
      status: "done",
    };
    onProgress?.([...progress]);
  }

  return { assets, errors };
}
