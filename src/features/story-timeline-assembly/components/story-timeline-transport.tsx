"use client";

import {
  Pause,
  Play,
  SkipBack,
  SkipForward,
  StepBack,
  StepForward,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatTimelineClock } from "@/features/story-timeline-assembly/lib/active-clip";
import { cn } from "@/lib/utils";

type StoryTimelineTransportProps = {
  playing: boolean;
  playheadMs: number;
  durationMs: number;
  frameRate: number;
  onTogglePlay: () => void;
  onSeek: (ms: number) => void;
  onStepFrame: (dir: "back" | "forward") => void;
  onPrevClip: () => void;
  onNextClip: () => void;
  className?: string;
};

export function StoryTimelineTransport({
  playing,
  playheadMs,
  durationMs,
  frameRate,
  onTogglePlay,
  onSeek,
  onStepFrame,
  onPrevClip,
  onNextClip,
  className,
}: StoryTimelineTransportProps) {
  const progress =
    durationMs > 0 ? Math.min(100, (playheadMs / durationMs) * 100) : 0;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="size-8"
          onClick={onPrevClip}
          title="Previous scene"
        >
          <SkipBack className="size-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="size-8"
          onClick={() => onStepFrame("back")}
          title="Step back"
        >
          <StepBack className="size-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          className="size-9"
          onClick={onTogglePlay}
          title={playing ? "Pause" : "Play"}
        >
          {playing ? (
            <Pause className="size-4" />
          ) : (
            <Play className="size-4" />
          )}
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="size-8"
          onClick={() => onStepFrame("forward")}
          title="Step forward"
        >
          <StepForward className="size-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="size-8"
          onClick={onNextClip}
          title="Next scene"
        >
          <SkipForward className="size-3.5" />
        </Button>

        <span className="ml-2 font-mono text-xs tabular-nums">
          {formatTimelineClock(playheadMs, frameRate)}
          <span className="text-muted-foreground"> / </span>
          {formatTimelineClock(durationMs, frameRate)}
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={Math.max(1, durationMs)}
        step={1}
        value={Math.min(playheadMs, durationMs)}
        onChange={(e) => onSeek(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer accent-rose-500"
        aria-label="Scrub timeline"
      />
      <div
        className="pointer-events-none -mt-2 h-0.5 rounded bg-rose-500/30"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
