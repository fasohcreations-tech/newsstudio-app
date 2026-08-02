"use client";

import { useMemo, useRef, useState } from "react";
import { Magnet, Minus, Plus, Scissors } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PIXELS_PER_SECOND } from "@/features/creative-studio/constants/creative-studio.constants";
import {
  MEDIA_BIN_DRAG_TYPE,
  MIN_CLIP_DURATION_MS,
  type MediaBinDragPayload,
  isClipCompatibleWithTrack,
  snapMs,
} from "@/features/creative-studio/lib/studio-utils";
import type {
  CreativeProjectWithTimeline,
  CreativeTimelineClip,
  CreativeTimelineTrackWithClips,
  SelectedClipRef,
} from "@/features/creative-studio/types/creative-studio.types";
import { cn } from "@/lib/utils";

type TimelineEditorProps = {
  project: CreativeProjectWithTimeline;
  height: number;
  zoomLevel: number;
  snapEnabled: boolean;
  rippleEnabled: boolean;
  frameRate: number;
  playheadMs: number;
  selectedClipId: string | null;
  onSelectClip: (ref: SelectedClipRef) => void;
  onHeightChange: (height: number) => void;
  onZoomChange: (zoom: number) => void;
  onToggleSnap: () => void;
  onToggleRipple: () => void;
  onSeek: (ms: number) => void;
  onDropMedia: (
    track: CreativeTimelineTrackWithClips,
    startMs: number,
    payload: MediaBinDragPayload,
  ) => void;
  onTrimClip: (
    trackId: string,
    clipId: string,
    startMs: number,
    endMs: number,
    rippleShiftMs?: number,
  ) => void;
  onMoveClip: (trackId: string, clipId: string, startMs: number) => void;
};

function msToPx(ms: number, zoom: number) {
  return (ms / 1000) * PIXELS_PER_SECOND * zoom;
}

function pxToMs(px: number, zoom: number) {
  return (px / (PIXELS_PER_SECOND * zoom)) * 1000;
}

type ClipBlockProps = {
  clip: CreativeTimelineClip;
  track: CreativeTimelineTrackWithClips;
  zoomLevel: number;
  snapEnabled: boolean;
  frameRate: number;
  selected: boolean;
  onSelect: () => void;
  onTrim: (startMs: number, endMs: number, rippleShiftMs?: number) => void;
  onMove: (startMs: number) => void;
};

function ClipBlock({
  clip,
  track,
  zoomLevel,
  snapEnabled,
  frameRate,
  selected,
  onSelect,
  onTrim,
  onMove,
}: ClipBlockProps) {
  const [preview, setPreview] = useState<{
    startMs: number;
    endMs: number;
  } | null>(null);
  const interactionRef = useRef<{
    mode: "trim-left" | "trim-right" | "move";
    originX: number;
    originStart: number;
    originEnd: number;
  } | null>(null);

  const startMs = preview?.startMs ?? clip.start_ms;
  const endMs = preview?.endMs ?? clip.end_ms;
  const left = msToPx(startMs, zoomLevel);
  const width = Math.max(24, msToPx(endMs - startMs, zoomLevel));

  const finishInteraction = (event: React.PointerEvent) => {
    if (!interactionRef.current) return;

    const deltaMs = pxToMs(
      event.clientX - interactionRef.current.originX,
      zoomLevel,
    );
    const mode = interactionRef.current.mode;

    if (mode === "move") {
      const nextStart = snapMs(
        Math.max(0, interactionRef.current.originStart + deltaMs),
        snapEnabled,
        frameRate,
      );
      onMove(nextStart);
    } else if (mode === "trim-left") {
      const nextStart = Math.min(
        interactionRef.current.originEnd - MIN_CLIP_DURATION_MS,
        Math.max(0, interactionRef.current.originStart + deltaMs),
      );
      onTrim(nextStart, interactionRef.current.originEnd);
    } else {
      const nextEnd = Math.max(
        interactionRef.current.originStart + MIN_CLIP_DURATION_MS,
        interactionRef.current.originEnd + deltaMs,
      );
      const rippleShift = nextEnd - interactionRef.current.originEnd;
      onTrim(interactionRef.current.originStart, nextEnd, rippleShift);
    }

    interactionRef.current = null;
    setPreview(null);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (!interactionRef.current) return;
    const deltaMs = pxToMs(
      event.clientX - interactionRef.current.originX,
      zoomLevel,
    );

    if (interactionRef.current.mode === "move") {
      const nextStart = Math.max(
        0,
        interactionRef.current.originStart + deltaMs,
      );
      const duration =
        interactionRef.current.originEnd - interactionRef.current.originStart;
      setPreview({
        startMs: nextStart,
        endMs: nextStart + duration,
      });
      return;
    }

    if (interactionRef.current.mode === "trim-left") {
      const nextStart = Math.min(
        interactionRef.current.originEnd - MIN_CLIP_DURATION_MS,
        Math.max(0, interactionRef.current.originStart + deltaMs),
      );
      setPreview({ startMs: nextStart, endMs: interactionRef.current.originEnd });
      return;
    }

    const nextEnd = Math.max(
      interactionRef.current.originStart + MIN_CLIP_DURATION_MS,
      interactionRef.current.originEnd + deltaMs,
    );
    setPreview({
      startMs: interactionRef.current.originStart,
      endMs: nextEnd,
    });
  };

  if (clip.clip_kind === "marker") {
    return (
      <button
        type="button"
        className={cn(
          "absolute top-2 bottom-2 w-0.5 bg-amber-400",
          selected ? "ring-2 ring-primary" : "",
        )}
        style={{ left }}
        onClick={onSelect}
        aria-label={clip.name}
      />
    );
  }

  return (
    <div
      className={cn(
        "absolute top-1 bottom-1 overflow-hidden rounded border text-left text-[10px] text-white shadow-sm",
        selected ? "ring-2 ring-primary ring-offset-1" : "",
      )}
      style={{ left, width, backgroundColor: track.color }}
    >
      <span
        className="absolute left-0 top-0 bottom-0 z-10 w-1.5 cursor-ew-resize bg-white/40"
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          interactionRef.current = {
            mode: "trim-left",
            originX: e.clientX,
            originStart: clip.start_ms,
            originEnd: clip.end_ms,
          };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={onPointerMove}
        onPointerUp={finishInteraction}
        aria-hidden
      />
      <button
        type="button"
        className="absolute inset-x-1.5 inset-y-0 z-0 truncate px-1 text-left font-medium"
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          interactionRef.current = {
            mode: "move",
            originX: e.clientX,
            originStart: clip.start_ms,
            originEnd: clip.end_ms,
          };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={onPointerMove}
        onPointerUp={finishInteraction}
      >
        {clip.name}
      </button>
      <span
        className="absolute right-0 top-0 bottom-0 z-10 w-1.5 cursor-ew-resize bg-white/40"
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          interactionRef.current = {
            mode: "trim-right",
            originX: e.clientX,
            originStart: clip.start_ms,
            originEnd: clip.end_ms,
          };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={onPointerMove}
        onPointerUp={finishInteraction}
        aria-hidden
      />
    </div>
  );
}

function seekFromEvent(
  event: React.MouseEvent<HTMLElement>,
  zoomLevel: number,
  snapEnabled: boolean,
  frameRate: number,
  onSeek: (ms: number) => void,
) {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = event.clientX - rect.left;
  onSeek(snapMs(pxToMs(x, zoomLevel), snapEnabled, frameRate));
}

export function TimelineEditor({
  project,
  height,
  zoomLevel,
  snapEnabled,
  rippleEnabled,
  frameRate,
  playheadMs,
  selectedClipId,
  onSelectClip,
  onHeightChange,
  onZoomChange,
  onToggleSnap,
  onToggleRipple,
  onSeek,
  onDropMedia,
  onTrimClip,
  onMoveClip,
}: TimelineEditorProps) {
  const [dragOverTrackId, setDragOverTrackId] = useState<string | null>(null);
  const [scrubbing, setScrubbing] = useState(false);
  const durationMs = project.timeline?.duration_ms ?? 60_000;
  const rulerWidth = msToPx(durationMs, zoomLevel) + 120;

  const ticks = useMemo(() => {
    const step = 5000;
    const count = Math.ceil(durationMs / step);
    return Array.from({ length: count + 1 }, (_, i) => i * step);
  }, [durationMs]);

  const handleDrop = (
    event: React.DragEvent<HTMLDivElement>,
    track: CreativeTimelineTrackWithClips,
  ) => {
    event.preventDefault();
    setDragOverTrackId(null);

    const raw = event.dataTransfer.getData(MEDIA_BIN_DRAG_TYPE);
    if (!raw) return;

    let payload: MediaBinDragPayload;
    try {
      payload = JSON.parse(raw) as MediaBinDragPayload;
    } catch {
      return;
    }

    if (!isClipCompatibleWithTrack(track.kind, payload.clipKind)) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const startMs = snapMs(pxToMs(x, zoomLevel), snapEnabled, frameRate);
    onDropMedia(track, startMs, payload);
  };

  const scrubFromPointer = (event: React.PointerEvent<HTMLElement>) => {
    seekFromEvent(
      event as unknown as React.MouseEvent<HTMLElement>,
      zoomLevel,
      snapEnabled,
      frameRate,
      onSeek,
    );
  };

  return (
    <div
      className="flex shrink-0 flex-col border-t border-border/60 bg-muted/10"
      style={{ height }}
    >
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-1.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Timeline
        </p>
        <div className="flex items-center gap-1">
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
          <Button
            type="button"
            size="sm"
            variant={rippleEnabled ? "secondary" : "ghost"}
            className="h-7 text-xs"
            onClick={onToggleRipple}
            title="Ripple editing"
          >
            <Scissors className="size-3.5" />
            Ripple
          </Button>
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
            onClick={() => onHeightChange(Math.max(160, height - 24))}
          >
            −
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => onHeightChange(Math.min(480, height + 24))}
          >
            +
          </Button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-auto">
        <div style={{ width: rulerWidth, minWidth: "100%" }}>
          <div className="sticky top-0 z-10 flex h-6 border-b border-border/50 bg-background/95 text-[10px] text-muted-foreground">
            <div className="w-28 shrink-0 border-r border-border/50" />
            <div
              className="relative flex-1 cursor-pointer"
              onPointerDown={(e) => {
                setScrubbing(true);
                scrubFromPointer(e);
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (!scrubbing) return;
                scrubFromPointer(e);
              }}
              onPointerUp={(e) => {
                setScrubbing(false);
                e.currentTarget.releasePointerCapture(e.pointerId);
              }}
            >
              {ticks.map((ms) => (
                <span
                  key={ms}
                  className="pointer-events-none absolute top-0 border-l border-border/40 pl-1"
                  style={{ left: msToPx(ms, zoomLevel) }}
                >
                  {(ms / 1000).toFixed(0)}s
                </span>
              ))}
              <div
                className="absolute top-0 bottom-0 z-10 w-0.5 bg-primary"
                style={{ left: msToPx(playheadMs, zoomLevel) }}
              />
              <div
                className="absolute top-0 z-20 size-3 -translate-x-1/2 rounded-full border-2 border-primary bg-background"
                style={{ left: msToPx(playheadMs, zoomLevel) }}
              />
            </div>
          </div>

          {project.tracks.map((track) => (
            <div
              key={track.id}
              className="flex border-b border-border/40"
              style={{ minHeight: track.height }}
            >
              <div className="flex w-28 shrink-0 items-center border-r border-border/50 bg-muted/20 px-2 text-[11px]">
                <span
                  className="mr-1.5 size-2 rounded-full"
                  style={{ backgroundColor: track.color }}
                />
                <span className="truncate">{track.name}</span>
              </div>
              <div
                className={cn(
                  "relative flex-1 cursor-crosshair bg-background/50",
                  dragOverTrackId === track.id ? "bg-primary/5" : "",
                )}
                onClick={(e) =>
                  seekFromEvent(e, zoomLevel, snapEnabled, frameRate, onSeek)
                }
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverTrackId(track.id);
                }}
                onDragLeave={() => setDragOverTrackId(null)}
                onDrop={(e) => handleDrop(e, track)}
              >
                <div
                  className="pointer-events-none absolute top-0 bottom-0 z-10 w-0.5 bg-primary/70"
                  style={{ left: msToPx(playheadMs, zoomLevel) }}
                />
                {track.clips.map((clip) => (
                  <ClipBlock
                    key={clip.id}
                    clip={clip}
                    track={track}
                    zoomLevel={zoomLevel}
                    snapEnabled={snapEnabled}
                    frameRate={frameRate}
                    selected={selectedClipId === clip.id}
                    onSelect={() => {
                      onSelectClip({ clipId: clip.id, trackId: track.id });
                      onSeek(clip.start_ms);
                    }}
                    onTrim={(startMs, endMs, rippleShiftMs) =>
                      onTrimClip(
                        track.id,
                        clip.id,
                        startMs,
                        endMs,
                        rippleEnabled ? rippleShiftMs : undefined,
                      )
                    }
                    onMove={(startMs) => onMoveClip(track.id, clip.id, startMs)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
