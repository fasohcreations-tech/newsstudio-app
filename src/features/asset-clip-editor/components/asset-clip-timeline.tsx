"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { clamp, formatTimecode } from "@/features/asset-clip-editor/lib/timecode";
import { cn } from "@/lib/utils";

export type TimelineSiblingClip = {
  id: string;
  name: string;
  startMs: number;
  endMs: number;
};

type ClipTimelineProps = {
  durationMs: number;
  currentMs: number;
  inMs: number;
  outMs: number;
  zoom: number;
  frameRate?: number;
  onSeek: (ms: number) => void;
  onChangeIn: (ms: number) => void;
  onChangeOut: (ms: number) => void;
  thumbnailUrl?: string | null;
  siblingClips?: TimelineSiblingClip[];
};

type DragTarget = "playhead" | "in" | "out" | null;

function buildTicks(durationMs: number, zoom: number): number[] {
  const safeDuration = Math.max(1, durationMs);
  const targetCount = Math.min(64, Math.max(8, Math.round(10 * zoom)));
  const rawStep = safeDuration / targetCount;
  const niceSteps = [
    1_000 / 30, 100, 250, 500, 1_000, 2_000, 5_000, 10_000, 15_000, 30_000,
    60_000, 120_000, 300_000, 600_000,
  ];
  const step =
    niceSteps.find((candidate) => candidate >= rawStep) ??
    niceSteps[niceSteps.length - 1]!;
  const ticks: number[] = [];
  for (let ms = 0; ms <= safeDuration; ms += step) ticks.push(Math.round(ms));
  if (ticks[ticks.length - 1] !== Math.round(safeDuration)) {
    ticks.push(Math.round(safeDuration));
  }
  return ticks;
}

/** Zoomable NLE-style timeline with IN/OUT handles (BroadcastOS pattern). */
export function AssetClipTimeline({
  durationMs,
  currentMs,
  inMs,
  outMs,
  zoom,
  frameRate = 30,
  onSeek,
  onChangeIn,
  onChangeOut,
  thumbnailUrl,
  siblingClips = [],
}: ClipTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragTarget, setDragTarget] = useState<DragTarget>(null);

  const safeDuration = Math.max(1, durationMs);
  const trackWidthPct = 100 * zoom;

  const msToPct = useCallback(
    (ms: number) => (clamp(ms, 0, safeDuration) / safeDuration) * 100,
    [safeDuration],
  );

  const clientXToMs = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      const ratio = clamp((clientX - rect.left) / Math.max(1, rect.width), 0, 1);
      return Math.round(ratio * safeDuration);
    },
    [safeDuration],
  );

  useEffect(() => {
    if (!dragTarget) return;
    const onMove = (event: PointerEvent) => {
      const ms = clientXToMs(event.clientX);
      if (dragTarget === "playhead") onSeek(ms);
      else if (dragTarget === "in") onChangeIn(Math.min(ms, outMs - 1));
      else if (dragTarget === "out") onChangeOut(Math.max(ms, inMs + 1));
    };
    const onUp = () => setDragTarget(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [clientXToMs, dragTarget, inMs, onChangeIn, onChangeOut, onSeek, outMs]);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller || zoom <= 1.01) return;
    const maxScroll = scroller.scrollWidth - scroller.clientWidth;
    if (maxScroll <= 0) return;
    const playheadX = (currentMs / safeDuration) * scroller.scrollWidth;
    scroller.scrollLeft = clamp(playheadX - scroller.clientWidth / 2, 0, maxScroll);
  }, [currentMs, safeDuration, zoom]);

  const ticks = useMemo(
    () => buildTicks(safeDuration, zoom),
    [safeDuration, zoom],
  );

  return (
    <div
      ref={scrollRef}
      className="overflow-x-auto border-t border-border/60 bg-zinc-950 px-3 py-3 text-zinc-100"
    >
      <div
        className="mb-2 flex min-w-full items-center gap-3"
        style={{ minWidth: `${trackWidthPct}%` }}
      >
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl}
            alt=""
            className="h-10 w-[72px] rounded object-cover opacity-90"
          />
        ) : (
          <div className="h-10 w-[72px] rounded bg-white/10" />
        )}
        <p className="font-mono text-[11px] text-zinc-400">
          IN {formatTimecode(inMs, frameRate)} · OUT{" "}
          {formatTimecode(outMs, frameRate)} · DUR{" "}
          {formatTimecode(Math.max(0, outMs - inMs), frameRate)} · Zoom{" "}
          {Math.round(zoom * 100)}%
        </p>
      </div>

      <div
        className="relative pb-2 pt-6"
        style={{ minWidth: `${trackWidthPct}%` }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-5">
          {ticks.map((ms) => (
            <span
              key={ms}
              className="absolute -translate-x-1/2 font-mono text-[9px] text-zinc-500"
              style={{ left: `${msToPct(ms)}%` }}
            >
              {formatTimecode(ms, frameRate)}
            </span>
          ))}
        </div>

        <div
          ref={trackRef}
          role="slider"
          aria-valuemin={0}
          aria-valuemax={safeDuration}
          aria-valuenow={currentMs}
          tabIndex={0}
          className="relative h-14 cursor-ew-resize overflow-hidden rounded-md bg-zinc-800 select-none"
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            setDragTarget("playhead");
            onSeek(clientXToMs(event.clientX));
          }}
        >
          {siblingClips.map((clip) => (
            <div
              key={clip.id}
              title={clip.name}
              className="pointer-events-none absolute top-1 z-[1] h-2.5 rounded-sm bg-fuchsia-500/40"
              style={{
                left: `${msToPct(clip.startMs)}%`,
                width: `${Math.max(0.2, msToPct(clip.endMs) - msToPct(clip.startMs))}%`,
              }}
            />
          ))}

          <div
            className="pointer-events-none absolute inset-y-0 z-[2] border-x-2 border-sky-400 bg-sky-500/25"
            style={{
              left: `${msToPct(inMs)}%`,
              width: `${msToPct(outMs) - msToPct(inMs)}%`,
            }}
          />

          {Array.from({ length: Math.min(96, Math.round(48 * zoom)) }, (_, i) => {
            const count = Math.min(96, Math.round(48 * zoom));
            const h = 20 + ((i * 17) % 28);
            return (
              <div
                key={i}
                className="pointer-events-none absolute bottom-2 w-0.5 rounded-sm bg-zinc-600/70"
                style={{
                  left: `${(i / count) * 100}%`,
                  height: h,
                }}
              />
            );
          })}

          <button
            type="button"
            aria-label="IN point"
            className={cn(
              "absolute top-0 z-[4] h-full w-3 -translate-x-1/2 cursor-ew-resize",
              "bg-emerald-400/90",
            )}
            style={{ left: `${msToPct(inMs)}%` }}
            onPointerDown={(e) => {
              e.stopPropagation();
              setDragTarget("in");
            }}
          />
          <button
            type="button"
            aria-label="OUT point"
            className={cn(
              "absolute top-0 z-[4] h-full w-3 -translate-x-1/2 cursor-ew-resize",
              "bg-amber-400/90",
            )}
            style={{ left: `${msToPct(outMs)}%` }}
            onPointerDown={(e) => {
              e.stopPropagation();
              setDragTarget("out");
            }}
          />

          <div
            className="pointer-events-none absolute top-0 z-[5] h-full w-0.5 bg-white"
            style={{ left: `${msToPct(currentMs)}%` }}
          >
            <div className="absolute -top-1 left-1/2 size-2.5 -translate-x-1/2 rounded-full bg-white" />
          </div>
        </div>
      </div>
    </div>
  );
}
