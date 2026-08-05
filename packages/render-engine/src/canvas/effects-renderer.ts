/**
 * Effects Renderer — glow, soft shadow, highlight overlays.
 */

import type { RuntimeLayerFrame } from "../types";

export function drawEffectLayer(
  ctx: CanvasRenderingContext2D,
  layer: RuntimeLayerFrame,
): boolean {
  const { x, y, width, height } = layer.transform;
  const kind = String(layer.metadata?.effectKind ?? "soft_shadow");

  ctx.save();
  if (kind === "glow") {
    ctx.shadowColor = String(layer.color ?? "rgba(80,180,255,0.7)");
    ctx.shadowBlur = Number(layer.metadata?.blur ?? 24);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fillRect(x, y, width, height);
  } else if (kind === "highlight") {
    const g = ctx.createLinearGradient(x, y, x + width, y);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.5, "rgba(255,255,255,0.18)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, width, height);
  } else {
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = Number(layer.metadata?.blur ?? 16);
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = "rgba(0,0,0,0.01)";
    ctx.fillRect(x, y, width, height);
  }
  ctx.restore();
  return true;
}
