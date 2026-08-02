"use client";

import {
  Monitor,
  Pause,
  Play,
  Smartphone,
  Square,
  Tv,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ComposerScene } from "@/features/scene-composer/types/scene-composer.types";
import { StoryLivePreview } from "@/features/story-production/components/story-live-preview";
import type { StoryPreviewAspect } from "@/features/story-production/types/story-data.types";

const ASPECT_OPTIONS: Array<{
  id: StoryPreviewAspect;
  label: string;
  icon: React.ReactNode;
}> = [
  { id: "1920x1080", label: "16:9", icon: <Tv className="size-3.5" /> },
  { id: "1080x1920", label: "9:16", icon: <Smartphone className="size-3.5" /> },
  { id: "1080x1080", label: "1:1", icon: <Square className="size-3.5" /> },
  { id: "3840x2160", label: "4K", icon: <Monitor className="size-3.5" /> },
];

type LivePreviewPanelProps = {
  scene: ComposerScene;
  resolvedBindings: Record<string, string>;
  playheadMs: number;
  durationMs: number;
  isPlaying: boolean;
  formatTimecode: (ms: number) => string;
  onTogglePlay: () => void;
  onSeek: (ms: number) => void;
  aspect: StoryPreviewAspect;
  onAspectChange: (aspect: StoryPreviewAspect) => void;
  selectedObjectId?: string | null;
  onSelectObject?: (objectId: string | null) => void;
};

export function LivePreviewPanel({
  scene,
  resolvedBindings,
  playheadMs,
  durationMs,
  isPlaying,
  formatTimecode,
  onTogglePlay,
  onSeek,
  aspect,
  onAspectChange,
  selectedObjectId = null,
  onSelectObject,
}: LivePreviewPanelProps) {
  const progressPct = durationMs > 0 ? (playheadMs / durationMs) * 100 : 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Live Preview
        </p>
        <div className="flex flex-1 flex-wrap gap-1">
          {ASPECT_OPTIONS.map((option) => (
            <Button
              key={option.id}
              type="button"
              size="sm"
              variant={aspect === option.id ? "secondary" : "ghost"}
              className="h-6 gap-1 px-2 text-[10px]"
              onClick={() => onAspectChange(option.id)}
            >
              {option.icon}
              {option.label}
            </Button>
          ))}
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-7 px-2"
          onClick={onTogglePlay}
        >
          {isPlaying ? (
            <Pause className="size-3.5" />
          ) : (
            <Play className="size-3.5" />
          )}
        </Button>
        <span className="font-mono text-[10px] text-muted-foreground">
          {formatTimecode(playheadMs)} / {formatTimecode(durationMs)}
        </span>
      </div>

      <div className="min-h-0 flex-1">
        <StoryLivePreview
          scene={scene}
          resolvedBindings={resolvedBindings}
          playheadMs={playheadMs}
          aspect={aspect}
          selectedObjectId={selectedObjectId}
          onSelectObject={onSelectObject}
        />
      </div>

      <div className="border-t border-border/60 px-3 py-2">
        <input
          type="range"
          min={0}
          max={durationMs}
          value={playheadMs}
          onChange={(e) => onSeek(Number(e.target.value))}
          className="w-full accent-primary"
          aria-label="Preview scrubber"
        />
        <div
          className="mt-1 h-1 rounded-full bg-muted"
          aria-hidden
        >
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
