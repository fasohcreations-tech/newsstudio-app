/**
 * Shared Canvas2D geometry helpers.
 */

export function drawCover(
  ctx: CanvasRenderingContext2D,
  media: CanvasImageSource,
  x: number,
  y: number,
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
  const dx = x + (width - dw) / 2;
  const dy = y + (height - dh) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();
  ctx.drawImage(media, dx, dy, dw, dh);
  ctx.restore();
}

export function drawContain(
  ctx: CanvasRenderingContext2D,
  media: CanvasImageSource,
  x: number,
  y: number,
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
  const scale = Math.min(width / Math.max(1, mw), height / Math.max(1, mh));
  const dw = mw * scale;
  const dh = mh * scale;
  const dx = x + (width - dw) / 2;
  const dy = y + (height - dh) / 2;
  ctx.drawImage(media, dx, dy, dw, dh);
}

export function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number | { topLeft: number; topRight: number; bottomRight: number; bottomLeft: number },
) {
  const radii =
    typeof r === "number"
      ? { topLeft: r, topRight: r, bottomRight: r, bottomLeft: r }
      : r;
  const tl = Math.min(radii.topLeft, w / 2, h / 2);
  const tr = Math.min(radii.topRight, w / 2, h / 2);
  const br = Math.min(radii.bottomRight, w / 2, h / 2);
  const bl = Math.min(radii.bottomLeft, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
  ctx.lineTo(x + w, y + h - br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
  ctx.lineTo(x + bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
  ctx.lineTo(x, y + tl);
  ctx.quadraticCurveTo(x, y, x + tl, y);
  ctx.closePath();
}

export function applyLayerTransform(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  motion: {
    translateX: number;
    translateY: number;
    scale: number;
    rotateZ: number;
    opacity: number;
  },
) {
  const cx = x + width / 2;
  const cy = y + height / 2;
  ctx.globalAlpha = Math.max(0, Math.min(1, motion.opacity));
  ctx.translate(cx + motion.translateX, cy + motion.translateY);
  ctx.rotate((motion.rotateZ * Math.PI) / 180);
  ctx.scale(motion.scale || 1, motion.scale || 1);
  ctx.translate(-cx, -cy);
}
