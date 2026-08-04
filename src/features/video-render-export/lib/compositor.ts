/**
 * Browser Timeline compositor — draws scene media + lower-third text per frame.
 * Non-destructive: only reads the immutable RenderPlan snapshot.
 */

import type { RenderPlan, RenderPlanClip } from "@/features/video-render-export/types/render.types";

export type FrameDrawContext = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  plan: RenderPlan;
  mediaCache: Map<string, HTMLImageElement | HTMLVideoElement>;
};

function clipAtTime(plan: RenderPlan, timeMs: number): RenderPlanClip | null {
  return (
    plan.clips.find((c) => timeMs >= c.startMs && timeMs < c.endMs) ??
    plan.clips.find((c) => timeMs === c.endMs) ??
    null
  );
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  media: CanvasImageSource,
  width: number,
  height: number,
) {
  const mw =
    "videoWidth" in media && (media as HTMLVideoElement).videoWidth
      ? (media as HTMLVideoElement).videoWidth
      : (media as HTMLImageElement).naturalWidth || width;
  const mh =
    "videoHeight" in media && (media as HTMLVideoElement).videoHeight
      ? (media as HTMLVideoElement).videoHeight
      : (media as HTMLImageElement).naturalHeight || height;
  const scale = Math.max(width / Math.max(1, mw), height / Math.max(1, mh));
  const dw = mw * scale;
  const dh = mh * scale;
  const dx = (width - dw) / 2;
  const dy = (height - dh) / 2;
  ctx.drawImage(media, dx, dy, dw, dh);
}

function drawLowerThird(
  ctx: CanvasRenderingContext2D,
  clip: RenderPlanClip,
  width: number,
  height: number,
) {
  const barH = Math.max(72, Math.round(height * 0.16));
  const y = height - barH;
  const grad = ctx.createLinearGradient(0, y, 0, height);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(0.35, "rgba(0,0,0,0.55)");
  grad.addColorStop(1, "rgba(0,0,0,0.85)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, y, width, barH);

  ctx.fillStyle = "#ffffff";
  ctx.font = `600 ${Math.round(height * 0.045)}px system-ui, sans-serif`;
  ctx.fillText(clip.headline.slice(0, 80), Math.round(width * 0.04), y + barH * 0.45);

  if (clip.subheadline) {
    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.font = `400 ${Math.round(height * 0.028)}px system-ui, sans-serif`;
    ctx.fillText(
      clip.subheadline.slice(0, 100),
      Math.round(width * 0.04),
      y + barH * 0.72,
    );
  }
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

async function loadVideo(url: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.onloadeddata = () => resolve(video);
    video.onerror = () => reject(new Error(`Failed to load video: ${url}`));
    video.src = url;
  });
}

export async function preloadPlanMedia(
  plan: RenderPlan,
  onProgress?: (pct: number) => void,
): Promise<Map<string, HTMLImageElement | HTMLVideoElement>> {
  const cache = new Map<string, HTMLImageElement | HTMLVideoElement>();
  const urls: Array<{ key: string; url: string; kind: "video" | "image" }> = [];
  for (const clip of plan.clips) {
    if (clip.videoUrl) urls.push({ key: `v:${clip.clipId}`, url: clip.videoUrl, kind: "video" });
    else if (clip.imageUrl) {
      urls.push({ key: `i:${clip.clipId}`, url: clip.imageUrl, kind: "image" });
    }
  }

  let done = 0;
  for (const item of urls) {
    try {
      const media =
        item.kind === "video"
          ? await loadVideo(item.url)
          : await loadImage(item.url);
      cache.set(item.key, media);
    } catch {
      /* leave missing — compositor shows placeholder */
    }
    done += 1;
    onProgress?.(Math.round((done / Math.max(1, urls.length)) * 100));
  }
  return cache;
}

export function drawTimelineFrame(
  frame: FrameDrawContext,
  timeMs: number,
): void {
  const { ctx, plan, mediaCache, canvas } = frame;
  const { width, height } = plan;
  ctx.fillStyle = "#071225";
  ctx.fillRect(0, 0, width, height);

  const clip = clipAtTime(plan, timeMs);
  if (!clip) {
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "24px system-ui";
    ctx.fillText("No scene", 40, height / 2);
    return;
  }

  const video = mediaCache.get(`v:${clip.clipId}`) as HTMLVideoElement | undefined;
  const image = mediaCache.get(`i:${clip.clipId}`) as HTMLImageElement | undefined;

  if (video) {
    const localSec = Math.max(0, (timeMs - clip.startMs + clip.trimInMs) / 1000);
    if (Number.isFinite(video.duration) && video.duration > 0) {
      const target = Math.min(localSec, Math.max(0, video.duration - 0.05));
      if (Math.abs(video.currentTime - target) > 0.08) {
        try {
          video.currentTime = target;
        } catch {
          /* ignore */
        }
      }
    }
    drawCover(ctx, video, width, height);
  } else if (image) {
    drawCover(ctx, image, width, height);
  } else {
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = `${Math.round(height * 0.04)}px system-ui`;
    ctx.fillText(clip.name || "Scene", 40, height / 2);
  }

  // Simple crossfade toward next clip
  if (clip.transitionToNext !== "cut" && clip.transitionDurationMs > 0) {
    const fadeStart = clip.endMs - clip.transitionDurationMs;
    if (timeMs >= fadeStart && timeMs < clip.endMs) {
      const t = (timeMs - fadeStart) / clip.transitionDurationMs;
      ctx.fillStyle = `rgba(0,0,0,${Math.min(1, t * 0.85)})`;
      ctx.fillRect(0, 0, width, height);
    }
  }

  drawLowerThird(ctx, clip, width, height);

  // Ensure canvas size matches plan
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
}

export async function captureThumbnailJpeg(
  frame: FrameDrawContext,
  timeMs: number,
  quality = 0.85,
): Promise<Blob> {
  drawTimelineFrame(frame, timeMs);
  return new Promise((resolve, reject) => {
    frame.canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Thumbnail failed"))),
      "image/jpeg",
      quality,
    );
  });
}
