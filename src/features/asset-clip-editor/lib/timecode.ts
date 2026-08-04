/**
 * Timecode helpers for Asset Clip Editor (30fps default).
 * Ported from BroadcastOS clip-editor utils — keep FPS aligned with clip.frame_rate when needed.
 */

export const DEFAULT_FRAME_RATE = 30;

export function frameMs(frameRate = DEFAULT_FRAME_RATE): number {
  return 1000 / Math.max(1, frameRate);
}

export function formatTimecode(ms: number, frameRate = DEFAULT_FRAME_RATE): string {
  const step = frameMs(frameRate);
  const totalMs = Math.max(0, Math.floor(ms));
  const hours = Math.floor(totalMs / 3_600_000);
  const minutes = Math.floor((totalMs % 3_600_000) / 60_000);
  const seconds = Math.floor((totalMs % 60_000) / 1000);
  const frames = Math.floor((totalMs % 1000) / step);

  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  const ff = String(frames).padStart(2, "0");

  return hours > 0 ? `${hh}:${mm}:${ss}:${ff}` : `${mm}:${ss}:${ff}`;
}

export function parseTimecode(
  value: string,
  frameRate = DEFAULT_FRAME_RATE,
): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(":").map((part) => part.trim());
  if (
    parts.length < 2 ||
    parts.length > 4 ||
    parts.some((part) => part === "" || !/^\d+$/.test(part))
  ) {
    return null;
  }

  const numbers = parts.map((part) => Number(part));
  if (numbers.some((n) => !Number.isFinite(n) || n < 0)) return null;

  let hours = 0;
  let minutes = 0;
  let seconds = 0;
  let frames = 0;

  if (numbers.length === 2) {
    [minutes, seconds] = numbers;
  } else if (numbers.length === 3) {
    if (numbers[0]! >= 60) {
      [hours, minutes, seconds] = numbers;
    } else {
      [minutes, seconds, frames] = numbers;
    }
  } else {
    [hours, minutes, seconds, frames] = numbers;
  }

  if (minutes >= 60 || seconds >= 60 || frames >= frameRate) return null;

  return Math.round(
    hours * 3_600_000 +
      minutes * 60_000 +
      seconds * 1000 +
      frames * frameMs(frameRate),
  );
}

export function formatDurationShort(ms: number): string {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function frameStepMs(
  direction: 1 | -1,
  large = false,
  frameRate = DEFAULT_FRAME_RATE,
): number {
  const step = frameMs(frameRate);
  return direction * (large ? step * 10 : step);
}

export function extractYouTubeVideoId(url: string): string | null {
  try {
    const trimmed = url.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
    const parsed = new URL(trimmed);
    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id && id.length === 11 ? id : null;
    }
    if (parsed.hostname.includes("youtube.com")) {
      const v = parsed.searchParams.get("v");
      if (v && v.length === 11) return v;
      const parts = parsed.pathname.split("/").filter(Boolean);
      const embedIdx = parts.indexOf("embed");
      if (embedIdx >= 0 && parts[embedIdx + 1]?.length === 11) {
        return parts[embedIdx + 1]!;
      }
      const shortsIdx = parts.indexOf("shorts");
      if (shortsIdx >= 0 && parts[shortsIdx + 1]?.length === 11) {
        return parts[shortsIdx + 1]!;
      }
    }
  } catch {
    return null;
  }
  return null;
}
