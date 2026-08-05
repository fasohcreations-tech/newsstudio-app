/**
 * Text Renderer — headline, subheadline, ticker, captions.
 * Fonts must be loaded once before the frame loop.
 * Styling (size/weight/color/align/panel fill) is resolved upstream by the
 * app adapter to mirror StoryLivePreview exactly.
 */

import { roundRectPath } from "./geometry";
import type { RuntimeLayerFrame } from "../types";

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const out: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      out.push("");
      continue;
    }
    let line = words[0]!;
    for (let i = 1; i < words.length; i += 1) {
      const next = `${line} ${words[i]}`;
      if (ctx.measureText(next).width <= maxWidth) {
        line = next;
      } else {
        out.push(line);
        line = words[i]!;
      }
    }
    out.push(line);
  }
  return out;
}

/** Paint a solid chrome bar behind the layer (lower-third panel, ticker). */
export function drawLayerBackground(
  ctx: CanvasRenderingContext2D,
  layer: RuntimeLayerFrame,
): boolean {
  const fill = layer.backgroundFill;
  if (!fill || fill === "transparent" || fill === "none") return false;
  const { x, y, width, height } = layer.transform;
  ctx.save();
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, width, height);
  const border = layer.metadata?.lowerPanelBorder as string | undefined;
  if (border) {
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
  }
  ctx.restore();
  return true;
}

export function drawTextLayer(
  ctx: CanvasRenderingContext2D,
  layer: RuntimeLayerFrame,
  overrideText?: string | null,
): boolean {
  drawLayerBackground(ctx, layer);

  const text = (overrideText ?? layer.text ?? "")
    .replace(/\*\*/g, "")
    .replace(/^[-*_\s]+$/gm, "")
    .trim();
  if (!text) {
    // Still paint the chrome bar (ticker) even when copy is empty.
    return Boolean(layer.backgroundFill);
  }

  const { x, y, width, height } = layer.transform;
  const size = layer.fontSize || Math.max(14, Math.round(height * 0.4));
  const family = layer.fontFamily || 'system-ui, sans-serif';
  const weight = layer.fontWeight ?? 600;
  const color = layer.color || "#ffffff";
  const align = layer.textAlign || "left";

  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";

  const padX = Math.round(width * 0.03) + 8;
  const padY = 8;
  const maxW = Math.max(8, width - padX * 2);
  const lineH = size * (layer.lineHeight || 1.3);

  if (layer.singleLine) {
    // Ticker: clip to the bar and draw a single line, vertically centered.
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();
    const tx = align === "center" ? x + width / 2 : align === "right" ? x + width - padX : x + padX;
    ctx.fillText(text, tx, y + height / 2);
    ctx.restore();
    return true;
  }

  const lines = wrapLines(ctx, text, maxW);
  const totalH = lines.length * lineH;
  const vAlign = layer.verticalAlign ?? "middle";
  let ty =
    vAlign === "top"
      ? y + padY + lineH / 2
      : vAlign === "bottom"
        ? y + height - totalH - padY + lineH / 2
        : y + (height - totalH) / 2 + lineH / 2;

  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();
  const tx =
    align === "center"
      ? x + width / 2
      : align === "right"
        ? x + width - padX
        : x + padX;
  for (const line of lines) {
    ctx.fillText(line, tx, ty, maxW);
    ty += lineH;
  }
  ctx.restore();
  return true;
}

export async function ensureFontsLoaded(families: string[]): Promise<void> {
  if (typeof document === "undefined" || !document.fonts?.load) return;
  const weights = [400, 700, 800];
  await Promise.all(
    families.flatMap((f) =>
      weights.map((w) =>
        document.fonts.load(`${w} 32px "${f}"`).catch(() => undefined),
      ),
    ),
  );
  await document.fonts.ready.catch(() => undefined);
}

// roundRectPath re-export kept for callers that draw rounded panels.
export { roundRectPath };
