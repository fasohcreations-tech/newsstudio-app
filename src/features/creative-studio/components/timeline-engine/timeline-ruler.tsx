"use client";

import { useMemo, useState } from "react";

import { TRACK_HEADER_WIDTH } from "@/features/creative-studio/constants/timeline-engine.constants";
import {
  formatRulerLabel,
  msToPx,
  pxToMs,
  rulerTickStepMs,
} from "@/features/creative-studio/lib/timeline-engine-utils";
import { snapMs } from "@/features/creative-studio/lib/studio-utils";
import type { TimelineMarker } from "@/features/creative-studio/types/timeline-engine.types";

type TimelineRulerProps = {
  durationMs: number;
  zoomLevel: number;
  snapEnabled: boolean;
  frameRate: number;
  playheadMs: number;
  markers: TimelineMarker[];
  onSeek: (ms: number) => void;
};

export function TimelineRuler({
  durationMs,
  zoomLevel,
  snapEnabled,
  frameRate,
  playheadMs,
  markers,
  onSeek,
}: TimelineRulerProps) {
  const [scrubbing, setScrubbing] = useState(false);

  const step = rulerTickStepMs(zoomLevel, durationMs);
  const ticks = useMemo(() => {
    const count = Math.ceil(durationMs / step);
    return Array.from({ length: count + 1 }, (_, i) => i * step);
  }, [durationMs, step]);

  const scrubFromPointer = (event: React.PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    onSeek(snapMs(pxToMs(x, zoomLevel), snapEnabled, frameRate));
  };

  return (
    <div
      className="relative h-7 flex-1 cursor-pointer border-b border-border/50 bg-background/95 text-[10px] text-muted-foreground"
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
          className="pointer-events-none absolute top-0 border-l border-border/40 pl-1 leading-7"
          style={{ left: msToPx(ms, zoomLevel) }}
        >
          {formatRulerLabel(ms)}
        </span>
      ))}
      {markers.map((marker) => (
        <button
          key={marker.id}
          type="button"
          className="absolute top-0 z-20 -translate-x-1/2"
          style={{ left: msToPx(marker.start_ms, zoomLevel) }}
          onClick={(e) => {
            e.stopPropagation();
            onSeek(marker.start_ms);
          }}
          title={marker.label}
        >
          <span
            className="block size-0 border-x-[5px] border-t-[7px] border-x-transparent"
            style={{ borderTopColor: marker.color }}
          />
        </button>
      ))}
      <div
        className="absolute top-0 bottom-0 z-10 w-0.5 bg-primary"
        style={{ left: msToPx(playheadMs, zoomLevel) }}
      />
      <div
        className="absolute top-0 z-30 size-3 -translate-x-1/2 rounded-full border-2 border-primary bg-background"
        style={{ left: msToPx(playheadMs, zoomLevel) }}
      />
    </div>
  );
}

export function TimelineRulerSpacer() {
  return (
    <div
      className="shrink-0 border-r border-border/50 bg-muted/20"
      style={{ width: TRACK_HEADER_WIDTH }}
    />
  );
}
