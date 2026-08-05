import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { cacheRenderOutput } from "@/features/video-render-export/lib/local-render-cache";
import { videoRenderDb } from "@/features/video-render-export/lib/video-render-db";
import {
  buildRenderStoragePath,
  getVideoRender,
  updateVideoRenderProgress,
} from "@/features/video-render-export/services/render-job.service";
import { RenderManager } from "@/features/video-render-export/services/render-manager";
import type { RenderProviderId } from "@/features/video-render-export/types/render-provider.types";
import type { VideoRenderRow } from "@/features/video-render-export/types/render.types";
import type { Database } from "@/shared/types/database.types";

type Client = SupabaseClient<Database>;

export type ManagedRenderLocalFile = {
  renderId: string;
  filename: string;
  mimeType: string;
  extension: string;
  byteLength: number;
  /** Relative app URL that streams the cached file. */
  downloadPath: string;
};

export type ManagedRenderResult = {
  data: VideoRenderRow | null;
  error: string | null;
  localFile: ManagedRenderLocalFile | null;
  providerId: RenderProviderId;
};

/**
 * Run a queued render through the selected provider and persist progress.
 * Cloud Storage upload is best-effort — encode success always yields a local file.
 */
export async function runManagedRenderJob(
  client: Client,
  input: {
    organizationId: string;
    userId: string;
    renderId: string;
    provider?: RenderProviderId | null;
  },
): Promise<ManagedRenderResult> {
  const manager = RenderManager.fromEnv(input.provider);
  const providerId = manager.getProviderInfo().id;

  const existing = await getVideoRender(
    client,
    input.organizationId,
    input.renderId,
  );
  if (existing.error || !existing.data) {
    return {
      data: null,
      error: existing.error ?? "Render job not found",
      localFile: null,
      providerId,
    };
  }

  const job = existing.data;
  if (job.status === "cancelled" || job.status === "succeeded") {
    return { data: job, error: null, localFile: null, providerId };
  }
  // Browser capture writes preparing/rendering before this runs — allow those.
  // Only skip when another provider execute is already in flight.
  if (job.status === "encoding" || job.status === "uploading") {
    return { data: job, error: null, localFile: null, providerId };
  }

  const wallStart = Date.now();
  let lastDbWriteAt = 0;
  let lastDbProgress = -1;
  let lastDbStatus: VideoRenderRow["status"] | null = null;

  const patchProgress = async (
    status: VideoRenderRow["status"],
    progress: number,
    extra?: {
      etaMs?: number | null;
      error?: string | null;
      videoCodec?: string;
      force?: boolean;
    },
  ) => {
    const now = Date.now();
    const progressJump = Math.abs(progress - lastDbProgress) >= 4;
    const statusChanged = status !== lastDbStatus;
    const due = now - lastDbWriteAt >= 1500;
    const terminal =
      progress >= 90 ||
      status === "succeeded" ||
      status === "failed" ||
      status === "cancelled" ||
      status === "uploading" ||
      status === "encoding";
    if (!extra?.force && !terminal && !statusChanged && !progressJump && !due) {
      return;
    }
    lastDbWriteAt = now;
    lastDbProgress = progress;
    lastDbStatus = status;
    await updateVideoRenderProgress(client, input.organizationId, input.userId, {
      renderId: input.renderId,
      status,
      progress,
      elapsedMs: now - wallStart,
      etaMs: extra?.etaMs,
      error: extra?.error,
      videoCodec: extra?.videoCodec,
    });
  };

  try {
    await patchProgress("preparing", 2, { force: true });

    const result = await manager.execute(
      {
        renderId: job.id,
        organizationId: input.organizationId,
        storyId: job.story_id,
        userId: input.userId,
        plan: job.render_plan,
        format: job.format,
        videoCodec: job.video_codec,
      },
      {
        shouldCancel: async () => {
          const latest = await getVideoRender(
            client,
            input.organizationId,
            input.renderId,
          );
          return latest.data?.status === "cancelled";
        },
        onProgress: async (progress) => {
          await patchProgress(progress.status, progress.progress, {
            etaMs: progress.etaMs,
            error: progress.message ?? null,
          });
        },
      },
    );

    const cancelled = await getVideoRender(
      client,
      input.organizationId,
      input.renderId,
    );
    if (cancelled.data?.status === "cancelled") {
      return {
        data: cancelled.data,
        error: null,
        localFile: null,
        providerId,
      };
    }

    if (result.outputUrl) {
      const updated = await updateVideoRenderProgress(
        client,
        input.organizationId,
        input.userId,
        {
          renderId: input.renderId,
          status: "succeeded",
          progress: 100,
          outputUrl: result.outputUrl,
          outputBucket: result.outputBucket,
          outputPath: result.outputPath,
          durationMs: result.durationMs,
          fileSizeBytes: result.fileSizeBytes,
          videoCodec: result.codec,
          finished: true,
          elapsedMs: Date.now() - wallStart,
          error: null,
        },
      );
      return {
        data: updated.data,
        error: updated.error,
        localFile: null,
        providerId,
      };
    }

    if (!result.outputBuffer) {
      throw new Error("Provider returned neither output bytes nor outputUrl");
    }

    const filename = `render-${job.id.slice(0, 8)}.${result.extension}`;
    const cached = await cacheRenderOutput({
      renderId: job.id,
      buffer: result.outputBuffer,
      extension: result.extension,
      mimeType: result.mimeType,
      filename,
    });
    const localFile: ManagedRenderLocalFile = {
      renderId: job.id,
      filename: cached.filename,
      mimeType: cached.mimeType,
      extension: cached.extension,
      byteLength: cached.byteLength,
      downloadPath: `/api/video-renders/${job.id}/local-download?ext=${cached.extension}`,
    };

    await patchProgress("uploading", 93, { force: true });

    const { bucket, path } = buildRenderStoragePath({
      organizationId: input.organizationId,
      storyId: job.story_id,
      renderId: job.id,
      format: result.extension,
    });

    const db = videoRenderDb(client);
    const { error: uploadError } = await db.storage.from(bucket).upload(
      path,
      result.outputBuffer,
      {
        contentType: result.mimeType,
        upsert: true,
        cacheControl: "3600",
      },
    );

    if (uploadError) {
      // Encode succeeded — keep Local file; do not mark the job as failed.
      const updated = await updateVideoRenderProgress(
        client,
        input.organizationId,
        input.userId,
        {
          renderId: input.renderId,
          status: "succeeded",
          progress: 100,
          durationMs: result.durationMs,
          fileSizeBytes: result.fileSizeBytes,
          videoCodec: result.codec,
          finished: true,
          elapsedMs: Date.now() - wallStart,
          error: `Cloud upload skipped: ${uploadError.message}. Use Local file.`,
        },
      );
      return {
        data: updated.data,
        error: null,
        localFile,
        providerId,
      };
    }

    let thumbnailPath: string | undefined;
    let thumbnailUrl: string | undefined;
    if (result.thumbnailBuffer && result.thumbnailBuffer.byteLength > 0) {
      thumbnailPath = path.replace(/\.[^.]+$/, ".jpg");
      await db.storage.from(bucket).upload(thumbnailPath, result.thumbnailBuffer, {
        contentType: "image/jpeg",
        upsert: true,
      });
      const { data: thumbSigned } = await db.storage
        .from(bucket)
        .createSignedUrl(thumbnailPath, 60 * 60 * 24 * 7);
      thumbnailUrl = thumbSigned?.signedUrl;
    }

    const { data: signed } = await db.storage
      .from(bucket)
      .createSignedUrl(path, 60 * 60 * 24 * 7);

    const updated = await updateVideoRenderProgress(
      client,
      input.organizationId,
      input.userId,
      {
        renderId: input.renderId,
        status: "succeeded",
        progress: 100,
        outputBucket: bucket,
        outputPath: path,
        outputUrl: signed?.signedUrl,
        thumbnailPath,
        thumbnailUrl,
        durationMs: result.durationMs,
        fileSizeBytes: result.fileSizeBytes,
        videoCodec: result.codec,
        finished: true,
        elapsedMs: Date.now() - wallStart,
        error: null,
      },
    );

    return {
      data: updated.data,
      error: updated.error,
      localFile,
      providerId,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Render failed";
    if (/cancel/i.test(message)) {
      const cancelled = await updateVideoRenderProgress(
        client,
        input.organizationId,
        input.userId,
        {
          renderId: input.renderId,
          status: "cancelled",
          progress: 0,
          error: "Cancelled",
          finished: true,
          elapsedMs: Date.now() - wallStart,
        },
      );
      return {
        data: cancelled.data,
        error: null,
        localFile: null,
        providerId,
      };
    }

    const failed = await updateVideoRenderProgress(
      client,
      input.organizationId,
      input.userId,
      {
        renderId: input.renderId,
        status: "failed",
        error: message,
        finished: true,
        elapsedMs: Date.now() - wallStart,
      },
    );
    return {
      data: failed.data,
      error: message,
      localFile: null,
      providerId,
    };
  }
}
