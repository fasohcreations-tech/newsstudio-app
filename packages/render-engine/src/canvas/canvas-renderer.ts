/**
 * Canvas Renderer — presents one Timeline frame.
 *
 * Clear → Background → Video → Images → Shapes → Text → Logo → Ad →
 * Lower Third → Ticker → Effects → Present
 */

import { applyLayerTransform } from "./geometry";
import { drawEffectLayer } from "./effects-renderer";
import { drawImageLayer, drawMediaPlaceholder } from "./image-renderer";
import { drawShapeLayer } from "./shape-renderer";
import { drawLayerSweeps } from "./sweep-renderer";
import { drawTextLayer } from "./text-renderer";
import { drawVideoLayer } from "./video-renderer";
import type { FrameState, RawFramePacket } from "../types";
import type { SceneRuntime } from "../scene-runtime";

export type CanvasRendererOptions = {
  canvas: HTMLCanvasElement;
  runtime: SceneRuntime;
  /** When true, also return RGBA bytes for FFmpeg rawvideo. */
  exportRaw?: boolean;
};

export class CanvasRenderer {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  private runtime: SceneRuntime;
  private exportRaw: boolean;

  constructor(opts: CanvasRendererOptions) {
    const ctx = opts.canvas.getContext("2d", {
      alpha: false,
      willReadFrequently: Boolean(opts.exportRaw),
    });
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    this.canvas = opts.canvas;
    this.ctx = ctx;
    this.runtime = opts.runtime;
    this.exportRaw = opts.exportRaw ?? false;
  }

  async present(state: FrameState): Promise<RawFramePacket | null> {
    const { width, height } = this.runtime.plan;
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }

    const ctx = this.ctx;
    const scene = state.scene;
    const clip = state.clip;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = scene?.background || "#071225";
    ctx.fillRect(0, 0, width, height);

    // Draw in compositor order buckets so region kinds stay consistent even if
    // sort_order is sparse.
    const order: Array<FrameState["layers"][number]["kind"]> = [
      "background",
      "video",
      "image",
      "shape",
      "text",
      "logo",
      "advertisement",
      "lower_third",
      "ticker",
      "effect",
      "unknown",
    ];

    const byKind = new Map<string, typeof state.layers>();
    for (const layer of state.layers) {
      const list = byKind.get(layer.kind) ?? [];
      list.push(layer);
      byKind.set(layer.kind, list);
    }
    // Within a bucket, honour the document's stacking order so chrome (e.g. the
    // lower-third bar) cannot paint over accent shapes authored above it.
    for (const list of byKind.values()) {
      list.sort((a, b) => a.sortOrder - b.sortOrder);
    }

    for (const kind of order) {
      const layers = byKind.get(kind) ?? [];
      for (const layer of layers) {
        ctx.save();
        applyLayerTransform(
          ctx,
          layer.transform.x,
          layer.transform.y,
          layer.transform.width,
          layer.transform.height,
          layer.motion,
        );

        let drawn = false;
        const isMainVideo =
          kind === "video" ||
          layer.regionKey === "main-video" ||
          layer.regionKey === "main_video_container";
        if (isMainVideo) {
          drawn = await drawVideoLayer(
            ctx,
            layer,
            this.runtime,
            state.scenePlayheadMs,
            clip?.videoUrl ?? null,
          );
          if (!drawn && clip?.imageUrl) {
            drawn = drawImageLayer(
              ctx,
              layer,
              this.runtime,
              clip.imageUrl,
              state.scenePlayheadMs,
            );
          }
        } else if (kind === "image" || kind === "logo" || kind === "advertisement") {
          // Never fall back generic image slots to the story main image —
          // that painted the flood photo into the logo / optional-info holes.
          const fallback =
            kind === "logo"
              ? clip?.logoUrl
              : kind === "advertisement"
                ? clip?.advertisementUrl
                : null;
          drawn = drawImageLayer(
            ctx,
            layer,
            this.runtime,
            fallback,
            state.scenePlayheadMs,
          );
          // Keep unresolved media regions visible instead of silently blank.
          if (!drawn && layer.shape?.enabled) {
            drawn = drawShapeLayer(ctx, layer);
          }
          if (!drawn) drawn = drawMediaPlaceholder(ctx, layer);
        } else if (kind === "shape") {
          // A shape slot can still carry assigned media (skeleton panels).
          if (layer.mediaUrl || layer.mediaPlaylist?.length) {
            drawn = drawImageLayer(
              ctx,
              layer,
              this.runtime,
              null,
              state.scenePlayheadMs,
            );
          }
          drawn = drawShapeLayer(ctx, layer) || drawn;
        } else if (
          kind === "text" ||
          kind === "lower_third" ||
          kind === "ticker"
        ) {
          const override =
            layer.regionKey === "headline"
              ? clip?.headline
              : layer.regionKey === "subheadline"
                ? clip?.subheadline
                : layer.regionKey === "ticker" || kind === "ticker"
                  ? clip?.tickerText
                  : kind === "lower_third"
                    ? clip?.headline
                    : null;
          // Chrome (bar/panel) first, then text on top.
          if (layer.shape?.enabled) {
            drawn = drawShapeLayer(ctx, layer);
          }
          drawn = drawTextLayer(ctx, layer, override) || drawn;
        } else if (kind === "effect") {
          drawn = drawEffectLayer(ctx, layer);
        } else if (kind === "background") {
          if (layer.mediaUrl) {
            drawn = drawImageLayer(ctx, layer, this.runtime);
          } else if (layer.shape?.enabled) {
            drawn = drawShapeLayer(ctx, layer);
          } else {
            ctx.fillStyle = layer.color || scene?.background || "#071225";
            ctx.fillRect(
              layer.transform.x,
              layer.transform.y,
              layer.transform.width,
              layer.transform.height,
            );
            drawn = true;
          }
        } else {
          if (layer.shape?.enabled) drawn = drawShapeLayer(ctx, layer);
          if (layer.text) drawn = drawTextLayer(ctx, layer) || drawn;
          if (layer.mediaUrl) {
            drawn =
              (await drawVideoLayer(
                ctx,
                layer,
                this.runtime,
                state.scenePlayheadMs,
                null,
              )) ||
              drawImageLayer(ctx, layer, this.runtime) ||
              drawn;
          }
        }

        // Sweeps ride above the layer's own content (rim / highlight passes).
        drawLayerSweeps(ctx, layer);

        layer.drawn = drawn;
        ctx.restore();
      }
    }

    // Always paint plan main media into the video hole if no layer drew it.
    if (clip?.videoUrl || clip?.imageUrl) {
      const hole =
        state.layers.find(
          (l) =>
            l.regionKey === "main-video" ||
            l.regionKey === "main_video_container" ||
            l.kind === "video",
        ) ?? null;
      const anyMainDrawn = state.layers.some(
        (l) =>
          l.drawn &&
          (l.kind === "video" ||
            l.regionKey === "main-video" ||
            l.regionKey === "main_video_container"),
      );
      if (hole && !anyMainDrawn) {
        ctx.save();
        applyLayerTransform(
          ctx,
          hole.transform.x,
          hole.transform.y,
          hole.transform.width,
          hole.transform.height,
          hole.motion,
        );
        if (clip.videoUrl) {
          await drawVideoLayer(
            ctx,
            { ...hole, mediaUrl: clip.videoUrl, mediaKind: "video" },
            this.runtime,
            state.scenePlayheadMs,
            clip.videoUrl,
          );
        } else if (clip.imageUrl) {
          drawImageLayer(
            ctx,
            { ...hole, mediaUrl: clip.imageUrl, mediaKind: "image" },
            this.runtime,
            clip.imageUrl,
            state.scenePlayheadMs,
          );
        }
        ctx.restore();
      }
    }

    if (!this.exportRaw) return null;
    const image = ctx.getImageData(0, 0, width, height);
    return {
      frameIndex: state.frameIndex,
      playheadMs: state.playheadMs,
      width,
      height,
      rgba: image.data,
    };
  }
}
