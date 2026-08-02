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
import { formatTimecode } from "@/features/creative-studio/hooks/use-preview-playback";

type PlaybackControlsProps = {
  preview: ReturnType<
    typeof import("@/features/creative-studio/hooks/use-preview-playback").usePreviewPlayback
  >;
};

export function PlaybackControls({ preview }: PlaybackControlsProps) {
  const { state, togglePlay, stepFrame, seek } = preview;

  return (
    <div className="flex shrink-0 items-center justify-center gap-2 border-t border-border/60 bg-muted/20 px-3 py-2">
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        onClick={() => seek(0)}
        aria-label="Go to start"
      >
        <SkipBack className="size-4" />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        onClick={() => stepFrame("back")}
        aria-label="Previous frame"
      >
        <StepBack className="size-4" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="secondary"
        onClick={togglePlay}
        aria-label={state.isPlaying ? "Pause" : "Play"}
      >
        {state.isPlaying ? (
          <Pause className="size-4" />
        ) : (
          <Play className="size-4" />
        )}
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        onClick={() => stepFrame("forward")}
        aria-label="Next frame"
      >
        <StepForward className="size-4" />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        onClick={() => seek(state.durationMs)}
        aria-label="Go to end"
      >
        <SkipForward className="size-4" />
      </Button>
      <span className="ml-2 font-mono text-xs text-muted-foreground">
        {formatTimecode(state.playheadMs, state.frameRate)}
      </span>
    </div>
  );
}
