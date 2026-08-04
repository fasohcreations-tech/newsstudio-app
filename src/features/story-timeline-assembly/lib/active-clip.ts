import type {
  StoryTimelineBundle,
  StoryTimelineClipRow,
} from "@/features/story-timeline-assembly/types/timeline.types";

export function getTrackIdByKind(
  bundle: StoryTimelineBundle,
  kind: string,
): string | null {
  return bundle.tracks.find((t) => t.kind === kind)?.id ?? null;
}

/** Active enabled clip on a track at playhead (start inclusive, end exclusive). */
export function getActiveClipAtPlayhead(
  clips: StoryTimelineClipRow[],
  trackId: string | null,
  playheadMs: number,
): StoryTimelineClipRow | null {
  if (!trackId) return null;
  return (
    clips.find(
      (c) =>
        c.track_id === trackId &&
        c.enabled &&
        !c.deleted_at &&
        playheadMs >= c.start_ms &&
        playheadMs < c.end_ms,
    ) ?? null
  );
}

export function getSceneClipsSorted(
  bundle: StoryTimelineBundle,
): StoryTimelineClipRow[] {
  const trackId = getTrackIdByKind(bundle, "scene");
  if (!trackId) return [];
  return bundle.clips
    .filter((c) => c.track_id === trackId && c.enabled)
    .sort((a, b) => a.start_ms - b.start_ms);
}

export function findNeighborSceneClip(
  bundle: StoryTimelineBundle,
  playheadMs: number,
  direction: "prev" | "next",
): StoryTimelineClipRow | null {
  const scenes = getSceneClipsSorted(bundle);
  if (!scenes.length) return null;
  if (direction === "next") {
    return scenes.find((c) => c.start_ms > playheadMs + 50) ?? null;
  }
  const earlier = [...scenes].reverse().find((c) => c.end_ms <= playheadMs + 50);
  return earlier ?? scenes[0] ?? null;
}

export function formatTimelineClock(ms: number, fps = 30): string {
  const totalFrames = Math.floor((Math.max(0, ms) / 1000) * fps);
  const frames = totalFrames % Math.max(1, Math.round(fps));
  const totalSeconds = Math.floor(totalFrames / Math.max(1, Math.round(fps)));
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}:${pad(frames)}`;
}
