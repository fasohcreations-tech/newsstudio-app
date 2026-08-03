"use client";

import {
  Pause,
  Play,
  Repeat,
  RotateCcw,
  SkipBack,
  SkipForward,
  Square,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { EDITOR_UI } from "@/features/scene-composer/components/editor/editor.constants";
import type { ComposerFrameRate } from "@/features/scene-composer/hooks/use-composer-playback";

type EnhancedTimelinePanelProps = {
  playheadMs: number;
  durationMs: number;
  frameRate: number;
  isPlaying: boolean;
  loopPlayback: boolean;
  formatTimecode: (ms: number) => string;
  onSeek: (ms: number) => void;
  onTogglePlay: () => void;
  onStop: () => void;
  onRestart: () => void;
  onStepFrame: (direction: "back" | "forward") => void;
  onToggleLoop: () => void;
  onSetFrameRate: (fps: ComposerFrameRate) => void;
};

/**
 * Compact canvas timeline transport — playhead scrubber without layer tracks.
 * Layer management lives in the left Layers panel.
 */
export function EnhancedTimelinePanel({
  playheadMs,
  durationMs,
  frameRate,
  isPlaying,
  loopPlayback,
  formatTimecode,
  onSeek,
  onTogglePlay,
  onStop,
  onRestart,
  onStepFrame,
  onToggleLoop,
  onSetFrameRate,
}: EnhancedTimelinePanelProps) {
  const widthPct = durationMs > 0 ? (playheadMs / durationMs) * 100 : 0;

  return (
    <div className="flex shrink-0 flex-col border-t border-border/60 bg-card">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <p className={`${EDITOR_UI.sectionHeader} mr-2`}>Timeline</p>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={() => onStepFrame("back")}
        >
          <SkipBack className="size-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className={EDITOR_UI.button}
          onClick={onTogglePlay}
        >
          {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={() => onStepFrame("forward")}
        >
          <SkipForward className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={onStop}
          title="Stop"
        >
          <Square className="size-3.5" />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={onRestart}
          title="Restart"
        >
          <RotateCcw className="size-3.5" />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant={loopPlayback ? "secondary" : "ghost"}
          onClick={onToggleLoop}
        >
          <Repeat className="size-4" />
        </Button>
        <div className="flex items-center gap-0.5 rounded-md border border-border/60 p-0.5">
          <Button
            type="button"
            size="sm"
            variant={frameRate === 30 ? "secondary" : "ghost"}
            className="h-7 px-2 text-[11px]"
            onClick={() => onSetFrameRate(30)}
          >
            30
          </Button>
          <Button
            type="button"
            size="sm"
            variant={frameRate === 60 ? "secondary" : "ghost"}
            className="h-7 px-2 text-[11px]"
            onClick={() => onSetFrameRate(60)}
          >
            60
          </Button>
        </div>
        <span
          className={`${EDITOR_UI.timeline} tabular-nums text-muted-foreground`}
        >
          {formatTimecode(playheadMs)} / {formatTimecode(durationMs)} ·{" "}
          {frameRate}fps
        </span>
      </div>

      <div className="relative h-7 border-t border-border/40 bg-muted/30">
        <div
          className="absolute top-0 h-full w-0.5 bg-primary"
          style={{ left: `${widthPct}%` }}
        />
        <input
          type="range"
          min={0}
          max={durationMs}
          value={playheadMs}
          onChange={(e) => onSeek(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0"
          aria-label="Playhead"
        />
      </div>
    </div>
  );
}
