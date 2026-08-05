/**
 * Image / Logo / Advertisement renderer.
 */

import { drawContain, drawCover } from "./geometry";
import type { RuntimeLayerFrame } from "../types";
import type { SceneRuntime } from "../scene-runtime";

export function drawImageLayer(
  ctx: CanvasRenderingContext2D,
  layer: RuntimeLayerFrame,
  runtime: SceneRuntime,
  fallbackUrl?: string | null,
): boolean {
  const url = layer.mediaUrl || fallbackUrl || null;
  if (!url) return false;
  const media = runtime.getMedia(url);
  if (!(media instanceof HTMLImageElement) || media.naturalWidth < 1) {
    return false;
  }
  const { x, y, width, height } = layer.transform;
  const fit = layer.objectFit ?? "contain";
  if (fit === "cover") drawCover(ctx, media, x, y, width, height);
  else if (fit === "fill") ctx.drawImage(media, x, y, width, height);
  else drawContain(ctx, media, x, y, width, height);
  return true;
}
