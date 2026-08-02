"use client";

import { useState } from "react";

import {
  MEDIA_BIN_DRAG_TYPE,
  type MediaBinDragPayload,
  isClipCompatibleWithTrack,
  snapMs,
} from "@/features/creative-studio/lib/studio-utils";
import { msToPx, pxToMs } from "@/features/creative-studio/lib/timeline-engine-utils";
import { ClipBlock } from "@/features/creative-studio/components/timeline-engine/clip-block";
import type { EnterpriseTimelineTrackWithClips } from "@/features/creative-studio/types/timeline-engine.types";
import { cn } from "@/lib/utils";

type TrackLaneProps = {
  track: EnterpriseTimelineTrackWithClips;
  zoomLevel: number;
  snapEnabled: boolean;
  frameRate: number;
  playheadMs: number;
  selectedClipIds: string[];
  onSelectClip: (clipId: string, additive: boolean) => void;
  onSeek: (ms: number) => void;
  onDropMedia: (
    track: EnterpriseTimelineTrackWithClips,
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

export function TrackLane({
  track,
  zoomLevel,
  snapEnabled,
  frameRate,
  playheadMs,
  selectedClipIds,
  onSelectClip,
  onSeek,
  onDropMedia,
  onTrimClip,
  onMoveClip,
}: TrackLaneProps) {
  const [dragOver, setDragOver] = useState(false);

  if (!track.visible) return null;

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);

    const raw = event.dataTransfer.getData(MEDIA_BIN_DRAG_TYPE);
    if (!raw) return;

    let payload: MediaBinDragPayload;
    try {
      payload = JSON.parse(raw) as MediaBinDragPayload;
    } catch {
      return;
    }

    if (!isClipCompatibleWithTrack(track.kind, payload.clipKind)) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const startMs = snapMs(pxToMs(x, zoomLevel), snapEnabled, frameRate);
    onDropMedia(track, startMs, payload);
  };

  return (
    <div
      className={cn(
        "relative flex-1 bg-background/50",
        track.collapsed ? "min-h-7" : "",
        dragOver ? "bg-primary/5" : "",
        track.locked ? "cursor-not-allowed" : "cursor-crosshair",
      )}
      style={{ minHeight: track.collapsed ? 28 : track.height }}
      onClick={(e) => seekFromEvent(e, zoomLevel, snapEnabled, frameRate, onSeek)}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <div
        className="pointer-events-none absolute top-0 bottom-0 z-10 w-0.5 bg-primary/70"
        style={{ left: msToPx(playheadMs, zoomLevel) }}
      />
      {!track.collapsed
        ? track.clips.map((clip) => (
            <ClipBlock
              key={clip.id}
              clip={clip}
              track={track}
              zoomLevel={zoomLevel}
              snapEnabled={snapEnabled}
              frameRate={frameRate}
              selected={selectedClipIds.includes(clip.id)}
              onSelect={(additive) => onSelectClip(clip.id, additive)}
              onTrim={(startMs, endMs, rippleShiftMs) =>
                onTrimClip(track.id, clip.id, startMs, endMs, rippleShiftMs)
              }
              onMove={(startMs) => onMoveClip(track.id, clip.id, startMs)}
            />
          ))
        : null}
    </div>
  );
}
