/**
 * Canvas Renderer — presents one Timeline frame.
 *
 * Clear → Background → Video → Images → Shapes → Text → Logo → Ad →
 * Lower Third → Ticker → Effects → Present
 */

import { applyLayerTransform } from "./geometry";
import { drawEffectLayer } from "./effects-renderer";
import { drawImageLayer } from "./image-renderer";
import { drawShapeLayer } from "./shape-renderer";
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
        if (kind === "video" || layer.regionKey === "main_video_container") {
          drawn = await drawVideoLayer(
            ctx,
            layer,
            this.runtime,
            state.scenePlayheadMs,
            clip?.videoUrl ?? null,
          );
          if (!drawn && clip?.imageUrl) {
            drawn = drawImageLayer(ctx, layer, this.runtime, clip.imageUrl);
          }
        } else if (kind === "image" || kind === "logo" || kind === "advertisement") {
          const fallback =
            kind === "logo"
              ? clip?.logoUrl
              : kind === "advertisement"
                ? clip?.advertisementUrl
                : clip?.imageUrl;
          drawn = drawImageLayer(ctx, layer, this.runtime, fallback);
        } else if (kind === "shape") {
          drawn = drawShapeLayer(ctx, layer);
        } else if (
          kind === "text" ||
          kind === "lower_third" ||
          kind === "ticker"
        ) {
          const override =
            layer.regionKey === "headline" || kind === "lower_third"
              ? clip?.headline
              : layer.regionKey === "subheadline"
                ? clip?.subheadline
                : layer.regionKey === "ticker" || kind === "ticker"
                  ? clip?.tickerText
                  : null;
          drawn = drawTextLayer(ctx, layer, override);
          // Shape chrome behind text bars
          if (layer.shape?.enabled) {
            drawShapeLayer(ctx, layer);
            drawn = drawTextLayer(ctx, layer, override) || drawn;
          }
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

        layer.drawn = drawn;
        ctx.restore();
      }
    }

    // Always paint plan main media into the video hole if no layer drew it.
    if (clip?.videoUrl || clip?.imageUrl) {
      const hole =
        state.layers.find((l) => l.regionKey === "main_video_container") ??
        state.layers.find((l) => l.kind === "video");
      if (hole && !hole.drawn) {
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
