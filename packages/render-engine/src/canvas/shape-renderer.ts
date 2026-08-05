/**
 * Shape Renderer — Canvas2D drawing commands for Shape Composer kinds.
 */

import { roundRectPath } from "./geometry";
import type { RuntimeLayerFrame, RuntimeShape } from "../types";

function fillStyle(
  ctx: CanvasRenderingContext2D,
  shape: RuntimeShape,
  x: number,
  y: number,
  w: number,
  h: number,
): string | CanvasGradient {
  if (shape.gradient && shape.gradient.stops.length > 0) {
    const g =
      shape.gradient.type === "radial"
        ? ctx.createRadialGradient(
            x + w / 2,
            y + h / 2,
            0,
            x + w / 2,
            y + h / 2,
            Math.max(w, h) / 2,
          )
        : ctx.createLinearGradient(x, y, x + w, y + h);
    for (const stop of shape.gradient.stops) {
      g.addColorStop(Math.max(0, Math.min(1, stop.offset)), stop.color);
    }
    return g;
  }
  return shape.fill || "#ffffff";
}

function drawShapeGeometry(
  ctx: CanvasRenderingContext2D,
  shape: RuntimeShape,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const kind = shape.kind;
  if (kind === "circle") {
    const r = Math.min(w, h) / 2;
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h / 2, r, 0, Math.PI * 2);
    return;
  }
  if (kind === "ellipse") {
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    return;
  }
  if (kind === "triangle") {
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    return;
  }
  if (kind === "line") {
    ctx.beginPath();
    ctx.moveTo(x, y + h / 2);
    ctx.lineTo(x + w, y + h / 2);
    return;
  }
  if ((kind === "path" || kind === "svg_path") && shape.path) {
    try {
      const p = new Path2D(shape.path);
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(w / 100 || 1, h / 100 || 1);
      ctx.fill(p);
      if (shape.stroke && (shape.strokeWidth ?? 0) > 0) {
        ctx.strokeStyle = shape.stroke;
        ctx.lineWidth = shape.strokeWidth ?? 1;
        ctx.stroke(p);
      }
      ctx.restore();
      return;
    } catch {
      /* fall through */
    }
  }

  const radius =
    shape.cornerRadii ??
    (typeof shape.radius === "number" ? shape.radius : 0);
  roundRectPath(ctx, x, y, w, h, radius);
}

function drawLightSweep(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  progress: number,
) {
  const px = x + w * Math.max(0, Math.min(1, progress));
  const grad = ctx.createLinearGradient(px - w * 0.15, y, px + w * 0.15, y);
  grad.addColorStop(0, "rgba(255,255,255,0)");
  grad.addColorStop(0.5, "rgba(255,255,255,0.35)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
}

function drawEdgeSweep(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  progress: number,
) {
  const peri = 2 * (w + h);
  const len = peri * 0.18;
  const start = peri * Math.max(0, Math.min(1, progress));
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = Math.max(2, Math.min(w, h) * 0.02);
  ctx.shadowColor = "rgba(120,200,255,0.9)";
  ctx.shadowBlur = 12;
  ctx.beginPath();
  const pts: Array<[number, number]> = [];
  for (let d = 0; d <= len; d += 4) {
    const t = (start + d) % peri;
    if (t < w) pts.push([x + t, y]);
    else if (t < w + h) pts.push([x + w, y + (t - w)]);
    else if (t < 2 * w + h) pts.push([x + w - (t - w - h), y + h]);
    else pts.push([x, y + h - (t - 2 * w - h)]);
  }
  if (pts.length) {
    ctx.moveTo(pts[0]![0], pts[0]![1]);
    for (let i = 1; i < pts.length; i += 1) {
      ctx.lineTo(pts[i]![0], pts[i]![1]);
    }
    ctx.stroke();
  }
  ctx.restore();
}

export function drawShapeLayer(
  ctx: CanvasRenderingContext2D,
  layer: RuntimeLayerFrame,
): boolean {
  const shape = layer.shape;
  if (!shape?.enabled) return false;

  const { x, y, width, height } = layer.transform;
  const b = shape.behaviour;
  const ox = x + (b?.translateX ?? 0);
  const oy = y + (b?.translateY ?? 0);
  const scale = b?.scale ?? 1;
  const rot = b?.rotation ?? 0;

  ctx.save();
  if (shape.shadow) {
    ctx.shadowColor = shape.shadow.color;
    ctx.shadowBlur = shape.shadow.blur;
    ctx.shadowOffsetX = shape.shadow.offsetX;
    ctx.shadowOffsetY = shape.shadow.offsetY;
  }
  if (shape.glow) {
    ctx.shadowColor = shape.glow.color;
    ctx.shadowBlur = shape.glow.blur * (shape.glow.strength || 1);
  }

  const cx = ox + width / 2;
  const cy = oy + height / 2;
  ctx.translate(cx, cy);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.scale(scale, scale);
  ctx.translate(-cx, -cy);
  ctx.globalAlpha *= b?.opacity ?? 1;

  const reveal = shape.revealProgress;
  if (typeof reveal === "number" && reveal < 1) {
    ctx.beginPath();
    ctx.rect(ox, oy, width * Math.max(0, reveal), height);
    ctx.clip();
  }

  drawShapeGeometry(ctx, shape, ox, oy, width, height);
  if (shape.kind !== "path" && shape.kind !== "svg_path") {
    ctx.fillStyle = fillStyle(ctx, shape, ox, oy, width, height);
    if (shape.fill !== "none" && shape.kind !== "line") ctx.fill();
    if (shape.stroke && (shape.strokeWidth ?? 0) > 0) {
      ctx.strokeStyle = shape.stroke;
      ctx.lineWidth = shape.strokeWidth ?? 1;
      ctx.stroke();
    }
  }

  if (typeof b?.lightSweepProgress === "number") {
    drawLightSweep(ctx, ox, oy, width, height, b.lightSweepProgress);
  }
  if (typeof b?.edgeSweepProgress === "number") {
    drawEdgeSweep(ctx, ox, oy, width, height, b.edgeSweepProgress);
  }

  ctx.restore();
  return true;
}
