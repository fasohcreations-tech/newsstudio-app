import type {
  RenderProviderAvailability,
  RenderProviderCallbacks,
  RenderProviderId,
  RenderProviderJob,
  RenderProviderResult,
} from "@/features/video-render-export/types/render-provider.types";

/**
 * IRenderProvider — swap Local FFmpeg vs RenderOS without changing app code.
 * Selection is environment-only (`RENDER_PROVIDER`).
 */
export interface IRenderProvider {
  readonly id: RenderProviderId;
  readonly displayName: string;

  isAvailable(): Promise<RenderProviderAvailability>;

  render(
    job: RenderProviderJob,
    callbacks: RenderProviderCallbacks,
  ): Promise<RenderProviderResult>;
}
