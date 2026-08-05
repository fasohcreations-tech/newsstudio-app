/**
 * Video Renderer — Timeline-driven seek + draw. No browser playback clock.
 */

import { drawContain, drawCover } from "./geometry";
import type { RuntimeLayerFrame } from "../types";
import type { SceneRuntime } from "../scene-runtime";

const SEEK_EPSILON_SEC = 0.004;

export async function seekVideoTo(
  video: HTMLVideoElement,
  timeSec: number,
): Promise<void> {
  const target = Math.max(0, timeSec);
  if (Math.abs(video.currentTime - target) <= SEEK_EPSILON_SEC) {
    return;
  }
  await new Promise<void>((resolve) => {
    const done = () => {
      video.removeEventListener("seeked", done);
      resolve();
    };
    video.addEventListener("seeked", done);
    try {
      video.currentTime = target;
    } catch {
      resolve();
      return;
    }
    window.setTimeout(done, 250);
  });
}

export async function drawVideoLayer(
  ctx: CanvasRenderingContext2D,
  layer: RuntimeLayerFrame,
  runtime: SceneRuntime,
  scenePlayheadMs: number,
  clipVideoUrl: string | null,
): Promise<boolean> {
  const url = layer.mediaUrl || clipVideoUrl;
  if (!url) return false;
  const media = runtime.getMedia(url);
  if (!(media instanceof HTMLVideoElement) || media.videoWidth < 1) {
    return false;
  }

  const localSec =
    (scenePlayheadMs + (layer.metadata?.trimInMs as number | undefined ?? 0)) /
    1000;
  await seekVideoTo(media, localSec);

  const { x, y, width, height } = layer.transform;
  const fit = layer.objectFit ?? "cover";
  if (fit === "contain") drawContain(ctx, media, x, y, width, height);
  else if (fit === "fill") ctx.drawImage(media, x, y, width, height);
  else drawCover(ctx, media, x, y, width, height);
  return true;
}
