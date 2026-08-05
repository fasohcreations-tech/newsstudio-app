/**
 * Text Renderer — headline, subheadline, ticker, captions.
 * Fonts must be loaded once before the frame loop.
 */

import type { RuntimeLayerFrame } from "../types";

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let line = words[0]!;
  for (let i = 1; i < words.length; i += 1) {
    const next = `${line} ${words[i]}`;
    if (ctx.measureText(next).width <= maxWidth) {
      line = next;
    } else {
      lines.push(line);
      line = words[i]!;
    }
  }
  lines.push(line);
  return lines;
}

export function drawTextLayer(
  ctx: CanvasRenderingContext2D,
  layer: RuntimeLayerFrame,
  overrideText?: string | null,
): boolean {
  const text = (overrideText ?? layer.text ?? "").trim();
  if (!text) return false;

  const { x, y, width, height } = layer.transform;
  const size = layer.fontSize || Math.max(14, Math.round(height * 0.45));
  const family = layer.fontFamily || "Segoe UI, system-ui, sans-serif";
  const weight = layer.fontWeight ?? 600;
  const color = layer.color || "#ffffff";
  const align = layer.textAlign || "left";

  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";

  const pad = Math.round(width * 0.02);
  const maxW = Math.max(8, width - pad * 2);
  const lines = wrapLines(ctx, text.replace(/\*\*/g, ""), maxW);
  const lineH = size * 1.25;
  const totalH = lines.length * lineH;
  let ty = y + (height - totalH) / 2 + lineH / 2;
  const tx =
    align === "center" ? x + width / 2 : align === "right" ? x + width - pad : x + pad;

  // Marquee for ticker: scroll from playhead-derived offset stored on metadata
  const scroll = Number(layer.metadata?.scrollOffsetPx ?? 0);
  if (layer.kind === "ticker" && scroll) {
    ctx.translate(-scroll, 0);
  }

  for (const line of lines.slice(0, 6)) {
    ctx.fillText(line, tx, ty, maxW);
    ty += lineH;
  }
  ctx.restore();
  return true;
}

export async function ensureFontsLoaded(
  families: string[],
): Promise<void> {
  if (typeof document === "undefined" || !document.fonts?.load) return;
  await Promise.all(
    families.map((f) =>
      document.fonts.load(`600 24px ${f}`).catch(() => undefined),
    ),
  );
  await document.fonts.ready.catch(() => undefined);
}
