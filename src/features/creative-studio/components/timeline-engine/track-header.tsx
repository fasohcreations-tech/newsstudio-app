"use client";

import {
  ChevronDown,
  ChevronRight,
  Lock,
  Volume2,
  VolumeX,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ENTERPRISE_TRACK_LABELS,
  TRACK_HEADER_WIDTH,
} from "@/features/creative-studio/constants/timeline-engine.constants";
import type { EnterpriseTimelineTrackWithClips } from "@/features/creative-studio/types/timeline-engine.types";
import type { EnterpriseTrackKind } from "@/features/creative-studio/types/timeline-engine.types";
import { cn } from "@/lib/utils";

type TrackHeaderProps = {
  track: EnterpriseTimelineTrackWithClips;
  selected: boolean;
  onSelect: () => void;
  onToggleCollapse: () => void;
  onToggleMute: () => void;
  onToggleLock: () => void;
  onResizeStart: (event: React.PointerEvent) => void;
};

export function TrackHeader({
  track,
  selected,
  onSelect,
  onToggleCollapse,
  onToggleMute,
  onToggleLock,
  onResizeStart,
}: TrackHeaderProps) {
  const kindLabel =
    ENTERPRISE_TRACK_LABELS[track.kind as EnterpriseTrackKind] ?? track.kind;

  return (
    <div
      className={cn(
        "relative flex shrink-0 flex-col border-r border-border/50 bg-muted/25",
        selected ? "bg-muted/40" : "",
        !track.visible ? "opacity-50" : "",
      )}
      style={{ width: TRACK_HEADER_WIDTH }}
    >
      <div className="flex min-h-0 flex-1 items-center gap-1 px-1.5 py-1">
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="size-5 shrink-0"
          onClick={onToggleCollapse}
          aria-label={track.collapsed ? "Expand track" : "Collapse track"}
        >
          {track.collapsed ? (
            <ChevronRight className="size-3" />
          ) : (
            <ChevronDown className="size-3" />
          )}
        </Button>
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
          onClick={onSelect}
        >
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: track.color }}
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[11px] font-medium leading-tight">
              {track.name}
            </span>
            <span className="block truncate text-[9px] text-muted-foreground">
              {kindLabel}
            </span>
          </span>
        </button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="size-5 shrink-0"
          onClick={onToggleMute}
          aria-label={track.muted ? "Unmute track" : "Mute track"}
        >
          {track.muted ? (
            <VolumeX className="size-3 text-destructive" />
          ) : (
            <Volume2 className="size-3" />
          )}
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="size-5 shrink-0"
          onClick={onToggleLock}
          aria-label={track.locked ? "Unlock track" : "Lock track"}
        >
          <Lock
            className={cn("size-3", track.locked ? "text-amber-500" : "")}
          />
        </Button>
      </div>
      <div
        className="h-1 cursor-row-resize bg-border/40 hover:bg-primary/40"
        onPointerDown={onResizeStart}
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize track"
      />
    </div>
  );
}
