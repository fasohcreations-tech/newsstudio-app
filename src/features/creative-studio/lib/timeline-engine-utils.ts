import { PIXELS_PER_SECOND } from "@/features/creative-studio/constants/creative-studio.constants";

export function msToPx(ms: number, zoom: number) {
  return (ms / 1000) * PIXELS_PER_SECOND * zoom;
}

export function pxToMs(px: number, zoom: number) {
  return (px / (PIXELS_PER_SECOND * zoom)) * 1000;
}

export function formatRulerLabel(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${seconds}s`;
}

export function rulerTickStepMs(zoom: number, durationMs: number) {
  if (zoom >= 2) return 1000;
  if (zoom >= 1) return 5000;
  if (durationMs > 300_000) return 60_000;
  return 10_000;
}
