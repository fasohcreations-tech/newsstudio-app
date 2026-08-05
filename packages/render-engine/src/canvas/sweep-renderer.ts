/**
 * Sweep Renderer — Light Sweep (broadcast effect stack) and Edge Sweep
 * (per-object edge_sweep behaviour), drawn as Canvas overlays.
 *
 * Both are sampled from the Timeline playhead upstream; this module only draws
 * the sampled state.
 */

import type { RuntimeEdgeSweep, RuntimeLayerFrame, RuntimeLightSweep } from "../types";

function withAlpha(color: string, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha));
  if (color.startsWith("#")) {
    const hex = color.slice(1);
    const full =
      hex.length === 3
        ? hex
            .split("")
            .map((c) => c + c)
            .join("")
        : hex;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  }
  if (color.startsWith("rgb(")) {
    return color.replace("rgb(", "rgba(").replace(")", `,${a})`);
  }
  if (color.startsWith("rgba(")) {
    // Scale the authored alpha — returning it untouched made the sweep's
    // "transparent" gradient stops opaque, so no band was ever visible.
    const parts = color
      .slice(5, color.lastIndexOf(")"))
      .split(",")
      .map((p) => p.trim());
    if (parts.length === 4) {
      const base = Number(parts[3]);
      const scaled = Number.isFinite(base) ? base * a : a;
      return `rgba(${parts[0]},${parts[1]},${parts[2]},${scaled})`;
    }
  }
  // Named / unparseable colors: never let a fade-out stop stay opaque.
  return a <= 0.001 ? "rgba(0,0,0,0)" : color;
}

/** CSS mix-blend-mode → closest Canvas2D composite operation. */
function blendToComposite(mode: string): GlobalCompositeOperation {
  switch (mode) {
    case "screen":
      return "screen";
    case "overlay":
      return "overlay";
    case "soft-light":
      return "soft-light";
    case "plus-lighter":
      return "lighter";
    case "normal":
    default:
      return "source-over";
  }
}

/**
 * Highlight band that travels across the box along the CSS sweep angle,
 * matching the preview's `linear-gradient(<angle>deg …)` overlay.
 *
 * CSS angles are clockwise from "to top", so the travel axis is (sin, -cos).
 * We project the box onto that axis and slide a soft-edged band from one side
 * to the other — visually identical to the CSS background-position sweep but
 * robust for any angle (the earlier background-position port went faint/vertical).
 */
export function drawLightSweep(
  ctx: CanvasRenderingContext2D,
  sweep: RuntimeLightSweep,
  box: { x: number; y: number; width: number; height: number },
) {
  if (sweep.progress == null) return;

  const cov = sweep.coverage;
  const x = cov ? box.x + cov.left : box.x;
  const y = cov ? box.y + cov.top : box.y;
  const w = cov ? cov.width : box.width;
  const h = cov ? cov.height : box.height;
  if (w <= 0 || h <= 0) return;

  const rad = (sweep.angle * Math.PI) / 180;
  const ux = Math.sin(rad);
  const uy = -Math.cos(rad);

  // Projection extent of the box onto the travel axis.
  let minP = Infinity;
  let maxP = -Infinity;
  for (const [cxp, cyp] of [
    [x, y],
    [x + w, y],
    [x, y + h],
    [x + w, y + h],
  ] as const) {
    const p = cxp * ux + cyp * uy;
    if (p < minP) minP = p;
    if (p > maxP) maxP = p;
  }
  const span = maxP - minP;
  if (span <= 0) return;

  const soft = Math.min(0.95, Math.max(0.05, sweep.softness));
  // width (peak thickness) as a fraction of the projected span.
  const bandHalf = span * (Math.min(60, Math.max(4, sweep.width)) / 100) * 0.5 +
    span * 0.03;
  const travel = span + bandHalf * 2;
  const center = minP - bandHalf + sweep.progress * travel;

  // Gradient endpoints along the axis: value peaks at `center`.
  const g0 = center - bandHalf;
  const g1 = center + bandHalf;
  const grad = ctx.createLinearGradient(ux * g0, uy * g0, ux * g1, uy * g1);
  const edgeSoft = 0.12 + soft * 0.32;
  grad.addColorStop(0, withAlpha(sweep.color, 0));
  grad.addColorStop(Math.min(0.49, edgeSoft), withAlpha(sweep.color, sweep.opacity * 0.35));
  grad.addColorStop(0.5, withAlpha(sweep.color, sweep.opacity));
  grad.addColorStop(Math.max(0.51, 1 - edgeSoft), withAlpha(sweep.color, sweep.opacity * 0.35));
  grad.addColorStop(1, withAlpha(sweep.color, 0));

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.globalCompositeOperation = blendToComposite(sweep.blendMode);
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

type Pt = [number, number];

/** Perimeter points of a rounded rect, walked clockwise from the top-left. */
function perimeterPoints(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  steps: number,
): Pt[] {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  const straightW = Math.max(0, w - radius * 2);
  const straightH = Math.max(0, h - radius * 2);
  const arc = (Math.PI / 2) * radius;
  const total = straightW * 2 + straightH * 2 + arc * 4;
  if (total <= 0) return [];

  const pts: Pt[] = [];
  for (let i = 0; i < steps; i += 1) {
    let d = (i / steps) * total;

    // top edge
    if (d < straightW) {
      pts.push([x + radius + d, y]);
      continue;
    }
    d -= straightW;
    // top-right arc
    if (d < arc) {
      const a = -Math.PI / 2 + (d / arc) * (Math.PI / 2);
      pts.push([
        x + w - radius + Math.cos(a) * radius,
        y + radius + Math.sin(a) * radius,
      ]);
      continue;
    }
    d -= arc;
    // right edge
    if (d < straightH) {
      pts.push([x + w, y + radius + d]);
      continue;
    }
    d -= straightH;
    // bottom-right arc
    if (d < arc) {
      const a = (d / arc) * (Math.PI / 2);
      pts.push([
        x + w - radius + Math.cos(a) * radius,
        y + h - radius + Math.sin(a) * radius,
      ]);
      continue;
    }
    d -= arc;
    // bottom edge
    if (d < straightW) {
      pts.push([x + w - radius - d, y + h]);
      continue;
    }
    d -= straightW;
    // bottom-left arc
    if (d < arc) {
      const a = Math.PI / 2 + (d / arc) * (Math.PI / 2);
      pts.push([
        x + radius + Math.cos(a) * radius,
        y + h - radius + Math.sin(a) * radius,
      ]);
      continue;
    }
    d -= arc;
    // left edge
    if (d < straightH) {
      pts.push([x, y + h - radius - d]);
      continue;
    }
    d -= straightH;
    // top-left arc
    const a = Math.PI + (d / arc) * (Math.PI / 2);
    pts.push([
      x + radius + Math.cos(a) * radius,
      y + radius + Math.sin(a) * radius,
    ]);
  }
  return pts;
}

/** Highlight arc travelling around the object border. */
export function drawEdgeSweep(
  ctx: CanvasRenderingContext2D,
  sweep: RuntimeEdgeSweep,
  box: { x: number; y: number; width: number; height: number },
) {
  const { x, y, width: w, height: h } = box;
  if (w <= 0 || h <= 0) return;

  const STEPS = 480;
  const ring = perimeterPoints(x, y, w, h, sweep.cornerRadius, STEPS);
  if (ring.length === 0) return;

  const headIdx = Math.floor(sweep.progress * STEPS) % STEPS;
  const arcLen = Math.max(2, Math.round(sweep.length * STEPS));
  const trailLen = Math.max(0, Math.round(sweep.trailLength * arcLen));

  ctx.save();
  // Demo presets use blendMode "normal" — forcing additive blending made the
  // blue rim invisible on the white lower-information panel.
  ctx.globalCompositeOperation = blendToComposite(sweep.blendMode);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(1, sweep.width);
  if (sweep.glowIntensity > 0) {
    ctx.shadowColor = withAlpha(sweep.color, Math.min(1, sweep.glowIntensity));
    ctx.shadowBlur = Math.max(4, sweep.width * 3 * sweep.glowIntensity);
  }

  // Draw as short segments so the head can fade out along the trail.
  const total = arcLen + trailLen;
  for (let i = 0; i < total; i += 1) {
    // i = 0 is the bright head, increasing i trails behind it.
    const a = ring[(headIdx - i + STEPS * 2) % STEPS]!;
    const b = ring[(headIdx - i - 1 + STEPS * 2) % STEPS]!;
    const fade =
      i < arcLen
        ? 1 - (i / Math.max(1, arcLen)) * 0.35
        : 1 - (i - arcLen) / Math.max(1, trailLen);
    const alpha = sweep.opacity * Math.max(0, fade) * Math.max(0.2, sweep.brightness);
    if (alpha <= 0.002) continue;
    ctx.strokeStyle = withAlpha(sweep.color, Math.min(1, alpha));
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }

  ctx.restore();
}

/** Draw whichever sweeps are active for this layer. */
export function drawLayerSweeps(
  ctx: CanvasRenderingContext2D,
  layer: RuntimeLayerFrame,
): boolean {
  const sweeps = layer.sweeps;
  if (!sweeps) return false;
  const box = {
    x: layer.transform.x,
    y: layer.transform.y,
    width: layer.transform.width,
    height: layer.transform.height,
  };
  let drew = false;
  if (sweeps.light) {
    drawLightSweep(ctx, sweeps.light, box);
    drew = true;
  }
  if (sweeps.edge) {
    drawEdgeSweep(ctx, sweeps.edge, box);
    drew = true;
  }
  return drew;
}
