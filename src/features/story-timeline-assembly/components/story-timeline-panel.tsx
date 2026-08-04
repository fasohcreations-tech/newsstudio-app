"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Copy,
  Lock,
  LockOpen,
  Scissors,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TIMELINE_TRANSITION_TYPES,
} from "@/features/story-timeline-assembly/constants/timeline.constants";
import type {
  StoryTimelineBundle,
  StoryTimelineClipRow,
  StoryTimelineTransitionType,
} from "@/features/story-timeline-assembly/types/timeline.types";
import { cn } from "@/lib/utils";

const LABEL_WIDTH = 144; // w-36
/** Base pixels per second at zoom = 1 */
const PX_PER_SEC = 80;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 6;

function formatMs(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export { MIN_ZOOM, MAX_ZOOM };

type StoryTimelinePanelProps = {
  bundle: StoryTimelineBundle;
  selectedClipId: string | null;
  playheadMs: number;
  zoom: number;
  snap: boolean;
  /** When true, auto-scroll so the playhead stays in view */
  followPlayhead?: boolean;
  onSelectClip: (clipId: string | null) => void;
  onSeek: (ms: number) => void;
  onMoveClip: (clipId: string, startMs: number) => void;
  onTrimClip: (clipId: string, endMs: number) => void;
  onDuplicate: (clipId: string) => void;
  onDelete: (clipId: string) => void;
  onToggleLock: (clipId: string, locked: boolean) => void;
  onToggleEnabled: (clipId: string, enabled: boolean) => void;
  onSplit: (clipId: string, atMs: number) => void;
  onSetTransition: (
    fromClipId: string,
    toClipId: string,
    type: StoryTimelineTransitionType,
  ) => void;
};

/**
 * Production Timeline Panel — multi-track editor for assembled Scene references.
 * Single scroll surface so ruler + tracks stay aligned; playhead auto-follows.
 */
export function StoryTimelinePanel({
  bundle,
  selectedClipId,
  playheadMs,
  zoom,
  snap,
  followPlayhead = true,
  onSelectClip,
  onSeek,
  onMoveClip,
  onTrimClip,
  onDuplicate,
  onDelete,
  onToggleLock,
  onToggleEnabled,
  onSplit,
  onSetTransition,
}: StoryTimelinePanelProps) {
  const [dragClipId, setDragClipId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const userScrollingRef = useRef(false);
  const scrollIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clampedZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
  const pxPerMs = (clampedZoom * PX_PER_SEC) / 1000;
  const durationMs = Math.max(bundle.timeline.duration_ms, 1_000);
  const contentWidth = Math.max(
    320,
    Math.ceil(durationMs * pxPerMs) + 48,
  );

  const ticks = useMemo(() => {
    const step =
      clampedZoom < 0.5
        ? 20_000
        : clampedZoom < 0.85
          ? 10_000
          : clampedZoom < 1.5
            ? 5_000
            : clampedZoom < 3
              ? 1_000
              : 500;
    const out: number[] = [];
    for (let t = 0; t <= durationMs; t += step) out.push(t);
    return out;
  }, [durationMs, clampedZoom]);

  const selected = bundle.clips.find((c) => c.id === selectedClipId) ?? null;
  const sceneTrackId = bundle.tracks.find((t) => t.kind === "scene")?.id;
  const sceneClips = bundle.clips
    .filter((c) => c.track_id === sceneTrackId && c.enabled)
    .sort((a, b) => a.start_ms - b.start_ms);

  /** Convert pointer X (viewport) → timeline ms using the shared scroll content. */
  function clientXToMs(clientX: number): number {
    const scroller = scrollRef.current;
    if (!scroller) return 0;
    const rect = scroller.getBoundingClientRect();
    const xInContent =
      clientX - rect.left + scroller.scrollLeft - LABEL_WIDTH;
    let ms = Math.round(xInContent / pxPerMs);
    if (snap) {
      const grid = clampedZoom < 1 ? 500 : 100;
      ms = Math.round(ms / grid) * grid;
    }
    return Math.max(0, Math.min(durationMs, ms));
  }

  function clipStyle(clip: StoryTimelineClipRow) {
    return {
      left: clip.start_ms * pxPerMs,
      width: Math.max(8, clip.duration_ms * pxPerMs),
    };
  }

  // Keep playhead in the horizontal viewport while playing / scrubbing
  useEffect(() => {
    if (!followPlayhead || userScrollingRef.current) return;
    const scroller = scrollRef.current;
    if (!scroller) return;

    const playheadX = LABEL_WIDTH + playheadMs * pxPerMs;
    const viewLeft = scroller.scrollLeft;
    const viewRight = viewLeft + scroller.clientWidth;
    const margin = Math.min(120, scroller.clientWidth * 0.2);

    if (playheadX < viewLeft + margin || playheadX > viewRight - margin) {
      const target = Math.max(
        0,
        playheadX - scroller.clientWidth * 0.35,
      );
      scroller.scrollLeft = target;
    }
  }, [playheadMs, pxPerMs, followPlayhead]);

  // After zoom change, re-center on playhead so clips don't "disappear"
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const playheadX = LABEL_WIDTH + playheadMs * pxPerMs;
    scroller.scrollLeft = Math.max(
      0,
      playheadX - scroller.clientWidth * 0.35,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on zoom
  }, [clampedZoom]);

  return (
    <div className="flex min-h-0 flex-col rounded-lg border border-border/60 bg-background">
      {/* One scroll surface: sticky labels + aligned ruler/tracks */}
      <div
        ref={scrollRef}
        className="max-h-[420px] overflow-auto"
        onScroll={() => {
          userScrollingRef.current = true;
          if (scrollIdleTimer.current) clearTimeout(scrollIdleTimer.current);
          scrollIdleTimer.current = setTimeout(() => {
            userScrollingRef.current = false;
          }, 900);
        }}
        onClick={(e) => {
          // Ignore clicks on sticky labels / clip buttons (they stopPropagation)
          if ((e.target as HTMLElement).closest("[data-track-label]")) return;
          onSeek(clientXToMs(e.clientX));
        }}
      >
        <div style={{ width: LABEL_WIDTH + contentWidth }} className="min-w-full">
          {/* Ruler */}
          <div className="sticky top-0 z-30 flex border-b border-border/50 bg-background">
            <div
              data-track-label
              className="sticky left-0 z-40 shrink-0 border-r border-border/50 bg-muted/50"
              style={{ width: LABEL_WIDTH }}
            />
            <div
              className="relative h-7 shrink-0"
              style={{ width: contentWidth }}
            >
              {ticks.map((t) => (
                <div
                  key={t}
                  className="absolute top-0 h-full border-l border-border/40 pl-1 text-[9px] text-muted-foreground"
                  style={{ left: t * pxPerMs }}
                >
                  {formatMs(t)}
                </div>
              ))}
              <div
                className="pointer-events-none absolute top-0 z-20 h-full w-0.5 bg-rose-500"
                style={{ left: playheadMs * pxPerMs }}
              />
            </div>
          </div>

          {/* Tracks */}
          {bundle.tracks.map((track) => {
            const clips = bundle.clips.filter((c) => c.track_id === track.id);
            return (
              <div
                key={track.id}
                className="flex border-b border-border/40"
                style={{ minHeight: track.height }}
              >
                <div
                  data-track-label
                  className="sticky left-0 z-20 flex shrink-0 flex-col justify-center border-r border-border/50 bg-muted/40 px-2 py-1"
                  style={{ width: LABEL_WIDTH }}
                >
                  <span className="text-[11px] font-medium">{track.name}</span>
                  <span className="text-[9px] uppercase text-muted-foreground">
                    {track.kind}
                  </span>
                </div>
                <div
                  className="relative shrink-0 bg-zinc-950/5"
                  style={{ width: contentWidth, height: track.height }}
                >
                  {clips.map((clip) => (
                    <button
                      key={clip.id}
                      type="button"
                      draggable={!clip.locked}
                      title={clip.name}
                      className={cn(
                        "absolute top-1 bottom-1 overflow-hidden rounded border px-1 text-left text-[10px] text-white shadow-sm",
                        clip.id === selectedClipId
                          ? "ring-2 ring-white/80"
                          : "opacity-90 hover:opacity-100",
                        !clip.enabled && "opacity-40",
                        clip.locked && "cursor-not-allowed",
                      )}
                      style={{
                        ...clipStyle(clip),
                        backgroundColor: track.color ?? "#64748b",
                        borderColor: "rgba(255,255,255,0.25)",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectClip(clip.id);
                        onSeek(clip.start_ms);
                      }}
                      onDragStart={() => setDragClipId(clip.id)}
                      onDragEnd={(e) => {
                        if (!dragClipId || clip.locked) return;
                        const ms = clientXToMs(e.clientX);
                        onMoveClip(clip.id, ms);
                        setDragClipId(null);
                      }}
                    >
                      <span className="block truncate font-medium">
                        {clip.name || "Clip"}
                      </span>
                      <span className="block opacity-80">
                        {formatMs(clip.duration_ms)}
                      </span>
                      {!clip.locked ? (
                        <span
                          className="absolute inset-y-0 right-0 w-1.5 cursor-e-resize bg-white/30"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const onMove = (ev: MouseEvent) => {
                              const end = clientXToMs(ev.clientX);
                              if (end > clip.start_ms + 200) {
                                onTrimClip(clip.id, end);
                              }
                            };
                            const onUp = () => {
                              window.removeEventListener("mousemove", onMove);
                              window.removeEventListener("mouseup", onUp);
                            };
                            window.addEventListener("mousemove", onMove);
                            window.addEventListener("mouseup", onUp);
                          }}
                        />
                      ) : null}
                    </button>
                  ))}
                  <div
                    className="pointer-events-none absolute inset-y-0 z-10 w-0.5 bg-rose-500"
                    style={{ left: playheadMs * pxPerMs }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Context / selection */}
      <div className="flex flex-wrap items-center gap-2 border-t border-border/50 bg-muted/20 px-3 py-2">
        {selected ? (
          <>
            <Badge variant="secondary" className="text-[10px]">
              {selected.name}
            </Badge>
            <span className="font-mono text-[10px] text-muted-foreground">
              {formatMs(selected.start_ms)} → {formatMs(selected.end_ms)}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => onSplit(selected.id, playheadMs)}
            >
              <Scissors className="size-3.5" />
              Split at playhead
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => onDuplicate(selected.id)}
            >
              <Copy className="size-3.5" />
              Duplicate
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => onToggleLock(selected.id, !selected.locked)}
            >
              {selected.locked ? (
                <LockOpen className="size-3.5" />
              ) : (
                <Lock className="size-3.5" />
              )}
              {selected.locked ? "Unlock" : "Lock"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => onToggleEnabled(selected.id, !selected.enabled)}
            >
              {selected.enabled ? (
                <EyeOff className="size-3.5" />
              ) : (
                <Eye className="size-3.5" />
              )}
              {selected.enabled ? "Disable" : "Enable"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-destructive"
              onClick={() => onDelete(selected.id)}
            >
              <Trash2 className="size-3.5" />
              Delete
            </Button>

            {sceneClips.length > 1 ? (
              <div className="ml-auto flex flex-wrap items-center gap-1">
                <span className="text-[10px] text-muted-foreground">
                  Transition → next
                </span>
                {TIMELINE_TRANSITION_TYPES.map((t) => {
                  const idx = sceneClips.findIndex((c) => c.id === selected.id);
                  const next = idx >= 0 ? sceneClips[idx + 1] : null;
                  if (!next) return null;
                  return (
                    <Button
                      key={t.id}
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px]"
                      onClick={() =>
                        onSetTransition(selected.id, next.id, t.id)
                      }
                    >
                      {t.label}
                    </Button>
                  );
                })}
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            Select a clip · drag to move · right edge to trim · click ruler to
            seek
          </p>
        )}
      </div>
    </div>
  );
}
