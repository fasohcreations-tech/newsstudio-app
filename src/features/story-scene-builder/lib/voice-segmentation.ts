/**
 * Allocate voice timing across analyzed script segments.
 * Uses proportional word weights against total voice duration.
 */

import type {
  AnalyzedStorySegment,
  TimedVoiceSegment,
} from "@/features/story-scene-builder/types/scene-builder.types";

const MIN_SEGMENT_MS = 2500;
const DEFAULT_TOTAL_MS = 30_000;

export function segmentVoiceTiming(
  segments: AnalyzedStorySegment[],
  voiceDurationMs: number | null | undefined,
): TimedVoiceSegment[] {
  if (segments.length === 0) return [];

  const totalMs = Math.max(
    voiceDurationMs && voiceDurationMs > 0 ? voiceDurationMs : DEFAULT_TOTAL_MS,
    segments.length * MIN_SEGMENT_MS,
  );

  const totalWeight = segments.reduce((sum, s) => sum + s.weight, 0) || 1;
  let cursor = 0;
  const timed: TimedVoiceSegment[] = [];

  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i]!;
    const isLast = i === segments.length - 1;
    const raw = Math.round((segment.weight / totalWeight) * totalMs);
    const durationMs = isLast
      ? Math.max(MIN_SEGMENT_MS, totalMs - cursor)
      : Math.max(MIN_SEGMENT_MS, raw);
    const startMs = cursor;
    const endMs = Math.min(totalMs, startMs + durationMs);
    timed.push({
      ...segment,
      startMs,
      endMs,
      durationMs: Math.max(0, endMs - startMs),
    });
    cursor = endMs;
  }

  return timed;
}
