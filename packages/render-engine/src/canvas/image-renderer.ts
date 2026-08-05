/**
 * Image / Logo / Advertisement renderer.
 */

import { drawContain, drawCover } from "./geometry";
import type { RuntimeLayerFrame } from "../types";
import type { SceneRuntime } from "../scene-runtime";

/**
 * Optional-info panels cycle their playlist on the Timeline clock — the slide
 * index must derive from playheadMs, never wall time.
 */
export function activeMediaUrl(
  layer: RuntimeLayerFrame,
  scenePlayheadMs: number,
): string | null {
  const list = layer.mediaPlaylist;
  if (list && list.length > 0) {
    const interval = Math.max(1000, layer.slideIntervalMs ?? 3500);
    const index = Math.floor(Math.max(0, scenePlayheadMs) / interval) % list.length;
    return list[index] ?? list[0] ?? null;
  }
  return layer.mediaUrl || null;
}

/**
 * Story Preview draws a bordered placeholder for empty media regions. Without
 * it an unresolved panel (e.g. Optional Information Area 2) renders as nothing
 * at all, which reads as "the region is missing".
 */
export function drawMediaPlaceholder(
  ctx: CanvasRenderingContext2D,
  layer: RuntimeLayerFrame,
): boolean {
  const { x, y, width, height } = layer.transform;
  if (width <= 1 || height <= 1) return false;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
  ctx.restore();
  return true;
}

export function drawImageLayer(
  ctx: CanvasRenderingContext2D,
  layer: RuntimeLayerFrame,
  runtime: SceneRuntime,
  fallbackUrl?: string | null,
  scenePlayheadMs = 0,
): boolean {
  const url = activeMediaUrl(layer, scenePlayheadMs) || fallbackUrl || null;
  if (!url) return false;
  const media = runtime.getMedia(url);
  if (!(media instanceof HTMLImageElement)) return false;
  // SVGs can report naturalWidth 0 while still being drawable once decoded.
  if (!media.complete) return false;
  const intrinsic = media.naturalWidth > 0 && media.naturalHeight > 0;

  const { x, y, width, height } = layer.transform;
  const fit = layer.objectFit ?? "contain";
  if (!intrinsic) {
    ctx.drawImage(media, x, y, width, height);
    return true;
  }
  if (fit === "cover") drawCover(ctx, media, x, y, width, height);
  else if (fit === "fill") ctx.drawImage(media, x, y, width, height);
  else drawContain(ctx, media, x, y, width, height);
  return true;
}
