"use client";

import { createClient } from "@/shared/lib/supabase/client";
import { RENDER_STORAGE_BUCKET } from "@/features/video-render-export/constants/render.constants";
import { updateVideoRenderProgressAction } from "@/features/video-render-export/actions/render.actions";
import type { VideoRenderRow } from "@/features/video-render-export/types/render.types";

/** Fail fast — Free-tier Storage often blocks large videos indefinitely. */
const UPLOAD_TIMEOUT_MS = 45_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new Error(
          `${label} timed out after ${Math.round(ms / 1000)}s. Raise Supabase Storage file-size limit, or use Local file download.`,
        ),
      );
    }, ms);
    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

function extensionForMime(mimeType: string, preferred: string): string {
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("quicktime") || preferred === "mov") return "mov";
  if (mimeType.includes("mp4") || preferred === "mp4") return "mp4";
  return preferred === "mov" ? "mov" : preferred === "webm" ? "webm" : "mp4";
}

/**
 * Upload render output to Supabase Storage. Times out instead of hanging.
 */
export async function uploadRenderOutputFromBrowser(input: {
  organizationId: string;
  storyId: string;
  renderId: string;
  format: string;
  mimeType: string;
  blob: Blob;
  durationMs: number;
  thumbnailBlob?: Blob | null;
  videoCodec?: string;
  onProgress?: (progress: number, message: string) => void;
}): Promise<
  | { success: true; data: VideoRenderRow }
  | { success: false; error: string }
> {
  const supabase = createClient();
  const ext = extensionForMime(input.mimeType, input.format);
  const path = `${input.organizationId}/renders/${input.storyId}/${input.renderId}.${ext}`;
  const bucket = RENDER_STORAGE_BUCKET;
  const contentType = input.mimeType.split(";")[0]?.trim() || "video/webm";
  const sizeMb = (input.blob.size / (1024 * 1024)).toFixed(1);

  input.onProgress?.(93, `Uploading ${sizeMb} MB to Storage…`);

  try {
    const { error: uploadError } = await withTimeout(
      supabase.storage.from(bucket).upload(path, input.blob, {
        contentType,
        upsert: true,
        cacheControl: "3600",
      }),
      UPLOAD_TIMEOUT_MS,
      `Storage upload (${bucket})`,
    );

    if (uploadError) {
      return { success: false, error: uploadError.message };
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  input.onProgress?.(97, "Saving render metadata…");

  let thumbnailPath: string | undefined;
  let thumbnailUrl: string | undefined;
  if (input.thumbnailBlob) {
    thumbnailPath = path.replace(/\.[^.]+$/, ".jpg");
    try {
      await withTimeout(
        supabase.storage
          .from(bucket)
          .upload(thumbnailPath, input.thumbnailBlob, {
            contentType: "image/jpeg",
            upsert: true,
          }),
        20_000,
        "Thumbnail upload",
      );
      const { data: thumbSigned } = await supabase.storage
        .from(bucket)
        .createSignedUrl(thumbnailPath, 60 * 60 * 24 * 7);
      thumbnailUrl = thumbSigned?.signedUrl;
    } catch {
      thumbnailPath = undefined;
      thumbnailUrl = undefined;
    }
  }

  const { data: signed } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60 * 24 * 7);

  const result = await updateVideoRenderProgressAction({
    renderId: input.renderId,
    status: "succeeded",
    progress: 100,
    outputBucket: bucket,
    outputPath: path,
    outputUrl: signed?.signedUrl,
    thumbnailPath,
    thumbnailUrl,
    durationMs: input.durationMs,
    fileSizeBytes: input.blob.size,
    videoCodec: input.videoCodec,
    finished: true,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }
  return { success: true, data: result.data };
}

/** Fresh object-URL download each click (never reuse a revoked URL). */
export function downloadBlobLocally(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5_000);
}
