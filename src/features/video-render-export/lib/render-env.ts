import "server-only";

import type { RenderProviderId } from "@/features/video-render-export/types/render-provider.types";

export type RenderServerEnv = {
  RENDER_PROVIDER: RenderProviderId;
  FFMPEG_PATH: string;
  FFPROBE_PATH: string;
  RENDER_API: string | undefined;
};

/**
 * Server-only render provider configuration.
 * Never import from client components. Never prefix with NEXT_PUBLIC_.
 */
export function getRenderServerEnv(): RenderServerEnv {
  const raw = process.env.RENDER_PROVIDER?.trim().toLowerCase();
  const provider: RenderProviderId = raw === "cloud" ? "cloud" : "local";

  return {
    RENDER_PROVIDER: provider,
    FFMPEG_PATH: process.env.FFMPEG_PATH?.trim() || "ffmpeg",
    FFPROBE_PATH: process.env.FFPROBE_PATH?.trim() || "ffprobe",
    RENDER_API: process.env.RENDER_API?.trim() || undefined,
  };
}
