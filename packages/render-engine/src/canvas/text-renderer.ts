/**
 * Text Renderer — headline, subheadline, ticker, captions.
 * Fonts must be loaded once before the frame loop.
 * Styling is resolved upstream by the app adapter to mirror StoryLivePreview
 * / Feature 043 Text Layer exactly.
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

function applyLetterSpacing(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  spacing: number,
  maxWidth?: number,
) {
  if (!spacing) {
    if (maxWidth != null) ctx.fillText(text, x, y, maxWidth);
    else ctx.fillText(text, x, y);
    return;
  }
  const align = ctx.textAlign;
  let cursor = x;
  if (align === "center" || align === "right") {
    let total = 0;
    for (let i = 0; i < text.length; i += 1) {
      total += ctx.measureText(text[i]!).width + (i > 0 ? spacing : 0);
    }
    cursor = align === "center" ? x - total / 2 : x - total;
    const prev = ctx.textAlign;
    ctx.textAlign = "left";
    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i]!;
      ctx.fillText(ch, cursor, y);
      cursor += ctx.measureText(ch).width + spacing;
    }
    ctx.textAlign = prev;
    return;
  }
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]!;
    ctx.fillText(ch, cursor, y);
    cursor += ctx.measureText(ch).width + spacing;
  }
}

function paintTextEffects(
  ctx: CanvasRenderingContext2D,
  layer: RuntimeLayerFrame,
) {
  const shadow = layer.textShadow;
  const glow = layer.textGlow;
  if (shadow) {
    ctx.shadowColor = shadow.color;
    ctx.shadowBlur = shadow.blur;
    ctx.shadowOffsetX = shadow.offsetX;
    ctx.shadowOffsetY = shadow.offsetY;
  } else if (glow) {
    ctx.shadowColor = glow.color;
    ctx.shadowBlur = glow.blur * Math.max(1, glow.strength);
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  } else {
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }
}

function resolveFillStyle(
  ctx: CanvasRenderingContext2D,
  layer: RuntimeLayerFrame,
  x: number,
  y: number,
  width: number,
  height: number,
): string | CanvasGradient {
  const gradient = layer.textGradient;
  if (!gradient || gradient.stops.length < 2) {
    return layer.color || "#ffffff";
  }
  const g =
    gradient.type === "radial"
      ? ctx.createRadialGradient(
          x + width / 2,
          y + height / 2,
          0,
          x + width / 2,
          y + height / 2,
          Math.max(width, height) / 2,
        )
      : (() => {
          const rad = ((gradient.angle - 90) * Math.PI) / 180;
          const cx = x + width / 2;
          const cy = y + height / 2;
          const dx = Math.cos(rad) * width;
          const dy = Math.sin(rad) * height;
          return ctx.createLinearGradient(cx - dx / 2, cy - dy / 2, cx + dx / 2, cy + dy / 2);
        })();
  for (const stop of gradient.stops) {
    g.addColorStop(
      Math.min(1, Math.max(0, stop.offset)),
      stop.color,
    );
  }
  return g;
}

function drawStyledText(
  ctx: CanvasRenderingContext2D,
  layer: RuntimeLayerFrame,
  text: string,
  x: number,
  y: number,
  box: { x: number; y: number; width: number; height: number },
  maxWidth?: number,
) {
  paintTextEffects(ctx, layer);
  const stroke = layer.textStroke;
  if (stroke && stroke.width > 0) {
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width * 2;
    ctx.lineJoin = "round";
    if (maxWidth != null) ctx.strokeText(text, x, y, maxWidth);
    else ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = resolveFillStyle(
    ctx,
    layer,
    box.x,
    box.y,
    box.width,
    box.height,
  );
  applyLetterSpacing(ctx, text, x, y, layer.letterSpacing ?? 0, maxWidth);

  if (layer.underline) {
    const metrics = ctx.measureText(text);
    const width =
      metrics.width +
      (layer.letterSpacing ?? 0) * Math.max(0, text.length - 1);
    let left = x;
    if (ctx.textAlign === "center") left = x - width / 2;
    if (ctx.textAlign === "right") left = x - width;
    const size = layer.fontSize || 16;
    ctx.beginPath();
    ctx.strokeStyle = layer.color || "#ffffff";
    ctx.lineWidth = Math.max(1, size * 0.06);
    ctx.moveTo(left, y + size * 0.35);
    ctx.lineTo(left + width, y + size * 0.35);
    ctx.stroke();
  }
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
  const family = layer.fontFamily || "system-ui, sans-serif";
  const weight = layer.fontWeight ?? 600;
  const italic = layer.fontStyle === "italic" ? "italic " : "";
  const align = layer.textAlign || "left";
  const pad = layer.padding ?? {
    top: 8,
    right: Math.round(width * 0.03) + 8,
    bottom: 8,
    left: Math.round(width * 0.03) + 8,
  };

  ctx.save();
  ctx.font = `${italic}${weight} ${size}px ${family}`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";

  const maxW = Math.max(8, width - pad.left - pad.right);
  const lineH = size * (layer.lineHeight || 1.3);

  if (layer.singleLine || layer.wrap === false) {
    // Ticker / nowrap: clip to the bar and draw a single line, vertically centered.
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();
    const tx =
      align === "center"
        ? x + width / 2
        : align === "right"
          ? x + width - pad.right
          : x + pad.left;
    drawStyledText(ctx, layer, text, tx, y + height / 2, { x, y, width, height });
    ctx.restore();
    return true;
  }

  const lines = wrapLines(ctx, text, maxW);
  const totalH = lines.length * lineH;
  const vAlign = layer.verticalAlign ?? "middle";
  let ty =
    vAlign === "top"
      ? y + pad.top + lineH / 2
      : vAlign === "bottom"
        ? y + height - totalH - pad.bottom + lineH / 2
        : y + (height - totalH) / 2 + lineH / 2;

  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();
  const tx =
    align === "center"
      ? x + width / 2
      : align === "right"
        ? x + width - pad.right
        : x + pad.left;
  for (const line of lines) {
    drawStyledText(
      ctx,
      layer,
      line,
      tx,
      ty,
      { x, y, width, height },
      maxW,
    );
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
