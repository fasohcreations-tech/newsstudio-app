import "server-only";

import { getRenderServerEnv } from "@/features/video-render-export/lib/render-env";
import { CloudRenderProvider } from "@/features/video-render-export/providers/cloud-render-provider";
import type { IRenderProvider } from "@/features/video-render-export/providers/irender-provider";
import { LocalFFmpegProvider } from "@/features/video-render-export/providers/local-ffmpeg-provider";
import type {
  RenderProviderCallbacks,
  RenderProviderId,
  RenderProviderInfo,
  RenderProviderJob,
  RenderProviderResult,
} from "@/features/video-render-export/types/render-provider.types";

/**
 * RenderManager — instantiates local FFmpeg or RenderOS.
 * Default comes from RENDER_PROVIDER; callers may override per job.
 */
export class RenderManager {
  constructor(private readonly provider: IRenderProvider) {}

  static fromEnv(override?: RenderProviderId | null): RenderManager {
    const env = getRenderServerEnv();
    const selected: RenderProviderId =
      override === "local" || override === "cloud"
        ? override
        : env.RENDER_PROVIDER;
    const provider: IRenderProvider =
      selected === "cloud"
        ? new CloudRenderProvider(env)
        : new LocalFFmpegProvider(env);
    return new RenderManager(provider);
  }

  getProviderInfo(): RenderProviderInfo {
    return {
      id: this.provider.id,
      displayName: this.provider.displayName,
    };
  }

  async execute(
    job: RenderProviderJob,
    callbacks: RenderProviderCallbacks,
  ): Promise<RenderProviderResult> {
    const avail = await this.provider.isAvailable();
    if (!avail.ok) {
      throw new Error(avail.message);
    }
    return this.provider.render(job, callbacks);
  }
}

export function getActiveRenderProviderInfo(
  override?: RenderProviderId | null,
): RenderProviderInfo {
  return RenderManager.fromEnv(override).getProviderInfo();
}

export function resolveProviderInfo(id: RenderProviderId): RenderProviderInfo {
  if (id === "cloud") {
    return { id: "cloud", displayName: "RenderOS Cloud" };
  }
  return { id: "local", displayName: "Local FFmpeg" };
}
