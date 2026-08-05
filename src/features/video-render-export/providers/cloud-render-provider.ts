import "server-only";

import type { RenderServerEnv } from "@/features/video-render-export/lib/render-env";
import type { IRenderProvider } from "@/features/video-render-export/providers/irender-provider";
import type {
  RenderProviderAvailability,
  RenderProviderCallbacks,
  RenderProviderJob,
  RenderProviderResult,
} from "@/features/video-render-export/types/render-provider.types";
import type { VideoRenderStatus } from "@/features/video-render-export/types/render.types";

type RemoteRenderStatusResponse = {
  id?: string;
  status?: string;
  progress?: number;
  etaMs?: number | null;
  outputUrl?: string | null;
  outputBucket?: string | null;
  outputPath?: string | null;
  error?: string | null;
  durationMs?: number | null;
  fileSizeBytes?: number | null;
  codec?: string | null;
  mimeType?: string | null;
  extension?: string | null;
};

/**
 * CloudRenderProvider — client for the future RenderOS service.
 * Submits jobs, polls progress, and retrieves completed results.
 * The RenderOS server itself is not implemented in this module.
 */
export class CloudRenderProvider implements IRenderProvider {
  readonly id = "cloud" as const;
  readonly displayName = "RenderOS Cloud";

  constructor(private readonly env: RenderServerEnv) {}

  async isAvailable(): Promise<RenderProviderAvailability> {
    if (!this.env.RENDER_API) {
      return {
        ok: false,
        message:
          "RENDER_API is not set. Point it at the RenderOS base URL to use the cloud provider.",
      };
    }
    return {
      ok: true,
      message: `RenderOS endpoint configured (${this.env.RENDER_API})`,
    };
  }

  async render(
    job: RenderProviderJob,
    callbacks: RenderProviderCallbacks,
  ): Promise<RenderProviderResult> {
    const avail = await this.isAvailable();
    if (!avail.ok) throw new Error(avail.message);

    const base = this.env.RENDER_API!.replace(/\/$/, "");

    await callbacks.onProgress({
      status: "preparing",
      progress: 4,
      message: "Submitting job to RenderOS",
    });

    const submitted = await this.requestJson(`${base}/v1/renders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        renderId: job.renderId,
        organizationId: job.organizationId,
        storyId: job.storyId,
        format: job.format,
        videoCodec: job.videoCodec,
        plan: job.plan,
      }),
    });

    const remoteId = submitted.id?.trim() || job.renderId;

    await callbacks.onProgress({
      status: "rendering",
      progress: Math.max(8, Number(submitted.progress) || 8),
      message: "RenderOS accepted job — monitoring progress",
    });

    const deadline = Date.now() + 30 * 60 * 1000;
    while (Date.now() < deadline) {
      if (await callbacks.shouldCancel()) {
        await this.requestJson(`${base}/v1/renders/${encodeURIComponent(remoteId)}/cancel`, {
          method: "POST",
          headers: { Accept: "application/json" },
        }).catch(() => undefined);
        throw new Error("Cancelled");
      }

      await new Promise((r) => setTimeout(r, 2000));

      const remote = await this.requestJson(
        `${base}/v1/renders/${encodeURIComponent(remoteId)}`,
      );
      const status = this.mapRemoteStatus(remote.status);
      const progress = Math.min(99, Math.max(0, Number(remote.progress) || 0));

      await callbacks.onProgress({
        status,
        progress,
        etaMs: remote.etaMs ?? null,
        message: remote.error ?? undefined,
      });

      if (status === "failed") {
        throw new Error(remote.error?.trim() || "RenderOS job failed");
      }
      if (status === "cancelled") {
        throw new Error("Cancelled");
      }
      if (status === "succeeded") {
        if (!remote.outputUrl?.trim()) {
          throw new Error("RenderOS completed without an outputUrl");
        }
        const extension =
          remote.extension?.replace(/^\./, "") ||
          (job.format === "webm" ? "webm" : job.format === "mov" ? "mov" : "mp4");
        return {
          mimeType:
            remote.mimeType ||
            (extension === "webm"
              ? "video/webm"
              : extension === "mov"
                ? "video/quicktime"
                : "video/mp4"),
          extension,
          durationMs: remote.durationMs ?? job.plan.durationMs,
          fileSizeBytes: remote.fileSizeBytes ?? 0,
          codec: remote.codec || job.videoCodec,
          outputUrl: remote.outputUrl,
          outputBucket: remote.outputBucket ?? undefined,
          outputPath: remote.outputPath ?? undefined,
        };
      }
    }

    throw new Error("RenderOS job timed out after 30 minutes");
  }

  private mapRemoteStatus(raw: string | undefined): VideoRenderStatus {
    const value = (raw ?? "").trim().toLowerCase();
    if (
      value === "queued" ||
      value === "preparing" ||
      value === "rendering" ||
      value === "encoding" ||
      value === "uploading" ||
      value === "succeeded" ||
      value === "failed" ||
      value === "cancelled"
    ) {
      return value;
    }
    if (value === "running" || value === "processing") return "rendering";
    if (value === "complete" || value === "completed" || value === "done") {
      return "succeeded";
    }
    if (value === "error") return "failed";
    return "rendering";
  }

  private async requestJson(
    url: string,
    init?: RequestInit,
  ): Promise<RemoteRenderStatusResponse> {
    let res: Response;
    try {
      res = await fetch(url, init);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      throw new Error(
        `RenderOS is unreachable at RENDER_API (${this.env.RENDER_API}). ${detail}`,
      );
    }

    const text = await res.text();
    let body: RemoteRenderStatusResponse = {};
    if (text.trim()) {
      try {
        body = JSON.parse(text) as RemoteRenderStatusResponse;
      } catch {
        body = { error: text.slice(0, 400) };
      }
    }

    if (!res.ok) {
      throw new Error(
        body.error?.trim() ||
          `RenderOS responded ${res.status} ${res.statusText}`.trim(),
      );
    }
    return body;
  }
}
