"use client";

import { useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Film,
  Image,
  Lock,
  LockOpen,
  Pause,
  Play,
  Repeat,
  RotateCcw,
  Search,
  SkipBack,
  SkipForward,
  Square,
  Type,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EDITOR_UI } from "@/features/scene-composer/components/editor/editor.constants";
import type { ComposerFrameRate } from "@/features/scene-composer/hooks/use-composer-playback";
import {
  getEntranceWindow,
  getExitWindow,
  getLayerMotionConfig,
  patchLayerMotionConfig,
} from "@/features/scene-composer/lib/motion-animation";
import { createLayerService } from "@/features/scene-composer/services/layer.service.impl";
import { getAppliedPresetName } from "@/features/scene-composer/lib/motion-presets";
import type { SceneObject } from "@/features/scene-composer/types/scene-composer.types";

const layerService = createLayerService();

type EnhancedTimelinePanelProps = {
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
  onStop: () => void;
  onRestart: () => void;
  onStepFrame: (direction: "back" | "forward") => void;
  onToggleLoop: () => void;
  onSetFrameRate: (fps: ComposerFrameRate) => void;
  onSelect: (id: string) => void;
  timelineZoom: number;
  onTimelineZoom: (zoom: number) => void;
  onObjectsChange: (objects: SceneObject[], label?: string) => void;
};

function layerIcon(object: SceneObject) {
  const name = object.name.toLowerCase();
  if (object.object_type === "video" || name.includes("video")) {
    return <Film className="size-4" />;
  }
  if (
    object.object_type === "image" ||
    object.object_type === "logo" ||
    name.includes("logo") ||
    name.includes("reporter")
  ) {
    return <Image className="size-4" />;
  }
  return <Type className="size-4" />;
}

type DragMode = "move" | "trim-start" | "trim-end" | "entrance" | "exit";

/**
 * Enhanced broadcast timeline — layers, animation bars, delays, drag timing.
 */
export function EnhancedTimelinePanel({
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
  onStop,
  onRestart,
  onStepFrame,
  onToggleLoop,
  onSetFrameRate,
  onSelect,
  timelineZoom,
  onTimelineZoom,
  onObjectsChange,
}: EnhancedTimelinePanelProps) {
  const [query, setQuery] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(
    {},
  );
  const widthPct = durationMs > 0 ? (playheadMs / durationMs) * 100 : 0;
  const dragRef = useRef<{
    mode: DragMode;
    objectId: string;
    startX: number;
    startMs: number;
    endMs: number;
    entranceDur: number;
    exitDur: number;
    trackWidth: number;
  } | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...objects].sort((a, b) => a.sort_order - b.sort_order);
    if (!q) return list;
    return list.filter((object) => object.name.toLowerCase().includes(q));
  }, [objects, query]);

  const groups = useMemo(() => {
    const map = new Map<string, SceneObject[]>();
    for (const object of filtered) {
      const group =
        typeof object.metadata?.layer === "string"
          ? String(object.metadata.layer)
          : object.parent_object_id
            ? "grouped"
            : object.object_type;
      const bucket = map.get(group) ?? [];
      bucket.push(object);
      map.set(group, bucket);
    }
    return [...map.entries()];
  }, [filtered]);

  const applyDrag = (clientX: number) => {
    const drag = dragRef.current;
    if (!drag || drag.trackWidth <= 0 || durationMs <= 0) return;
    const deltaPx = clientX - drag.startX;
    const deltaMs =
      (deltaPx / drag.trackWidth) * (durationMs / Math.max(0.25, timelineZoom));
    const snap = (ms: number) => Math.round(ms / 10) * 10;

    const object = objects.find((o) => o.id === drag.objectId);
    if (!object || object.locked) return;

    if (drag.mode === "move") {
      const span = drag.endMs - drag.startMs;
      let nextStart = snap(drag.startMs + deltaMs);
      nextStart = Math.max(0, Math.min(durationMs - span, nextStart));
      onObjectsChange(
        objects.map((o) =>
          o.id === object.id
            ? { ...o, start_ms: nextStart, end_ms: nextStart + span }
            : o,
        ),
        "Move layer timing",
      );
      return;
    }

    if (drag.mode === "trim-start") {
      let nextStart = snap(drag.startMs + deltaMs);
      nextStart = Math.max(0, Math.min(drag.endMs - 100, nextStart));
      onObjectsChange(
        objects.map((o) =>
          o.id === object.id ? { ...o, start_ms: nextStart } : o,
        ),
        "Trim layer start",
      );
      return;
    }

    if (drag.mode === "trim-end") {
      let nextEnd = snap(drag.endMs + deltaMs);
      nextEnd = Math.max(drag.startMs + 100, Math.min(durationMs, nextEnd));
      onObjectsChange(
        objects.map((o) =>
          o.id === object.id ? { ...o, end_ms: nextEnd } : o,
        ),
        "Trim layer end",
      );
      return;
    }

    if (drag.mode === "entrance") {
      const nextDur = Math.max(50, snap(drag.entranceDur + deltaMs));
      const next = patchLayerMotionConfig(object, {
        entrance: { durationMs: nextDur },
      });
      onObjectsChange(
        objects.map((o) => (o.id === object.id ? next : o)),
        "Adjust entrance duration",
      );
      return;
    }

    if (drag.mode === "exit") {
      const nextDur = Math.max(50, snap(drag.exitDur - deltaMs));
      const next = patchLayerMotionConfig(object, {
        exit: { durationMs: nextDur },
      });
      onObjectsChange(
        objects.map((o) => (o.id === object.id ? next : o)),
        "Adjust exit duration",
      );
    }
  };

  const beginDrag = (
    event: React.PointerEvent,
    object: SceneObject,
    mode: DragMode,
    trackEl: HTMLElement,
  ) => {
    if (object.locked) return;
    event.preventDefault();
    event.stopPropagation();
    const motion = getLayerMotionConfig(object);
    dragRef.current = {
      mode,
      objectId: object.id,
      startX: event.clientX,
      startMs: object.start_ms,
      endMs: object.end_ms,
      entranceDur: motion.entrance.durationMs,
      exitDur: motion.exit.durationMs,
      trackWidth: trackEl.getBoundingClientRect().width,
    };
    const onMove = (ev: PointerEvent) => applyDrag(ev.clientX);
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-3 py-2">
        <p className={`${EDITOR_UI.sectionHeader} mr-2`}>Timeline</p>
        <Button type="button" size="icon-sm" variant="ghost" onClick={() => onStepFrame("back")}>
          <SkipBack className="size-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className={EDITOR_UI.button}
          onClick={onTogglePlay}
        >
          {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
        </Button>
        <Button type="button" size="icon-sm" variant="ghost" onClick={() => onStepFrame("forward")}>
          <SkipForward className="size-4" />
        </Button>
        <Button type="button" size="icon-sm" variant="ghost" onClick={onStop} title="Stop">
          <Square className="size-3.5" />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={onRestart}
          title="Restart"
        >
          <RotateCcw className="size-3.5" />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant={loopPlayback ? "secondary" : "ghost"}
          onClick={onToggleLoop}
        >
          <Repeat className="size-4" />
        </Button>
        <div className="flex items-center gap-0.5 rounded-md border border-border/60 p-0.5">
          <Button
            type="button"
            size="sm"
            variant={frameRate === 30 ? "secondary" : "ghost"}
            className="h-7 px-2 text-[11px]"
            onClick={() => onSetFrameRate(30)}
          >
            30
          </Button>
          <Button
            type="button"
            size="sm"
            variant={frameRate === 60 ? "secondary" : "ghost"}
            className="h-7 px-2 text-[11px]"
            onClick={() => onSetFrameRate(60)}
          >
            60
          </Button>
        </div>
        <span className={`${EDITOR_UI.timeline} tabular-nums text-muted-foreground`}>
          {formatTimecode(playheadMs)} / {formatTimecode(durationMs)} · {frameRate}fps
        </span>
        <div className="relative ml-2 min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search layers…"
            className={`${EDITOR_UI.input} pl-8`}
          />
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={() => onTimelineZoom(Math.max(0.5, timelineZoom - 0.25))}
          >
            <ZoomOut className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={() => onTimelineZoom(Math.min(3, timelineZoom + 0.25))}
          >
            <ZoomIn className="size-4" />
          </Button>
        </div>
      </div>

      <div className="relative h-7 border-b border-border/40 bg-muted/30">
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
          aria-label="Playhead"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-2">
        {groups.map(([groupName, groupObjects]) => {
          const collapsed = Boolean(collapsedGroups[groupName]);
          return (
            <div key={groupName} className="mb-2">
              <button
                type="button"
                className="mb-1 flex w-full items-center gap-2 rounded px-1 py-1 text-left hover:bg-muted/40"
                onClick={() =>
                  setCollapsedGroups((prev) => ({
                    ...prev,
                    [groupName]: !prev[groupName],
                  }))
                }
              >
                {collapsed ? (
                  <ChevronRight className="size-4" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
                <span className={`${EDITOR_UI.label} capitalize`}>{groupName}</span>
                <span className="text-[12px] text-muted-foreground">
                  {groupObjects.length}
                </span>
              </button>

              {!collapsed
                ? groupObjects.map((object) => {
                    const leftPct =
                      durationMs > 0 ? (object.start_ms / durationMs) * 100 : 0;
                    const widthTrack =
                      durationMs > 0
                        ? ((object.end_ms - object.start_ms) / durationMs) * 100
                        : 0;
                    const selected = selectedIds.includes(object.id);
                    const motion = getLayerMotionConfig(object);
                    const entr = getEntranceWindow(object);
                    const exit = getExitWindow(object);
                    const delayEnd =
                      object.start_ms + motion.entrance.delayMs / motion.speed;
                    const delayWidthPct =
                      durationMs > 0
                        ? ((delayEnd - object.start_ms) / durationMs) * 100
                        : 0;
                    const entrLeftPct =
                      durationMs > 0 ? (entr.startMs / durationMs) * 100 : 0;
                    const entrWidthPct =
                      durationMs > 0
                        ? (Math.max(0, entr.endMs - entr.startMs) / durationMs) *
                          100
                        : 0;
                    const exitLeftPct =
                      durationMs > 0 ? (exit.startMs / durationMs) * 100 : 0;
                    const exitWidthPct =
                      durationMs > 0
                        ? (Math.max(0, exit.endMs - exit.startMs) / durationMs) *
                          100
                        : 0;

                    return (
                      <div
                        key={object.id}
                        className={`mb-1.5 flex items-center gap-2 rounded-md px-1 py-1 ${
                          selected
                            ? "bg-primary/10 ring-1 ring-primary/40"
                            : "hover:bg-muted/40"
                        }`}
                      >
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ background: object.layer_color }}
                        />
                        <span className="text-muted-foreground">
                          {layerIcon(object)}
                        </span>
                        <button
                          type="button"
                          className={`${EDITOR_UI.timeline} min-w-[140px] truncate text-left font-medium`}
                          onClick={() => onSelect(object.id)}
                          title={
                            typeof object.bindings.story_field === "string" &&
                            object.bindings.story_field
                              ? `Story · {{${object.bindings.story_field}}}`
                              : object.name
                          }
                        >
                          {object.name}
                          {typeof object.bindings.story_field === "string" &&
                          object.bindings.story_field ? (
                            <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                              {`{{${object.bindings.story_field}}}`}
                            </span>
                          ) : null}
                          {getAppliedPresetName(object) ? (
                            <span className="ml-1 block truncate text-[10px] font-normal text-sky-600/90">
                              {getAppliedPresetName(object)}
                            </span>
                          ) : null}
                        </button>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          className="size-7"
                          onClick={() =>
                            onObjectsChange(
                              layerService.toggleVisibility(objects, object.id),
                              "Toggle visibility",
                            )
                          }
                        >
                          {object.visible ? (
                            <Eye className="size-3.5" />
                          ) : (
                            <EyeOff className="size-3.5" />
                          )}
                        </Button>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          className="size-7"
                          onClick={() =>
                            onObjectsChange(
                              layerService.toggleLock(objects, object.id),
                              "Toggle lock",
                            )
                          }
                        >
                          {object.locked ? (
                            <Lock className="size-3.5" />
                          ) : (
                            <LockOpen className="size-3.5" />
                          )}
                        </Button>
                        <div
                          className="relative h-7 flex-1 rounded bg-muted/50"
                          onClick={() => onSelect(object.id)}
                        >
                          {/* Layer span */}
                          <div
                            className="absolute top-0.5 h-[calc(100%-4px)] rounded"
                            style={{
                              left: `${leftPct * timelineZoom}%`,
                              width: `${Math.max(2, widthTrack * timelineZoom)}%`,
                              background: object.layer_color,
                              opacity: selected ? 0.35 : 0.22,
                            }}
                            onPointerDown={(e) =>
                              beginDrag(
                                e,
                                object,
                                "move",
                                e.currentTarget.parentElement as HTMLElement,
                              )
                            }
                          />
                          {/* Delay (pre-entrance) */}
                          {delayWidthPct > 0.05 ? (
                            <div
                              className="pointer-events-none absolute top-1 h-2 rounded-sm bg-black/35"
                              style={{
                                left: `${leftPct * timelineZoom}%`,
                                width: `${Math.max(1, delayWidthPct * timelineZoom)}%`,
                              }}
                              title={`Delay ${motion.entrance.delayMs}ms`}
                            />
                          ) : null}
                          {/* Entrance */}
                          {motion.entrance.type !== "none" && entrWidthPct > 0 ? (
                            <div
                              className="absolute top-1 h-2 cursor-ew-resize rounded-sm bg-sky-400/90"
                              style={{
                                left: `${entrLeftPct * timelineZoom}%`,
                                width: `${Math.max(1.5, entrWidthPct * timelineZoom)}%`,
                              }}
                              title={`Entrance · ${motion.entrance.type}`}
                              onPointerDown={(e) =>
                                beginDrag(
                                  e,
                                  object,
                                  "entrance",
                                  e.currentTarget.parentElement as HTMLElement,
                                )
                              }
                            />
                          ) : null}
                          {/* Exit */}
                          {motion.exit.type !== "none" && exitWidthPct > 0 ? (
                            <div
                              className="absolute top-1 h-2 cursor-ew-resize rounded-sm bg-amber-400/90"
                              style={{
                                left: `${exitLeftPct * timelineZoom}%`,
                                width: `${Math.max(1.5, exitWidthPct * timelineZoom)}%`,
                              }}
                              title={`Exit · ${motion.exit.type}`}
                              onPointerDown={(e) =>
                                beginDrag(
                                  e,
                                  object,
                                  "exit",
                                  e.currentTarget.parentElement as HTMLElement,
                                )
                              }
                            />
                          ) : null}
                          {/* Trim handles */}
                          <div
                            className="absolute top-0 h-full w-1.5 cursor-ew-resize rounded-l bg-foreground/40"
                            style={{ left: `${leftPct * timelineZoom}%` }}
                            onPointerDown={(e) =>
                              beginDrag(
                                e,
                                object,
                                "trim-start",
                                e.currentTarget.parentElement as HTMLElement,
                              )
                            }
                          />
                          <div
                            className="absolute top-0 h-full w-1.5 cursor-ew-resize rounded-r bg-foreground/40"
                            style={{
                              left: `calc(${(leftPct + widthTrack) * timelineZoom}% - 6px)`,
                            }}
                            onPointerDown={(e) =>
                              beginDrag(
                                e,
                                object,
                                "trim-end",
                                e.currentTarget.parentElement as HTMLElement,
                              )
                            }
                          />
                        </div>
                      </div>
                    );
                  })
                : null}
            </div>
          );
        })}

        {filtered.length === 0 ? (
          <p className={`${EDITOR_UI.helper} py-8 text-center`}>
            No layers match your search.
          </p>
        ) : null}
      </div>

      {selectedIds.length === 1 ? (
        <div className="border-t border-border/60 p-2">
          <Input
            value={objects.find((o) => o.id === selectedIds[0])?.name ?? ""}
            onChange={(e) =>
              onObjectsChange(
                layerService.rename(objects, selectedIds[0], e.target.value),
                "Rename layer",
              )
            }
            className={EDITOR_UI.input}
            placeholder="Rename layer"
          />
        </div>
      ) : null}
    </div>
  );
}
