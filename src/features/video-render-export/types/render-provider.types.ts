/**
 * Render Provider Architecture types.
 * Providers consume an immutable RenderPlan — they never mutate Timeline / Scenes.
 */

import type {
  RenderPlan,
  VideoExportFormat,
  VideoRenderStatus,
} from "@/features/video-render-export/types/render.types";

export const RENDER_PROVIDER_IDS = ["local", "cloud"] as const;

export type RenderProviderId = (typeof RENDER_PROVIDER_IDS)[number];

export type RenderProviderJob = {
  renderId: string;
  organizationId: string;
  storyId: string;
  userId: string;
  plan: RenderPlan;
  format: VideoExportFormat;
  videoCodec: string;
};

export type RenderProviderProgress = {
  status: VideoRenderStatus;
  progress: number;
  etaMs?: number | null;
  message?: string;
};

export type RenderProviderResult = {
  mimeType: string;
  extension: string;
  durationMs: number;
  fileSizeBytes: number;
  codec: string;
  /** Local FFmpeg bytes — manager uploads to Storage. */
  outputBuffer?: Buffer;
  thumbnailBuffer?: Buffer | null;
  /** Cloud / RenderOS may return a ready URL instead of bytes. */
  outputUrl?: string;
  outputBucket?: string;
  outputPath?: string;
};

export type RenderProviderCallbacks = {
  onProgress: (progress: RenderProviderProgress) => Promise<void> | void;
  shouldCancel: () => Promise<boolean>;
  onLog?: (message: string) => void;
};

export type RenderProviderAvailability = {
  ok: boolean;
  message: string;
};

export type RenderProviderInfo = {
  id: RenderProviderId;
  displayName: string;
};
