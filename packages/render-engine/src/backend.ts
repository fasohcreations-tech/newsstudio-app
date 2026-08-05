/**
 * Render Backend Provider — switch between DOM (legacy) and Canvas (V2).
 * Encoder destination (local / cloud FFmpeg) stays separate.
 */

import type { RenderBackendId } from "./types";

export type RenderBackendInfo = {
  id: RenderBackendId;
  displayName: string;
  description: string;
  /** Production default when no preference is stored. */
  isDefault?: boolean;
};

export const RENDER_BACKENDS: readonly RenderBackendInfo[] = [
  {
    id: "canvas",
    displayName: "Canvas Renderer (V2)",
    description:
      "Scene Runtime → Canvas2D. Frame-accurate, no DOM raster. Default.",
    isDefault: true,
  },
  {
    id: "dom",
    displayName: "DOM Renderer (Legacy)",
    description:
      "StoryLivePreview → modern-screenshot. Proof-of-concept fidelity path.",
  },
] as const;

export const DEFAULT_RENDER_BACKEND: RenderBackendId = "canvas";

export function resolveRenderBackend(
  preferred?: string | null,
): RenderBackendId {
  if (preferred === "dom" || preferred === "canvas") return preferred;
  return DEFAULT_RENDER_BACKEND;
}
