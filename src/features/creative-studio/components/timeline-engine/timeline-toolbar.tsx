"use client";

import {
  Copy,
  Magnet,
  Minus,
  Plus,
  Redo2,
  Scissors,
  Trash2,
  Undo2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RIPPLE_MODES } from "@/features/creative-studio/constants/timeline-engine.constants";
import type { RippleMode } from "@/features/creative-studio/types/timeline-engine.types";

type TimelineToolbarProps = {
  snapEnabled: boolean;
  rippleMode: RippleMode;
  magneticEnabled: boolean;
  zoomLevel: number;
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
  onToggleSnap: () => void;
  onRippleModeChange: (mode: RippleMode) => void;
  onToggleMagnetic: () => void;
  onZoomChange: (zoom: number) => void;
  onHeightChange: (delta: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onSplit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onAddMarker: () => void;
};

export function TimelineToolbar({
  snapEnabled,
  rippleMode,
  magneticEnabled,
  zoomLevel,
  canUndo,
  canRedo,
  hasSelection,
  onToggleSnap,
  onRippleModeChange,
  onToggleMagnetic,
  onZoomChange,
  onHeightChange,
  onUndo,
  onRedo,
  onSplit,
  onDuplicate,
  onDelete,
  onAddMarker,
}: TimelineToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-1.5">
      <div className="flex items-center gap-1">
        <p className="mr-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Timeline
        </p>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          disabled={!canUndo}
          onClick={onUndo}
          aria-label="Undo"
        >
          <Undo2 className="size-3.5" />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          disabled={!canRedo}
          onClick={onRedo}
          aria-label="Redo"
        >
          <Redo2 className="size-3.5" />
        </Button>
        <span className="mx-1 h-4 w-px bg-border/60" />
        <Button
          type="button"
          size="sm"
          variant={snapEnabled ? "secondary" : "ghost"}
          className="h-7 text-xs"
          onClick={onToggleSnap}
        >
          <Magnet className="size-3.5" />
          Snap
        </Button>
        <Select
          value={rippleMode}
          onValueChange={(value) => onRippleModeChange(value as RippleMode)}
        >
          <SelectTrigger className="h-7 w-[110px] text-xs">
            <Scissors className="mr-1 size-3.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RIPPLE_MODES.map((mode) => (
              <SelectItem key={mode.id} value={mode.id}>
                {mode.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          size="sm"
          variant={magneticEnabled ? "secondary" : "ghost"}
          className="h-7 text-xs"
          onClick={onToggleMagnetic}
        >
          Magnetic
        </Button>
      </div>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
          disabled={!hasSelection}
          onClick={onSplit}
        >
          Split
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          disabled={!hasSelection}
          onClick={onDuplicate}
          aria-label="Duplicate"
        >
          <Copy className="size-3.5" />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          disabled={!hasSelection}
          onClick={onDelete}
          aria-label="Delete"
        >
          <Trash2 className="size-3.5" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
          onClick={onAddMarker}
        >
          + Marker
        </Button>
        <span className="mx-1 h-4 w-px bg-border/60" />
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={() => onZoomChange(Math.max(0.5, zoomLevel - 0.25))}
          aria-label="Zoom out"
        >
          <Minus className="size-3.5" />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={() => onZoomChange(Math.min(3, zoomLevel + 0.25))}
          aria-label="Zoom in"
        >
          <Plus className="size-3.5" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
          onClick={() => onHeightChange(-24)}
        >
          −
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
          onClick={() => onHeightChange(24)}
        >
          +
        </Button>
      </div>
    </div>
  );
}
