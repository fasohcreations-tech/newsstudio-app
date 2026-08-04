import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { WebMediaHit } from "@/features/ai-asset-discovery/services/web-media-search.service";
import {
  buildOrganizationStoragePath,
  defaultBucketForUpload,
  detectMediaFileType,
  sanitizeStorageFilename,
} from "@/features/media/lib/media-utils";
import {
  attachAssetToStory,
  registerUploadedAsset,
} from "@/features/media/services/media.service";
import { toLibraryMediaRef } from "@/features/story-production/lib/library-media-reference";
import {
  parseSubHeadlineMedia,
  serializeSubHeadlineMedia,
  type SubHeadlineMediaKind,
} from "@/features/story-production/lib/sub-headlines";

type Client = SupabaseClient;

export type ImportWebMediaResult = {
  assetId: string | null;
  libraryRef: string;
  kind: SubHeadlineMediaKind;
  name: string;
  panelIndex: number;
  linkedExternally: boolean;
};

function extensionForMime(mime: string, kind: "image" | "video"): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  if (mime.includes("webm")) return "webm";
  if (mime.includes("mp4") || kind === "video") return "mp4";
  return "jpg";
}

async function bindSubHeadlineSlot(
  client: Client,
  input: {
    storyId: string;
    userId: string;
    panelIndex: number;
    kind: SubHeadlineMediaKind;
    ref: string;
  },
): Promise<{ error: string | null }> {
  const { data: story, error: storyError } = await client
    .from("stories")
    .select("id, sub_headline_media")
    .eq("id", input.storyId)
    .maybeSingle();

  if (storyError || !story) {
    return { error: storyError?.message ?? "Story not found after import." };
  }

  const slots = parseSubHeadlineMedia(story.sub_headline_media);
  const index = input.panelIndex;
  while (slots.length <= index) {
    slots.push({ kind: "", ref: "", caption: "" });
  }
  slots[index] = {
    kind: input.kind,
    ref: input.ref,
    caption: slots[index]?.caption ?? "",
  };

  const { error: updateError } = await client
    .from("stories")
    .update({
      sub_headline_media: serializeSubHeadlineMedia(slots),
      updated_by: input.userId,
    })
    .eq("id", input.storyId);

  return { error: updateError?.message ?? null };
}

/**
 * Download a web media hit into org storage, register Media Library asset,
 * and bind it to the Sub Headline slot.
 * YouTube / Facebook hits are link-only (page URL bound, no download).
 */
export async function importWebMediaAsSubHeadlineAsset(
  client: Client,
  input: {
    organizationId: string;
    userId: string;
    storyId: string;
    panelIndex: number;
    hit: WebMediaHit;
  },
): Promise<{ data: ImportWebMediaResult | null; error: string | null }> {
  const linkOnly =
    input.hit.linkOnly === true ||
    input.hit.provider === "youtube" ||
    input.hit.provider === "facebook";

  if (linkOnly) {
    const pageUrl = (input.hit.pageUrl || input.hit.downloadUrl || "").trim();
    if (!pageUrl || !/^https?:\/\//i.test(pageUrl)) {
      return { data: null, error: "Invalid video page URL." };
    }
    const kind: SubHeadlineMediaKind =
      input.hit.kind === "image" ? "image" : "video";
    const bound = await bindSubHeadlineSlot(client, {
      storyId: input.storyId,
      userId: input.userId,
      panelIndex: input.panelIndex,
      kind,
      ref: pageUrl,
    });
    if (bound.error) return { data: null, error: bound.error };

    return {
      data: {
        assetId: null,
        libraryRef: pageUrl,
        kind,
        name: input.hit.title || `${input.hit.provider} video`,
        panelIndex: input.panelIndex,
        linkedExternally: true,
      },
      error: null,
    };
  }

  const downloadUrl = input.hit.downloadUrl?.trim();
  if (!downloadUrl || !/^https?:\/\//i.test(downloadUrl)) {
    return { data: null, error: "Invalid media download URL." };
  }

  let response: Response;
  try {
    response = await fetch(downloadUrl, {
      headers: {
        "User-Agent": "MediaOSAssetImporter/1.0",
        Accept: input.hit.kind === "video" ? "video/*,*/*" : "image/*,*/*",
      },
      redirect: "follow",
    });
  } catch (err) {
    return {
      data: null,
      error:
        err instanceof Error
          ? `Download failed: ${err.message}`
          : "Download failed.",
    };
  }

  if (!response.ok) {
    return {
      data: null,
      error: `Download failed (${response.status}). Try another result.`,
    };
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (buffer.byteLength < 64) {
    return { data: null, error: "Downloaded file was empty." };
  }
  if (buffer.byteLength > 40 * 1024 * 1024) {
    return { data: null, error: "File is too large to import (max 40MB)." };
  }

  const contentType =
    response.headers.get("content-type")?.split(";")[0]?.trim() ||
    input.hit.mimeTypeHint ||
    (input.hit.kind === "video" ? "video/mp4" : "image/jpeg");

  const fileType = detectMediaFileType(
    contentType,
    `import.${extensionForMime(contentType, input.hit.kind)}`,
  );
  if (fileType !== "image" && fileType !== "video") {
    return {
      data: null,
      error: `Unsupported media type (${contentType}).`,
    };
  }

  const ext = extensionForMime(contentType, input.hit.kind);
  const baseName = sanitizeStorageFilename(
    `${input.hit.title || input.hit.provider}-${input.hit.id}`.slice(0, 80),
  );
  const filename = `${baseName}.${ext}`;
  const bucket = defaultBucketForUpload();
  const storagePath = buildOrganizationStoragePath(
    input.organizationId,
    null,
    filename,
  );

  const { error: uploadError } = await client.storage
    .from(bucket)
    .upload(storagePath, buffer, {
      contentType,
      upsert: false,
      cacheControl: "3600",
    });

  if (uploadError) {
    return { data: null, error: uploadError.message };
  }

  const registered = await registerUploadedAsset(client, input.userId, {
    organizationId: input.organizationId,
    folderId: null,
    name: input.hit.title?.slice(0, 120) || filename,
    originalFilename: filename,
    storageBucket: bucket,
    storagePath,
    fileType,
    mimeType: contentType,
    fileSize: buffer.byteLength,
    width: input.hit.width ?? null,
    height: input.hit.height ?? null,
    durationSeconds: input.hit.durationSeconds ?? null,
  });

  if (registered.error || !registered.asset) {
    return {
      data: null,
      error: registered.error ?? "Could not register imported asset.",
    };
  }

  const kind: SubHeadlineMediaKind = fileType === "video" ? "video" : "image";
  const libraryRef = toLibraryMediaRef(registered.asset.id);

  const bound = await bindSubHeadlineSlot(client, {
    storyId: input.storyId,
    userId: input.userId,
    panelIndex: input.panelIndex,
    kind,
    ref: libraryRef,
  });
  if (bound.error) return { data: null, error: bound.error };

  const attached = await attachAssetToStory(client, input.userId, {
    organizationId: input.organizationId,
    storyId: input.storyId,
    mediaAssetId: registered.asset.id,
    label: `Sub Headline ${input.panelIndex + 1} · web import`,
  });
  if (attached.error && !/duplicate|unique/i.test(attached.error)) {
    console.warn("[WebMediaImport] story_media", attached.error);
  }

  return {
    data: {
      assetId: registered.asset.id,
      libraryRef,
      kind,
      name: registered.asset.name,
      panelIndex: input.panelIndex,
      linkedExternally: false,
    },
    error: null,
  };
}
