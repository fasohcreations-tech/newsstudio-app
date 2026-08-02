"use client";

import {
  Pause,
  Play,
  Repeat,
  SkipBack,
  SkipForward,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { SceneObject } from "@/features/scene-composer/types/scene-composer.types";

type ComposerTimelinePanelProps = {
  objects: SceneObject[];
  playheadMs: number;
  durationMs: number;
  frameRate: number;
  isPlaying: boolean;
  loopPlayback: boolean;
  selectedIds: string[];
  formatTimecode: (ms: number) => string;
  onSeek: (ms: number) => void;
  onTogglePlay: () => void;
  onStepFrame: (direction: "back" | "forward") => void;
  onToggleLoop: () => void;
  onSelect: (id: string) => void;
  timelineZoom: number;
  onTimelineZoom: (zoom: number) => void;
};

export function ComposerTimelinePanel({
  objects,
  playheadMs,
  durationMs,
  frameRate,
  isPlaying,
  loopPlayback,
  selectedIds,
  formatTimecode,
  onSeek,
  onTogglePlay,
  onStepFrame,
  onToggleLoop,
  onSelect,
  timelineZoom,
  onTimelineZoom,
}: ComposerTimelinePanelProps) {
  const widthPct = durationMs > 0 ? (playheadMs / durationMs) * 100 : 0;

  return (
    <div className="flex h-full min-h-0 flex-col border-t border-border/60 bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-3 py-2">
        <Button type="button" size="icon-sm" variant="ghost" onClick={() => onStepFrame("back")}>
          <SkipBack className="size-3.5" />
        </Button>
        <Button type="button" size="sm" variant="secondary" className="h-7 px-2" onClick={onTogglePlay}>
          {isPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
        </Button>
        <Button type="button" size="icon-sm" variant="ghost" onClick={() => onStepFrame("forward")}>
          <SkipForward className="size-3.5" />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant={loopPlayback ? "secondary" : "ghost"}
          onClick={onToggleLoop}
        >
          <Repeat className="size-3.5" />
        </Button>
        <span className="text-xs tabular-nums text-muted-foreground">
          {formatTimecode(playheadMs)} / {formatTimecode(durationMs)} · {frameRate}fps
        </span>
        <div className="ml-auto flex items-center gap-1">
          <Button type="button" size="icon-sm" variant="ghost" onClick={() => onTimelineZoom(Math.max(0.5, timelineZoom - 0.25))}>
            <ZoomOut className="size-3.5" />
          </Button>
          <Button type="button" size="icon-sm" variant="ghost" onClick={() => onTimelineZoom(Math.min(3, timelineZoom + 0.25))}>
            <ZoomIn className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="relative h-6 border-b border-border/40 bg-muted/30">
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
        />
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-2">
        {objects.map((object) => {
          const leftPct = durationMs > 0 ? (object.start_ms / durationMs) * 100 : 0;
          const widthTrack =
            durationMs > 0 ? ((object.end_ms - object.start_ms) / durationMs) * 100 : 0;
          const selected = selectedIds.includes(object.id);
          return (
            <button
              key={object.id}
              type="button"
              onClick={() => onSelect(object.id)}
              className="mb-1.5 flex w-full items-center gap-2 rounded-md px-1 py-1 hover:bg-muted/40"
            >
              <span className="w-24 truncate text-left text-[10px]">{object.name}</span>
              <div className="relative h-5 flex-1 rounded bg-muted/50">
                <div
                  className="absolute top-0 h-full rounded"
                  style={{
                    left: `${leftPct * timelineZoom}%`,
                    width: `${widthTrack * timelineZoom}%`,
                    background: object.layer_color,
                    opacity: selected ? 1 : 0.65,
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
