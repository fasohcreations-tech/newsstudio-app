"use client";

import { useMemo, useRef, useState } from "react";

import type { ClipColorLabel } from "@/features/creative-studio/types/timeline-engine.types";
import { CLIP_COLOR_HEX } from "@/features/creative-studio/constants/timeline-engine.constants";
import {
  MIN_CLIP_DURATION_MS,
  snapMs,
} from "@/features/creative-studio/lib/studio-utils";
import { msToPx, pxToMs } from "@/features/creative-studio/lib/timeline-engine-utils";
import type { EnterpriseTimelineClip } from "@/features/creative-studio/types/timeline-engine.types";
import type { CreativeTimelineTrackWithClips } from "@/features/creative-studio/types/creative-studio.types";
import { cn } from "@/lib/utils";

type ClipBlockProps = {
  clip: EnterpriseTimelineClip;
  track: CreativeTimelineTrackWithClips;
  zoomLevel: number;
  snapEnabled: boolean;
  frameRate: number;
  selected: boolean;
  onSelect: (additive: boolean) => void;
  onTrim: (startMs: number, endMs: number, rippleShiftMs?: number) => void;
  onMove: (startMs: number) => void;
};

export function ClipBlock({
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
  const labelColor =
    CLIP_COLOR_HEX[(clip.color_label as ClipColorLabel) ?? "default"] || track.color;

  const finishInteraction = (event: React.PointerEvent) => {
    if (!interactionRef.current || clip.locked || track.locked) return;

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
      setPreview({ startMs: nextStart, endMs: nextStart + duration });
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

  if (clip.hidden) return null;

  if (clip.clip_kind === "marker") {
    return (
      <button
        type="button"
        className={cn(
          "absolute top-2 bottom-2 w-0.5 bg-amber-400",
          selected ? "ring-2 ring-primary" : "",
          clip.muted ? "opacity-40" : "",
        )}
        style={{ left }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(e.shiftKey);
        }}
        aria-label={clip.name}
      />
    );
  }

  return (
    <div
      className={cn(
        "absolute top-1 bottom-1 overflow-hidden rounded border text-left text-[10px] text-white shadow-sm",
        selected ? "ring-2 ring-primary ring-offset-1" : "",
        clip.locked || track.locked ? "opacity-80" : "",
        clip.muted ? "opacity-50" : "",
      )}
      style={{
        left,
        width,
        backgroundColor: labelColor || track.color,
        borderColor: clip.locked ? "rgba(255,255,255,0.5)" : undefined,
      }}
    >
      {!clip.locked && !track.locked ? (
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
      ) : null}
      <button
        type="button"
        className="absolute inset-x-1.5 inset-y-0 z-0 truncate px-1 text-left font-medium"
        onClick={(e) => {
          e.stopPropagation();
          onSelect(e.shiftKey);
        }}
        onPointerDown={(e) => {
          if (e.button !== 0 || clip.locked || track.locked) return;
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
      {!clip.locked && !track.locked ? (
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
      ) : null}
    </div>
  );
}

export function useClipLayout(clip: EnterpriseTimelineClip, zoomLevel: number) {
  return useMemo(
    () => ({
      left: msToPx(clip.start_ms, zoomLevel),
      width: Math.max(24, msToPx(clip.end_ms - clip.start_ms, zoomLevel)),
    }),
    [clip.end_ms, clip.start_ms, zoomLevel],
  );
}
