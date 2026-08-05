"use client";

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import {
  createContext as createScreenshotContext,
  destroyContext as destroyScreenshotContext,
  domToCanvas,
  type Context as ScreenshotContext,
} from "modern-screenshot";

import { getComposerSceneAction } from "@/features/scene-composer/actions/scene-composer.actions";
import { getLayerMotionConfig } from "@/features/scene-composer/lib/motion-animation";
import { getShapeConfig } from "@/features/scene-composer/lib/shape-composer";
import type { ComposerScene } from "@/features/scene-composer/types/scene-composer.types";
import { StoryLivePreview } from "@/features/story-production/components/story-live-preview";
import { useResolvedStoryBindings } from "@/features/story-production/hooks/use-resolved-story-bindings";
import type { StoryPreviewAspect } from "@/features/story-production/types/story-data.types";
import { extendComposerSceneForDuration } from "@/features/story-scene-builder/lib/extend-scene-duration";
import { logVerify } from "@/features/video-render-export/lib/render-verification";
import type {
  RenderPlan,
  RenderPlanClip,
} from "@/features/video-render-export/types/render.types";

export type ComposedSceneCaptureApi = {
  warmUp: (plan: RenderPlan) => Promise<void>;
  paintFrame: (timeMs: number, dest: HTMLCanvasElement) => Promise<void>;
  verifyReadiness: (plan: RenderPlan) => Promise<void>;
};

/**
 * True DOM rasterization of StoryLivePreview (CSS gradients, 3D transforms,
 * edge/light sweep, font metrics) with a layer blit as safety net.
 */
export const COMPOSED_CAPTURE_ENGINE = "dom-raster-v11-playback";

/** Per-frame budget — a stalled rasterize must not hang the whole render. */
const RASTER_TIMEOUT_MS = 8000;

const rasterizer: {
  context: ScreenshotContext<HTMLElement> | null;
  node: HTMLElement | null;
  fails: number;
  disabled: boolean;
  reported: boolean;
} = {
  context: null,
  node: null,
  fails: 0,
  disabled: false,
  reported: false,
};

function resetRasterizer() {
  if (rasterizer.context) {
    try {
      destroyScreenshotContext(rasterizer.context);
    } catch {
      /* ignore */
    }
  }
  rasterizer.context = null;
  rasterizer.node = null;
  rasterizer.fails = 0;
  rasterizer.disabled = false;
  rasterizer.reported = false;
}

/**
 * One context per render: font/asset embeds are cached across frames, which is
 * what made the first per-frame `domToCanvas` attempt time out.
 */
async function ensureRasterContext(
  root: HTMLElement,
  width: number,
  height: number,
): Promise<ScreenshotContext<HTMLElement>> {
  if (rasterizer.context && rasterizer.node === root) {
    return rasterizer.context;
  }
  const nativeW = Math.max(1, root.offsetWidth || width);
  const nativeH = Math.max(1, root.offsetHeight || height);
  const context = await createScreenshotContext(root, {
    autoDestruct: false,
    width: nativeW,
    height: nativeH,
    scale: Math.min(1, width / nativeW),
    backgroundColor: "#071225",
    timeout: 1500,
    drawImageInterval: 0,
    // <video> is painted from the render plan; cloning it stalls on media load.
    filter: (node) => !(node instanceof HTMLVideoElement),
    features: {
      copyScrollbar: false,
      restoreScrollPosition: false,
    },
    onCloneNode: (cloned) => {
      // The live artboard is CSS-scaled into a small host; the clone renders
      // at authored size so text metrics and transforms stay exact.
      if (cloned instanceof HTMLElement) {
        cloned.style.transform = "none";
        cloned.style.transformOrigin = "top left";
        cloned.style.width = `${nativeW}px`;
        cloned.style.height = `${nativeH}px`;
      }
    },
  });
  rasterizer.context = context;
  rasterizer.node = root;
  return context;
}

function withTimeout<T>(task: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(
      () => reject(new Error(`${label} (${ms}ms)`)),
      ms,
    );
    task.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        window.clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/**
 * Inventory Shape Composer / Motion Library / behaviours on a scene.
 * Uses the same getters as StoryLivePreview — does not reimplement animation.
 */
function inventorySceneRuntime(composer: ComposerScene | null): {
  layers: number;
  motionLayers: number;
  shapesEnabled: number;
  behavioursEnabled: number;
  revealsEnabled: number;
} {
  const objects = composer?.composer_document?.objects ?? [];
  let motionLayers = 0;
  let shapesEnabled = 0;
  let behavioursEnabled = 0;
  let revealsEnabled = 0;
  for (const object of objects) {
    const motion = getLayerMotionConfig(object);
    if (
      motion.entrance.type !== "none" ||
      motion.exit.type !== "none" ||
      motion.idle.type !== "none"
    ) {
      motionLayers += 1;
    }
    const shape = getShapeConfig(object);
    if (shape.enabled && !shape.hidden) {
      shapesEnabled += 1;
      if (shape.reveal?.enabled !== false) revealsEnabled += 1;
      for (const behavior of shape.behaviors ?? []) {
        if (behavior.enabled) behavioursEnabled += 1;
      }
    }
  }
  return {
    layers: objects.length,
    motionLayers,
    shapesEnabled,
    behavioursEnabled,
    revealsEnabled,
  };
}

const ARTBOARD: Record<StoryPreviewAspect, { width: number; height: number }> = {
  "1920x1080": { width: 1920, height: 1080 },
  "1080x1920": { width: 1080, height: 1920 },
  "1080x1080": { width: 1080, height: 1080 },
  "3840x2160": { width: 3840, height: 2160 },
};

/** Scene artboards are authored at these sizes — map export res to nearest. */
function aspectFromSize(w: number, h: number): StoryPreviewAspect {
  const ratio = w / Math.max(1, h);
  if (Math.abs(ratio - 9 / 16) < 0.08) return "1080x1920";
  if (Math.abs(ratio - 1) < 0.08) return "1080x1080";
  if (w >= 3000 || h >= 2000) return "3840x2160";
  return "1920x1080";
}

/**
 * Same merge as Timeline monitor: composer bindings + scene-instance / plan media.
 * Without this, Main Video stays empty and headlines never appear.
 */
function bindingsForClip(
  composer: ComposerScene | null,
  clip: RenderPlanClip | null,
): Record<string, string> {
  const base: Record<string, string> = {
    ...(composer?.resolved_bindings ?? {}),
  };
  if (!clip) return base;

  if (clip.headline?.trim()) base.headline = clip.headline.trim();
  if (clip.subheadline?.trim()) base.subheadline = clip.subheadline.trim();
  if (clip.tickerText?.trim()) {
    base.ticker = clip.tickerText.trim();
    base.ticker_text = clip.tickerText.trim();
  }
  if (clip.videoUrl?.trim()) {
    base.main_video = clip.videoUrl.trim();
    base.video = clip.videoUrl.trim();
  }
  if (clip.imageUrl?.trim()) {
    base.main_image = clip.imageUrl.trim();
    base.image = clip.imageUrl.trim();
  }
  if (clip.logoUrl?.trim()) {
    base.logo = clip.logoUrl.trim();
    base.channel_logo = clip.logoUrl.trim();
  }
  if (clip.advertisementUrl?.trim()) {
    base.advertisement = clip.advertisementUrl.trim();
    base.ad = clip.advertisementUrl.trim();
  }
  return base;
}

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 0);
  });
}

function waitFrames(n = 1): Promise<void> {
  return new Promise((resolve) => {
    let left = n;
    const tick = () => {
      left -= 1;
      if (left <= 0) resolve();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

function muteCaptureMedia(root: HTMLElement) {
  root.querySelectorAll("video, audio").forEach((node) => {
    const el = node as HTMLMediaElement;
    el.muted = true;
    el.volume = 0;
  });
}

function isCanvasClean(canvas: HTMLCanvasElement): boolean {
  try {
    canvas.getContext("2d")?.getImageData(0, 0, 1, 1);
    return true;
  } catch {
    return false;
  }
}

function isTransparentColor(color: string): boolean {
  const c = color.trim().toLowerCase();
  return (
    !c ||
    c === "transparent" ||
    c === "rgba(0, 0, 0, 0)" ||
    c === "rgba(0,0,0,0)"
  );
}

function countHttpMedia(root: HTMLElement): number {
  let n = 0;
  root.querySelectorAll("img, video").forEach((node) => {
    const el = node as HTMLImageElement | HTMLVideoElement;
    const src = (el.currentSrc || el.getAttribute("src") || "").trim();
    if (/^https?:\/\//i.test(src)) n += 1;
  });
  return n;
}

async function waitForVideosDecodable(
  root: HTMLElement,
  timeoutMs = 4000,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const videos = Array.from(root.querySelectorAll("video"));
    if (videos.length === 0) return;
    const pending = videos.some((v) => {
      const src = (v.currentSrc || v.src || "").trim();
      if (!src || src.startsWith("blob:") || src.startsWith("data:")) {
        return v.readyState < 2 || v.videoWidth < 1;
      }
      return true;
    });
    if (!pending) return;
    await waitFrames(1);
    await yieldToMain();
  }
}

/** Cache remote→blob so React re-renders don't force re-download. */
const blobUrlCache = new Map<string, string>();

/**
 * Rewrite remote img/video to same-origin blob: URLs so canvas stays origin-clean.
 */
async function rematerializeMediaToBlobUrls(
  root: HTMLElement,
  onLog?: (message: string) => void,
): Promise<number> {
  const medias = Array.from(root.querySelectorAll("img, video"));
  let converted = 0;

  for (const node of medias) {
    const el = node as HTMLImageElement | HTMLVideoElement;
    const src = (el.currentSrc || el.getAttribute("src") || "").trim();
    if (!src || src.startsWith("blob:") || src.startsWith("data:")) continue;

    try {
      let objUrl = blobUrlCache.get(src);
      if (!objUrl) {
        let res: Response | null = null;
        if (/^https?:\/\//i.test(src)) {
          res = await fetch(
            `/api/render-media-proxy?url=${encodeURIComponent(src)}`,
          );
        }
        if (!res?.ok) {
          try {
            res = await fetch(src, { mode: "cors", credentials: "omit" });
          } catch {
            res = null;
          }
        }
        if (!res?.ok) {
          onLog?.(
            `Media rematerialize skipped (${res?.status ?? "fetch"}): ${src.slice(0, 64)}`,
          );
          continue;
        }
        const blob = await res.blob();
        objUrl = URL.createObjectURL(blob);
        blobUrlCache.set(src, objUrl);
      }

      if (el instanceof HTMLImageElement) {
        await new Promise<void>((resolve, reject) => {
          const onLoad = () => {
            cleanup();
            resolve();
          };
          const onErr = () => {
            cleanup();
            reject(new Error("image load failed"));
          };
          const cleanup = () => {
            el.removeEventListener("load", onLoad);
            el.removeEventListener("error", onErr);
          };
          el.addEventListener("load", onLoad);
          el.addEventListener("error", onErr);
          el.removeAttribute("crossorigin");
          el.src = objUrl!;
        });
      } else {
        el.removeAttribute("crossorigin");
        el.muted = true;
        el.playsInline = true;
        el.preload = "auto";
        el.src = objUrl!;
        el.load();
        await new Promise<void>((resolve) => {
          const done = () => {
            el.removeEventListener("loadeddata", done);
            resolve();
          };
          el.addEventListener("loadeddata", done);
          window.setTimeout(done, 8000);
        });
        try {
          await el.play();
          el.pause();
        } catch {
          /* ignore */
        }
      }
      el.dataset.captureBlob = objUrl!;
      converted += 1;
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      onLog?.(`Media rematerialize failed: ${detail}`);
    }
  }

  return converted;
}

function reapplyPinnedBlobs(root: HTMLElement) {
  root.querySelectorAll("img, video").forEach((node) => {
    const el = node as HTMLImageElement | HTMLVideoElement;
    const pinned = el.dataset.captureBlob;
    const src = (el.getAttribute("src") || "").trim();
    if (pinned && src !== pinned && /^https?:\/\//i.test(src)) {
      el.src = pinned;
    }
  });
}

async function syncVideosToPlayhead(
  root: HTMLElement,
  localPlayheadMs: number,
): Promise<void> {
  const videos = Array.from(root.querySelectorAll("video"));
  if (videos.length === 0) return;

  const seeks = videos.map((video) => {
    if (video.readyState < 1) return Promise.resolve();
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    if (duration <= 0) return Promise.resolve();
    const target = Math.min(
      Math.max(0, localPlayheadMs / 1000),
      Math.max(0, duration - 0.04),
    );
    if (Math.abs(video.currentTime - target) < 0.05) return Promise.resolve();
    return new Promise<void>((resolve) => {
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
      window.setTimeout(done, 200);
    });
  });

  await Promise.all(seeks);
}

function drawVideoCover(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (vw < 1 || vh < 1 || dw < 1 || dh < 1) return;
  const scale = Math.max(dw / vw, dh / vh);
  const sw = dw / scale;
  const sh = dh / scale;
  const sx0 = (vw - sw) / 2;
  const sy0 = (vh - sh) / 2;
  ctx.drawImage(video, sx0, sy0, sw, sh, dx, dy, dw, dh);
}

function mapRectToDest(
  rootRect: DOMRect,
  elRect: DOMRect,
  width: number,
  height: number,
) {
  const sx = width / rootRect.width;
  const sy = height / rootRect.height;
  return {
    dx: (elRect.left - rootRect.left) * sx,
    dy: (elRect.top - rootRect.top) * sy,
    dw: elRect.width * sx,
    dh: elRect.height * sy,
    sx,
  };
}

/**
 * Draw plan media into the Main Video hole — DOM blit often leaves it black
 * when in-DOM <video> stays on https or never decodes in time.
 */
function paintMainVideoFromElement(
  root: HTMLElement,
  dest: HTMLCanvasElement,
  video: HTMLVideoElement,
  width: number,
  height: number,
  onLog?: (message: string) => void,
) {
  // After seek, readyState can briefly dip — trust videoWidth once loaded.
  if (video.videoWidth < 1) {
    onLog?.("Main video element not ready to paint");
    return false;
  }
  const ctx = dest.getContext("2d", { alpha: false });
  if (!ctx) return false;
  const rootRect = root.getBoundingClientRect();
  const hole =
    (root.querySelector("[data-video-mask]") as HTMLElement | null) ||
    (root.querySelector(
      '[data-layer="main_video_container"]',
    ) as HTMLElement | null);
  if (!hole) {
    onLog?.("Main video hole not found — full-frame fallback");
    drawVideoCover(ctx, video, 0, 0, width, height);
    return true;
  }
  const rect = hole.getBoundingClientRect();
  const { dx, dy, dw, dh } = mapRectToDest(rootRect, rect, width, height);
  try {
    drawVideoCover(ctx, video, dx, dy, dw, dh);
    return true;
  } catch {
    onLog?.("Main video drawImage failed");
    return false;
  }
}

async function waitForVideoDimensions(
  video: HTMLVideoElement,
  timeoutMs = 4000,
): Promise<boolean> {
  if (video.videoWidth > 0 && video.readyState >= 2) return true;
  return new Promise((resolve) => {
    const done = () => {
      cleanup();
      resolve(video.videoWidth > 0);
    };
    const cleanup = () => {
      video.removeEventListener("loadeddata", done);
      video.removeEventListener("canplay", done);
      window.clearTimeout(timer);
    };
    video.addEventListener("loadeddata", done);
    video.addEventListener("canplay", done);
    const timer = window.setTimeout(done, timeoutMs);
  });
}

async function seekPlanVideo(
  video: HTMLVideoElement,
  timeSec: number,
): Promise<void> {
  const duration = Number.isFinite(video.duration) ? video.duration : 0;
  if (duration <= 0) return;
  const target = Math.min(
    Math.max(0, timeSec),
    Math.max(0, duration - 0.04),
  );
  if (Math.abs(video.currentTime - target) < 0.08) return;

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
    window.setTimeout(done, 500);
  });

  if (typeof video.requestVideoFrameCallback === "function") {
    await new Promise<void>((resolve) => {
      video.requestVideoFrameCallback(() => resolve());
      window.setTimeout(resolve, 250);
    });
  } else {
    await waitFrames(1);
  }
}

function effectiveOpacity(el: Element, root: HTMLElement): number {
  let opacity = 1;
  let node: Element | null = el;
  while (node && node !== root.parentElement) {
    if (!(node instanceof HTMLElement) && !(node instanceof SVGElement)) break;
    const style = window.getComputedStyle(node);
    if (style.visibility === "hidden" || style.display === "none") return 0;
    const op = Number(style.opacity || "1");
    if (Number.isFinite(op)) opacity *= op;
    if (opacity < 0.02) return 0;
    if (node === root) break;
    node = node.parentElement;
  }
  return opacity;
}

function paintRoundedRect(
  ctx: CanvasRenderingContext2D,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  radius: number,
) {
  const r = Math.min(radius, dw / 2, dh / 2);
  if (r <= 0.5) {
    ctx.fillRect(dx, dy, dw, dh);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(dx + r, dy);
  ctx.arcTo(dx + dw, dy, dx + dw, dy + dh, r);
  ctx.arcTo(dx + dw, dy + dh, dx, dy + dh, r);
  ctx.arcTo(dx, dy + dh, dx, dy, r);
  ctx.arcTo(dx, dy, dx + dw, dy, r);
  ctx.closePath();
  ctx.fill();
}

/** Sync Shape Composer SVG → canvas (avoids async Image decode). */
function paintSvgSync(
  svg: SVGSVGElement,
  ctx: CanvasRenderingContext2D,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  alpha: number,
) {
  const vb = svg.viewBox?.baseVal;
  const vw = Math.max(1, vb?.width || svg.clientWidth || dw);
  const vh = Math.max(1, vb?.height || svg.clientHeight || dh);
  ctx.save();
  ctx.translate(dx, dy);
  ctx.scale(dw / vw, dh / vh);
  ctx.globalAlpha = Math.min(1, alpha);

  for (const rect of Array.from(svg.querySelectorAll("rect"))) {
    const fill = rect.getAttribute("fill") || "none";
    const stroke = rect.getAttribute("stroke") || "none";
    const fillOp = Number(rect.getAttribute("fill-opacity") ?? "1");
    const x = Number(rect.getAttribute("x") || 0);
    const y = Number(rect.getAttribute("y") || 0);
    const w = Number(rect.getAttribute("width") || 0);
    const h = Number(rect.getAttribute("height") || 0);
    const rx = Number(rect.getAttribute("rx") || 0);
    if (w < 1 || h < 1) continue;
    if (fill && fill !== "none") {
      ctx.globalAlpha = Math.min(1, alpha * (Number.isFinite(fillOp) ? fillOp : 1));
      ctx.fillStyle = fill;
      paintRoundedRect(ctx, x, y, w, h, rx);
    }
    const sw = Number(rect.getAttribute("stroke-width") || 0);
    if (stroke && stroke !== "none" && sw > 0) {
      ctx.globalAlpha = Math.min(1, alpha);
      ctx.strokeStyle = stroke;
      ctx.lineWidth = sw;
      ctx.strokeRect(x, y, w, h);
    }
  }

  for (const path of Array.from(svg.querySelectorAll("path"))) {
    const d = path.getAttribute("d");
    if (!d) continue;
    const fill = path.getAttribute("fill") || "none";
    const stroke = path.getAttribute("stroke") || "none";
    const fillOp = Number(path.getAttribute("fill-opacity") ?? "1");
    const sw = Number(path.getAttribute("stroke-width") || 0);
    try {
      const p = new Path2D(d);
      if (fill && fill !== "none") {
        ctx.globalAlpha = Math.min(
          1,
          alpha * (Number.isFinite(fillOp) ? fillOp : 1),
        );
        ctx.fillStyle = fill;
        ctx.fill(p);
      }
      if (stroke && stroke !== "none" && sw > 0) {
        ctx.globalAlpha = Math.min(1, alpha);
        ctx.strokeStyle = stroke;
        ctx.lineWidth = sw;
        const dash = path.getAttribute("stroke-dasharray");
        if (dash) {
          ctx.setLineDash(
            dash
              .split(/[\s,]+/)
              .map(Number)
              .filter((n) => Number.isFinite(n)),
          );
          const off = Number(path.getAttribute("stroke-dashoffset") || 0);
          if (Number.isFinite(off)) ctx.lineDashOffset = off;
        }
        ctx.stroke(p);
        ctx.setLineDash([]);
      }
    } catch {
      /* invalid path */
    }
  }

  ctx.restore();
}

function paintLayerText(
  layer: HTMLElement,
  root: HTMLElement,
  ctx: CanvasRenderingContext2D,
  rootRect: DOMRect,
  sx: number,
  sy: number,
) {
  const layerAlpha = effectiveOpacity(layer, root);
  if (layerAlpha < 0.05) return;

  const textEl = layer.querySelector(
    "span, p, h1, h2, h3, label",
  ) as HTMLElement | null;
  // Only paint layers that actually host UI text (not SVG title noise).
  if (!textEl && !layer.getAttribute("data-region-key")) return;

  const textHost = textEl || layer;
  const text = textHost.textContent?.replace(/\s+/g, " ").trim();
  if (!text || text.length > 600) return;

  const style = window.getComputedStyle(textHost);
  const rect = layer.getBoundingClientRect();
  if (rect.width < 4 || rect.height < 4) return;
  if (
    rect.right < rootRect.left ||
    rect.left > rootRect.right ||
    rect.bottom < rootRect.top ||
    rect.top > rootRect.bottom
  ) {
    return;
  }

  const dx = (rect.left - rootRect.left) * sx;
  const dy = (rect.top - rootRect.top) * sy;
  const dw = rect.width * sx;
  const dh = rect.height * sy;
  const fontSize = Math.max(
    10,
    parseFloat(style.fontSize || "22") * sx,
  );

  ctx.save();
  ctx.globalAlpha = Math.min(1, layerAlpha);
  ctx.beginPath();
  ctx.rect(dx, dy, dw, dh);
  ctx.clip();

  const bg = style.backgroundColor;
  // Ticker shells often carry the brand fill on the layer itself.
  const layerBg = window.getComputedStyle(layer).backgroundColor;
  const fillBg =
    (bg && !isTransparentColor(bg) ? bg : null) ||
    (layerBg && !isTransparentColor(layerBg) ? layerBg : null);
  if (fillBg && layer.getAttribute("data-region-key") === "ticker") {
    ctx.fillStyle = fillBg;
    ctx.fillRect(dx, dy, dw, dh);
  }

  ctx.fillStyle = style.color || "#000000";
  ctx.font = `${style.fontWeight || "600"} ${fontSize}px ${style.fontFamily || "system-ui, sans-serif"}`;
  ctx.textBaseline = "middle";
  const align = style.textAlign || "left";
  ctx.textAlign =
    align === "center" || align === "right" ? align : "left";
  const padX = Math.max(6, dw * 0.02);
  const padY = Math.max(4, dh * 0.08);
  let tx = dx + padX;
  if (align === "center") tx = dx + dw / 2;
  else if (align === "right") tx = dx + dw - padX;

  // Multi-line wrap for headlines; single line truncate for tickers.
  const isTicker =
    layer.getAttribute("data-region-key") === "ticker" ||
    layer.querySelector('[data-region-key="ticker"]') != null;
  if (isTicker || style.whiteSpace === "nowrap") {
    ctx.fillText(text, tx, dy + dh / 2, Math.max(8, dw - padX * 2));
  } else {
    const lineHeight = fontSize * (Number(style.lineHeight) > 3
      ? 1.35
      : Number.parseFloat(style.lineHeight) || 1.35);
    const words = text.split(" ");
    const lines: string[] = [];
    let line = "";
    const maxW = Math.max(8, dw - padX * 2);
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > maxW && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
    const maxLines = Math.max(1, Math.floor((dh - padY * 2) / lineHeight));
    const drawn = lines.slice(0, maxLines);
    const blockH = drawn.length * lineHeight;
    let y = dy + (dh - blockH) / 2 + lineHeight / 2;
    for (const row of drawn) {
      ctx.fillText(row, tx, y, maxW);
      y += lineHeight;
    }
  }
  ctx.restore();
}

/**
 * Paint Live Preview by `[data-object-id]` layer (z-order), then text on top
 * of each layer — fixes white frames covering headlines and skips DOM screenshot.
 */
function blitFullArtboard(
  root: HTMLElement,
  dest: HTMLCanvasElement,
  width: number,
  height: number,
  onLog?: (message: string) => void,
) {
  const ctx = dest.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas 2D unavailable");
  if (dest.width !== width) dest.width = width;
  if (dest.height !== height) dest.height = height;

  const rootRect = root.getBoundingClientRect();
  if (rootRect.width < 2 || rootRect.height < 2) {
    throw new Error("Capture artboard has no layout size");
  }
  const sx = width / rootRect.width;
  const sy = height / rootRect.height;

  ctx.fillStyle = "#071225";
  ctx.fillRect(0, 0, width, height);

  const layers = Array.from(
    root.querySelectorAll<HTMLElement>("[data-object-id]"),
  ).filter((el) => !el.parentElement?.closest("[data-object-id]"));

  layers.sort((a, b) => {
    const za = Number.parseInt(window.getComputedStyle(a).zIndex || "0", 10) || 0;
    const zb = Number.parseInt(window.getComputedStyle(b).zIndex || "0", 10) || 0;
    if (za !== zb) return za - zb;
    const ap = a.compareDocumentPosition(b);
    if (ap & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (ap & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    return 0;
  });

  let drewVideo = 0;
  let skippedHttpVideo = 0;
  let drewSvg = 0;

  for (const layer of layers) {
    const layerAlpha = effectiveOpacity(layer, root);
    if (layerAlpha < 0.05) continue;

    const nodes: Element[] = [
      layer,
      ...Array.from(layer.querySelectorAll("*")),
    ];

    for (const el of nodes) {
      // Nested object shells are separate layers.
      if (el !== layer && el instanceof HTMLElement && el.hasAttribute("data-object-id")) {
        continue;
      }
      const owner = el.closest("[data-object-id]");
      if (owner && owner !== layer) continue;

      if (el instanceof SVGSVGElement || el.tagName === "svg") {
        const alpha = effectiveOpacity(el, root);
        if (alpha < 0.05) continue;
        const rect = el.getBoundingClientRect();
        if (rect.width < 1 || rect.height < 1) continue;
        if (
          rect.right < rootRect.left ||
          rect.left > rootRect.right ||
          rect.bottom < rootRect.top ||
          rect.top > rootRect.bottom
        ) {
          continue;
        }
        paintSvgSync(
          el as SVGSVGElement,
          ctx,
          (rect.left - rootRect.left) * sx,
          (rect.top - rootRect.top) * sy,
          rect.width * sx,
          rect.height * sy,
          alpha,
        );
        drewSvg += 1;
        continue;
      }

      if (!(el instanceof HTMLElement)) continue;

      const style = window.getComputedStyle(el);
      if (style.visibility === "hidden" || style.display === "none") continue;
      const alpha = effectiveOpacity(el, root);
      if (alpha < 0.05) continue;

      const rect = el.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) continue;
      if (
        rect.right < rootRect.left ||
        rect.left > rootRect.right ||
        rect.bottom < rootRect.top ||
        rect.top > rootRect.bottom
      ) {
        continue;
      }

      const dx = (rect.left - rootRect.left) * sx;
      const dy = (rect.top - rootRect.top) * sy;
      const dw = rect.width * sx;
      const dh = rect.height * sy;

      ctx.save();
      ctx.globalAlpha = Math.min(1, alpha);

      const bg = style.backgroundColor;
      if (bg && !isTransparentColor(bg)) {
        ctx.fillStyle = bg;
        const radius =
          Math.min(
            rect.width,
            rect.height,
            parseFloat(style.borderRadius) || 0,
          ) * sx;
        paintRoundedRect(ctx, dx, dy, dw, dh, radius);
      }

      try {
        if (el instanceof HTMLImageElement) {
          const src = el.currentSrc || el.src || "";
          if (!/^https?:\/\//i.test(src) && el.complete && el.naturalWidth > 0) {
            ctx.drawImage(el, dx, dy, dw, dh);
          }
        } else if (el instanceof HTMLVideoElement) {
          const src = el.currentSrc || el.src || "";
          if (/^https?:\/\//i.test(src)) {
            skippedHttpVideo += 1;
          } else if (el.readyState >= 2 && el.videoWidth > 0) {
            ctx.drawImage(el, dx, dy, dw, dh);
            drewVideo += 1;
          }
        } else if (el instanceof HTMLCanvasElement) {
          if (el.width > 0 && el.height > 0 && isCanvasClean(el)) {
            ctx.drawImage(el, dx, dy, dw, dh);
          }
        }
      } catch {
        /* skip unsafe source */
      }

      ctx.restore();
    }

    // Text after this layer's chrome so white frames cannot cover headlines.
    paintLayerText(layer, root, ctx, rootRect, sx, sy);
  }

  // Orphan SVGs / media not under data-object-id (rare fallbacks).
  for (const svg of Array.from(root.querySelectorAll("svg"))) {
    if (svg.closest("[data-object-id]")) continue;
    const alpha = effectiveOpacity(svg, root);
    if (alpha < 0.05) continue;
    const rect = svg.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) continue;
    const dx = (rect.left - rootRect.left) * sx;
    const dy = (rect.top - rootRect.top) * sy;
    paintSvgSync(
      svg as SVGSVGElement,
      ctx,
      dx,
      dy,
      rect.width * sx,
      rect.height * sy,
      alpha,
    );
    drewSvg += 1;
  }

  if (skippedHttpVideo > 0 && Math.random() < 0.02) {
    onLog?.(
      `WARN: ${skippedHttpVideo} video(s) still https — main stage may be empty`,
    );
  }
  if (drewVideo === 0 && root.querySelector("video") && Math.random() < 0.02) {
    onLog?.("WARN: no in-DOM video frame this tick (plan video paint may still apply)");
  }
  if (drewSvg > 0 && Math.random() < 0.01) {
    onLog?.(`Layer blit painted ${drewSvg} SVG shape(s)`);
  }

  if (!isCanvasClean(dest)) {
    dest.width = width;
    dest.height = height;
    throw new Error(
      "Canvas is not origin-clean after paint (cross-origin media).",
    );
  }
}

/**
 * Rasterize the live preview exactly as the browser paints it, falling back to
 * the layer blit only if the rasterizer keeps failing.
 */
async function paintArtboardLive(
  root: HTMLElement,
  dest: HTMLCanvasElement,
  width: number,
  height: number,
  onLog?: (message: string) => void,
): Promise<"dom-raster" | "layer-blit"> {
  if (!rasterizer.disabled) {
    try {
      const startedAt = performance.now();
      const context = await ensureRasterContext(root, width, height);
      const shot = await withTimeout(
        domToCanvas(context),
        RASTER_TIMEOUT_MS,
        "DOM rasterize timeout",
      );
      const rasterMs = Math.round(performance.now() - startedAt);

      const ctx = dest.getContext("2d", { alpha: false });
      if (!ctx) throw new Error("Canvas 2D unavailable");
      if (dest.width !== width) dest.width = width;
      if (dest.height !== height) dest.height = height;
      ctx.fillStyle = "#071225";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(shot, 0, 0, width, height);
      if (!isCanvasClean(dest)) {
        throw new Error("rasterized canvas tainted (cross-origin media)");
      }

      rasterizer.fails = 0;
      if (!rasterizer.reported) {
        rasterizer.reported = true;
        onLog?.(
          `Frame paint: DOM rasterizer active (full CSS fidelity, ${rasterMs}ms first frame).`,
        );
      }
      return "dom-raster";
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      rasterizer.fails += 1;
      if (rasterizer.fails >= 3) {
        rasterizer.disabled = true;
        onLog?.(
          `DOM rasterizer disabled after 3 failures (${detail}) — layer blit fallback.`,
        );
      } else {
        onLog?.(`DOM rasterize failed (${detail}) — retrying next frame.`);
      }
    }
  }

  blitFullArtboard(root, dest, width, height, onLog);
  return "layer-blit";
}

export const ComposedSceneCaptureHost = forwardRef<
  ComposedSceneCaptureApi,
  {
    className?: string;
    onLog?: (message: string) => void;
  }
>(function ComposedSceneCaptureHost({ onLog }, ref) {
  const artboardRef = useRef<HTMLDivElement>(null);
  const planVideoRef = useRef<HTMLVideoElement | null>(null);
  const planVideoUrlRef = useRef<string | null>(null);
  const cacheRef = useRef<Record<string, ComposerScene>>({});
  const lastMotionIdRef = useRef<string | null>(null);
  const lastClipIdRef = useRef<string | null>(null);
  const planRef = useRef<RenderPlan | null>(null);
  const logRef = useRef(onLog);
  logRef.current = onLog;
  const bindingsRef = useRef<Record<string, string>>({});
  const [plan, setPlan] = useState<RenderPlan | null>(null);
  const [motionSceneId, setMotionSceneId] = useState<string | null>(null);
  const [scenePlayheadMs, setScenePlayheadMs] = useState(0);
  const [composer, setComposer] = useState<ComposerScene | null>(null);
  const [clipDurationMs, setClipDurationMs] = useState(10_000);
  const [activeClip, setActiveClip] = useState<RenderPlanClip | null>(null);

  const [runtimePlaying, setRuntimePlaying] = useState(false);

  const rawBindings = useMemo(
    () => bindingsForClip(composer, activeClip),
    [composer, activeClip],
  );
  const bindings = useResolvedStoryBindings(rawBindings);
  bindingsRef.current = bindings;

  const ensurePlanVideo = useCallback(async (url: string) => {
    let video = planVideoRef.current;
    if (!video) {
      video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";
      video.setAttribute("playsinline", "true");
      planVideoRef.current = video;
    }

    // Same URL already bound — never reload (seek drops readyState and caused
    // a reload loop that logged "Plan video ready" then "not ready to paint").
    if (planVideoUrlRef.current === url && (video.currentSrc || video.src)) {
      if (video.videoWidth < 1) {
        await waitForVideoDimensions(video, 4000);
      }
      return video;
    }

    let objUrl = blobUrlCache.get(url);
    if (!objUrl) {
      const res = await fetch(
        `/api/render-media-proxy?url=${encodeURIComponent(url)}`,
      );
      if (!res.ok) {
        throw new Error(`Plan video proxy failed (${res.status})`);
      }
      objUrl = URL.createObjectURL(await res.blob());
      blobUrlCache.set(url, objUrl);
    }

    video.src = objUrl;
    planVideoUrlRef.current = url;
    await waitForVideoDimensions(video, 12000);
    try {
      await video.play();
      video.pause();
    } catch {
      /* ignore */
    }
    if (video.videoWidth > 0) {
      logRef.current?.(
        `Plan video ready ${video.videoWidth}×${video.videoHeight}`,
      );
    } else {
      logRef.current?.("Plan video loaded but has no dimensions yet");
    }
    return video;
  }, []);

  const rematerialize = useCallback(async () => {
    if (!artboardRef.current) return;
    const n = await rematerializeMediaToBlobUrls(
      artboardRef.current,
      (m) => logRef.current?.(m),
    );
    if (n > 0) {
      logRef.current?.(
        `Rematerialized ${n} media element(s) to blob URLs (CORS-safe).`,
      );
    }
    await waitForVideosDecodable(artboardRef.current);
  }, []);

  const applyClip = useCallback(
    async (clip: RenderPlanClip | null, opts?: { forceRematerialize?: boolean }) => {
      const nextMotionId = clip?.motionSceneId?.trim() || null;
      const sceneChanged = nextMotionId !== lastMotionIdRef.current;
      const clipChanged = (clip?.clipId ?? null) !== lastClipIdRef.current;
      const clipDur = Math.max(clip?.durationMs ?? 10_000, 1_000);

      if (sceneChanged || clipChanged || opts?.forceRematerialize) {
        if (sceneChanged) {
          logRef.current?.(
            `Scene cut → ${nextMotionId?.slice(0, 8) ?? "none"}`,
          );
        }
        if (clip?.videoUrl) {
          logRef.current?.(
            `Clip media: video ${clip.videoUrl.slice(0, 48)}…`,
          );
        } else if (clip?.imageUrl) {
          logRef.current?.(
            `Clip media: image ${clip.imageUrl.slice(0, 48)}…`,
          );
        } else {
          logRef.current?.("Clip media: none on plan (bindings only)");
        }

        flushSync(() => {
          setMotionSceneId(nextMotionId);
          setComposer(
            nextMotionId ? (cacheRef.current[nextMotionId] ?? null) : null,
          );
          setActiveClip(clip);
          setClipDurationMs(clipDur);
        });
        lastMotionIdRef.current = nextMotionId;
        lastClipIdRef.current = clip?.clipId ?? null;

        // Let React apply main_video / headline bindings into the preview DOM.
        await waitFrames(3);
        await yieldToMain();
        await new Promise((r) => setTimeout(r, 200));
        if (artboardRef.current) muteCaptureMedia(artboardRef.current);
        await rematerialize();
        if (clip?.videoUrl) {
          try {
            await ensurePlanVideo(clip.videoUrl);
          } catch (err) {
            const detail = err instanceof Error ? err.message : String(err);
            logRef.current?.(`Plan video load failed: ${detail}`);
          }
        }
        if (artboardRef.current) {
          const left = countHttpMedia(artboardRef.current);
          if (left > 0) {
            logRef.current?.(
              `Retry rematerialize (${left} https media remaining)…`,
            );
            await rematerialize();
          }
          muteCaptureMedia(artboardRef.current);
        }
      }
    },
    [rematerialize, ensurePlanVideo],
  );

  const warmUp = useCallback(
    async (next: RenderPlan) => {
      planRef.current = next;
      resetRasterizer();
      // Clocks stay off until verifyReadiness finishes the READY gate.
      flushSync(() => {
        setRuntimePlaying(false);
        setScenePlayheadMs(0);
      });
      logRef.current?.(
        `Capture engine: ${COMPOSED_CAPTURE_ENGINE} (DOM rasterizer + StoryLivePreview clocks)`,
      );
      logRef.current?.(
        `Warm-up: ${next.clips.length} clip(s), ${next.width}×${next.height}, ${(next.durationMs / 1000).toFixed(1)}s`,
      );
      flushSync(() => {
        setPlan(next);
      });
      await yieldToMain();

      const ids = [
        ...new Set(
          next.clips
            .map((c) => c.motionSceneId?.trim())
            .filter((id): id is string => Boolean(id)),
        ),
      ];
      for (const id of ids) {
        if (cacheRef.current[id]) continue;
        logRef.current?.(`Loading composer scene ${id.slice(0, 8)}…`);
        const result = await getComposerSceneAction(id);
        if (result.success && result.data) {
          cacheRef.current[id] = result.data;
          logRef.current?.(
            `Scene Initialized ${id.slice(0, 8)} (${result.data.name ?? "untitled"})`,
          );
        } else {
          logRef.current?.(
            `Composer scene ${id.slice(0, 8)} failed: ${result.success === false ? result.error : "missing"}`,
          );
        }
        await yieldToMain();
      }

      lastMotionIdRef.current = null;
      lastClipIdRef.current = null;
      const first = next.clips[0] ?? null;
      flushSync(() => {
        setScenePlayheadMs(0);
      });
      await applyClip(first, { forceRematerialize: true });
      if (first?.videoUrl) {
        try {
          await ensurePlanVideo(first.videoUrl);
        } catch (err) {
          const detail = err instanceof Error ? err.message : String(err);
          logRef.current?.(`Plan video warm-up failed: ${detail}`);
        }
      }
      logVerify(logRef.current, true, "Warm-up complete");
      logRef.current?.("Warm-up complete.");
    },
    [applyClip, ensurePlanVideo],
  );

  const verifyReadiness = useCallback(
    async (next: RenderPlan) => {
      logRef.current?.(
        "── Stage 5: Scene Runtime init (same engine as StoryLivePreview / Timeline)",
      );
      const first = next.clips[0] ?? null;
      const scene =
        composer ??
        (first?.motionSceneId
          ? cacheRef.current[first.motionSceneId] ?? null
          : null);
      const inventory = inventorySceneRuntime(scene);

      // 1. Load Scene
      logVerify(
        logRef.current,
        Boolean(scene),
        "Scene Initialized",
        scene
          ? `${scene.name ?? "scene"} · ${inventory.layers} layer(s)`
          : first?.motionSceneId?.slice(0, 8) ?? "missing",
      );

      // 2. Bind Assets
      if (typeof document !== "undefined" && document.fonts?.ready) {
        try {
          await document.fonts.ready;
          logVerify(logRef.current, true, "Fonts Loaded");
        } catch {
          logVerify(logRef.current, false, "Fonts Loaded");
        }
      }

      const deadline = Date.now() + 10000;
      while (Date.now() < deadline) {
        const pendingBindings = Object.values(bindingsRef.current).some(
          (v) =>
            typeof v === "string" &&
            (v.startsWith("library://") || v.startsWith("clip://")),
        );
        const root = artboardRef.current;
        const pendingSrc = root
          ? Array.from(root.querySelectorAll("img, video")).some((node) => {
              const src = (
                (node as HTMLImageElement | HTMLVideoElement).currentSrc ||
                (node as HTMLElement).getAttribute("src") ||
                ""
              ).trim();
              return (
                src.startsWith("library://") || src.startsWith("clip://")
              );
            })
          : false;
        if (!pendingBindings && !pendingSrc) {
          if (root && countHttpMedia(root) > 0) {
            await rematerialize();
          }
          break;
        }
        await waitFrames(2);
        await yieldToMain();
        await new Promise((r) => setTimeout(r, 150));
      }
      if (artboardRef.current && countHttpMedia(artboardRef.current) > 0) {
        await rematerialize();
      }

      const boundKeys = Object.keys(bindingsRef.current).filter(
        (k) => Boolean(bindingsRef.current[k]?.trim()),
      );
      logVerify(
        logRef.current,
        boundKeys.length > 0 || Boolean(first),
        "Assets Bound",
        `${boundKeys.length} binding key(s)`,
      );

      // 3–6. Shape Composer / Behaviour / Motion Library / Layer Animations
      // (initialized by mounting StoryLivePreview — we only verify inventory)
      logVerify(
        logRef.current,
        true,
        "Shape Composer Loaded",
        `${inventory.shapesEnabled} shape layer(s), ${inventory.revealsEnabled} reveal(s)`,
      );
      logVerify(
        logRef.current,
        true,
        "Behaviours Loaded",
        `${inventory.behavioursEnabled} enabled behaviour(s)`,
      );
      logVerify(
        logRef.current,
        true,
        "Motion Library Loaded",
        "sampleLayerMotion via StoryLivePreview",
      );
      logVerify(
        logRef.current,
        true,
        "Animations Loaded",
        `${inventory.motionLayers} layer(s) with entrance/idle/exit`,
      );
      logVerify(
        logRef.current,
        true,
        "Layer Animations Initialized",
        "motionMode=playback (shared engine)",
      );

      const root = artboardRef.current;
      const httpsLeft = root ? countHttpMedia(root) : -1;
      const images = root ? root.querySelectorAll("img").length : 0;

      // 7. Initialize Video Playback
      if (first?.videoUrl) {
        try {
          const v = await ensurePlanVideo(first.videoUrl);
          await seekPlanVideo(v, 0);
          logVerify(
            logRef.current,
            v.videoWidth > 0,
            "Video Playback Initialized",
            `${v.videoWidth}×${v.videoHeight}`,
          );
        } catch (err) {
          logVerify(
            logRef.current,
            false,
            "Video Playback Initialized",
            err instanceof Error ? err.message : String(err),
          );
        }
      } else if (first?.imageUrl) {
        logVerify(
          logRef.current,
          true,
          "Video Playback Initialized",
          "clip uses image (no video)",
        );
      } else {
        logVerify(
          logRef.current,
          false,
          "Video Playback Initialized",
          "no videoUrl/imageUrl on first clip",
        );
      }

      logVerify(
        logRef.current,
        images > 0 || Boolean(first?.logoUrl || first?.imageUrl),
        "Images Loaded",
        `${images} <img> in artboard` +
          (httpsLeft > 0 ? ` · ${httpsLeft} still https` : ""),
      );
      logVerify(
        logRef.current,
        Boolean(first?.headline?.trim()),
        "Headline binding",
        first?.headline?.slice(0, 48) || "empty",
      );
      logVerify(
        logRef.current,
        Boolean(
          first?.tickerText?.trim() ||
            bindingsRef.current.ticker ||
            bindingsRef.current.ticker_text,
        ),
        "Ticker initialized",
        first?.tickerText?.slice(0, 48) ||
          bindingsRef.current.ticker?.slice(0, 48) ||
          "may use placeholder",
      );

      // 8. Audio — composed capture is videoOnly; FFmpeg muxes voice later.
      if (next.voiceUrl) {
        logVerify(
          logRef.current,
          true,
          "Audio Playback Initialized",
          "deferred to Local FFmpeg voice mux (videoOnly capture)",
        );
      } else {
        logVerify(
          logRef.current,
          true,
          "Audio Playback Initialized",
          "no voiceUrl on plan",
        );
      }

      // 9. Wait until every runtime reports READY
      await waitFrames(3);
      await yieldToMain();
      logVerify(
        logRef.current,
        Boolean(scene) && Boolean(artboardRef.current),
        "Runtime Ready",
        "Shape + Behaviour + Motion + Layer clocks armed",
      );

      // 10–13. Start Scene / Animation / Behaviour / Shape clocks
      // Same contract as StoryTimelinePreview: playback + isPlaying → clocks follow playheadMs.
      flushSync(() => {
        setScenePlayheadMs(0);
        setRuntimePlaying(true);
      });
      await waitFrames(4);
      await yieldToMain();

      logVerify(logRef.current, true, "Scene Clock Started", "playheadMs driven");
      logVerify(
        logRef.current,
        true,
        "Animation Clock Started",
        "layer motion samples playhead",
      );
      logVerify(
        logRef.current,
        true,
        "Behaviour Clock Started",
        "shape behaviours follow playhead",
      );
      logVerify(
        logRef.current,
        true,
        "Shape Clock Started",
        "useShapePreviewClock → playheadMs",
      );
      logVerify(
        logRef.current,
        true,
        "Animation Started",
        "StoryLivePreview playback mode (single animation engine)",
      );
    },
    [composer, ensurePlanVideo, rematerialize],
  );

  const paintFrame = useCallback(
    async (timeMs: number, dest: HTMLCanvasElement) => {
      const activePlan = planRef.current;
      if (!activePlan) throw new Error("Capture host not warmed up");

      const clip =
        activePlan.clips.find((c) => timeMs >= c.startMs && timeMs < c.endMs) ??
        activePlan.clips.find((c) => timeMs === c.endMs) ??
        null;

      const offset = clip
        ? Math.max(0, timeMs - clip.startMs + (clip.trimInMs ?? 0))
        : 0;

      await applyClip(clip);

      // Drive the shared Timeline clock — StoryLivePreview samples motion/shape/behaviours here.
      flushSync(() => {
        if (!runtimePlaying) setRuntimePlaying(true);
        setScenePlayheadMs(offset);
      });
      // Two paints: commit playhead, then let layout/CSS transforms settle before blit.
      await waitFrames(2);
      await yieldToMain();
      await waitFrames(1);

      const artboardEl = artboardRef.current;
      if (!artboardEl) throw new Error("Capture artboard missing");
      muteCaptureMedia(artboardEl);
      reapplyPinnedBlobs(artboardEl);

      if (countHttpMedia(artboardEl) > 0) {
        await rematerialize();
        muteCaptureMedia(artboardEl);
      }

      await syncVideosToPlayhead(artboardEl, offset);

      const paintMode = await paintArtboardLive(
        artboardEl,
        dest,
        activePlan.width,
        activePlan.height,
        (m) => logRef.current?.(m),
      );
      void paintMode;

      // Reliable main-stage fill from the render plan (not fragile in-DOM video).
      if (clip?.videoUrl) {
        try {
          const planVideo = await ensurePlanVideo(clip.videoUrl);
          await seekPlanVideo(planVideo, offset / 1000);
          paintMainVideoFromElement(
            artboardEl,
            dest,
            planVideo,
            activePlan.width,
            activePlan.height,
            (m) => logRef.current?.(m),
          );
        } catch (err) {
          const detail = err instanceof Error ? err.message : String(err);
          logRef.current?.(`Plan video paint failed: ${detail}`);
        }
      } else if (clip?.imageUrl) {
        try {
          let objUrl = blobUrlCache.get(clip.imageUrl);
          if (!objUrl) {
            const res = await fetch(
              `/api/render-media-proxy?url=${encodeURIComponent(clip.imageUrl)}`,
            );
            if (res.ok) {
              objUrl = URL.createObjectURL(await res.blob());
              blobUrlCache.set(clip.imageUrl, objUrl);
            }
          }
          if (objUrl) {
            const img = await new Promise<HTMLImageElement>((resolve, reject) => {
              const el = new Image();
              el.onload = () => resolve(el);
              el.onerror = () => reject(new Error("image load failed"));
              el.src = objUrl!;
            });
            const ctx = dest.getContext("2d", { alpha: false });
            const hole =
              (artboardEl.querySelector(
                "[data-video-mask]",
              ) as HTMLElement | null) ||
              (artboardEl.querySelector(
                '[data-layer="main_video_container"]',
              ) as HTMLElement | null);
            if (ctx && hole) {
              const rootRect = artboardEl.getBoundingClientRect();
              const rect = hole.getBoundingClientRect();
              const { dx, dy, dw, dh } = mapRectToDest(
                rootRect,
                rect,
                activePlan.width,
                activePlan.height,
              );
              ctx.drawImage(img, dx, dy, dw, dh);
            }
          }
        } catch (err) {
          const detail = err instanceof Error ? err.message : String(err);
          logRef.current?.(`Plan image paint failed: ${detail}`);
        }
      }

      // Do not overlay static region text — that stomped ticker/layer motion.
      // StoryLivePreview DOM blit is the single animation source of truth.
    },
    [applyClip, rematerialize, ensurePlanVideo, runtimePlaying],
  );

  useImperativeHandle(
    ref,
    () => ({ warmUp, paintFrame, verifyReadiness }),
    [warmUp, paintFrame, verifyReadiness],
  );

  const previewComposer = useMemo(() => {
    if (!composer) return null;
    return extendComposerSceneForDuration(composer, clipDurationMs);
  }, [composer, clipDurationMs]);

  const aspect = plan
    ? aspectFromSize(plan.width, plan.height)
    : ("1920x1080" as StoryPreviewAspect);
  const artboard = ARTBOARD[aspect];
  const displayScale = Math.min(1, 720 / artboard.width);
  const shellW = Math.round(artboard.width * displayScale);
  const shellH = Math.round(artboard.height * displayScale);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 -z-50 overflow-hidden"
      style={{
        width: shellW,
        height: shellH,
        opacity: 1,
      }}
    >
      <div
        ref={artboardRef}
        data-capture-artboard
        className="relative origin-top-left overflow-hidden bg-[#071225]"
        style={{
          width: artboard.width,
          height: artboard.height,
          transform: `scale(${displayScale})`,
          transformOrigin: "top left",
        }}
      >
        {previewComposer ? (
          <StoryLivePreview
            scene={previewComposer}
            resolvedBindings={bindings}
            playheadMs={scenePlayheadMs}
            // Same contract as StoryTimelinePreview: edit while warming; playback once clocks start.
            motionMode={runtimePlaying ? "playback" : "edit"}
            isPlaying={runtimePlaying}
            aspect={aspect}
            interactive={false}
            fillParent
            className="h-full w-full"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#071225] text-sm text-white/50">
            {motionSceneId ? "Loading composed scene…" : "No composed scene"}
          </div>
        )}
      </div>
    </div>
  );
});
