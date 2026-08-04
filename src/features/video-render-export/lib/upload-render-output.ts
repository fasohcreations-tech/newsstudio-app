"use client";

import { createClient } from "@/shared/lib/supabase/client";
import { RENDER_STORAGE_BUCKET } from "@/features/video-render-export/constants/render.constants";
import { updateVideoRenderProgressAction } from "@/features/video-render-export/actions/render.actions";
import type { VideoRenderRow } from "@/features/video-render-export/types/render.types";

/**
 * Upload render output from the browser directly to Supabase Storage,
 * then mark the job succeeded (avoids huge server-action payloads).
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
}): Promise<{ success: true; data: VideoRenderRow } | { success: false; error: string }> {
  const supabase = createClient();
  const ext =
    input.format === "mov" ? "mov" : input.format === "webm" ? "webm" : "mp4";
  const path = `${input.organizationId}/renders/${input.storyId}/${input.renderId}.${ext}`;
  const bucket = RENDER_STORAGE_BUCKET;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, input.blob, {
      contentType: input.mimeType,
      upsert: true,
    });

  if (uploadError) {
    await updateVideoRenderProgressAction({
      renderId: input.renderId,
      status: "failed",
      error: uploadError.message,
      finished: true,
    });
    return { success: false, error: uploadError.message };
  }

  let thumbnailPath: string | undefined;
  let thumbnailUrl: string | undefined;
  if (input.thumbnailBlob) {
    thumbnailPath = path.replace(/\.[^.]+$/, ".jpg");
    await supabase.storage.from(bucket).upload(thumbnailPath, input.thumbnailBlob, {
      contentType: "image/jpeg",
      upsert: true,
    });
    const { data: thumbSigned } = await supabase.storage
      .from(bucket)
      .createSignedUrl(thumbnailPath, 60 * 60 * 24 * 7);
    thumbnailUrl = thumbSigned?.signedUrl;
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
