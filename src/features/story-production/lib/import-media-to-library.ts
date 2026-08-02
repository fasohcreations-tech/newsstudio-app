"use client";

import { uploadMediaFiles } from "@/features/media/lib/upload-media";
import { toLibraryMediaRef } from "@/features/story-production/lib/library-media-reference";

type ImportMediaToLibraryArgs = {
  organizationId: string;
  url: string;
  name: string;
};

/**
 * Fetch a public/demo file and upload it to the Media Library.
 * Returns a stable `library://` reference for Story fields.
 */
export async function importUrlToMediaLibrary({
  organizationId,
  url,
  name,
}: ImportMediaToLibraryArgs): Promise<{
  ref: string | null;
  error: string | null;
}> {
  const response = await fetch(url);
  if (!response.ok) {
    return { ref: null, error: "Unable to load file" };
  }

  const blob = await response.blob();
  const ext = url.includes(".") ? url.slice(url.lastIndexOf(".")) : "";
  const file = new File([blob], `${name}${ext}`, {
    type: blob.type || "application/octet-stream",
  });

  const { assets, errors } = await uploadMediaFiles({
    organizationId,
    files: [file],
  });

  if (errors.length > 0) {
    return { ref: null, error: errors[0] ?? "Upload failed" };
  }

  const asset = assets[0];
  if (!asset) {
    return { ref: null, error: "Upload failed" };
  }

  return { ref: toLibraryMediaRef(asset.id), error: null };
}

export async function uploadFilesToMediaLibrary({
  organizationId,
  files,
}: {
  organizationId: string;
  files: File[];
}): Promise<{
  refs: string[];
  errors: string[];
}> {
  const { assets, errors } = await uploadMediaFiles({ organizationId, files });
  return {
    refs: assets.map((asset) => toLibraryMediaRef(asset.id)),
    errors,
  };
}
