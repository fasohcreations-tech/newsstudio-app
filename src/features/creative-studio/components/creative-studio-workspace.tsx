"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ChevronLeft, Film, Layers } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ResizablePanel } from "@/features/platform/components/resizable-panel";
import { ProjectExplorerPanel } from "@/features/creative-studio/components/panels/project-explorer-panel";
import { MediaBinPanel } from "@/features/creative-studio/components/panels/media-bin-panel";
import { TemplateLibraryPanel } from "@/features/creative-studio/components/panels/template-library-panel";
import { PreviewMonitor } from "@/features/creative-studio/components/panels/preview-monitor";
import { PlaybackControls } from "@/features/creative-studio/components/panels/playback-controls";
import { TimelineEngine } from "@/features/creative-studio/components/timeline-engine/timeline-engine";
import { InspectorPanel } from "@/features/creative-studio/components/panels/inspector-panel";
import { AiAssistantPanel } from "@/features/creative-studio/components/panels/ai-assistant-panel";
import { updateTimelineClipAction } from "@/features/creative-studio/actions/project.actions";
import type { MediaBinItem } from "@/features/creative-studio/actions/media-bin.actions";
import {
  createTimelineClipAction,
  moveTimelineClipAction,
  trimTimelineClipAction,
} from "@/features/creative-studio/actions/timeline.actions";
import {
  addTimelineMarkerAction,
  deleteTimelineClipAction,
  duplicateTimelineClipAction,
  splitTimelineClipAction,
  updateEnterpriseTimelineAction,
  updateTimelineTrackAction,
} from "@/features/creative-studio/actions/clip-operations.actions";
import { useUndoRedo } from "@/features/creative-studio/hooks/use-undo-redo";
import { useTimelineSelection } from "@/features/creative-studio/hooks/use-timeline-selection";
import { useStudioLayout } from "@/features/creative-studio/hooks/use-studio-layout";
import { usePreviewPlayback } from "@/features/creative-studio/hooks/use-preview-playback";
import { usePreviewMediaSources } from "@/features/creative-studio/hooks/use-preview-media";
import { useStudioShortcuts } from "@/features/creative-studio/hooks/use-studio-shortcuts";
import { useTimelinePersist } from "@/features/creative-studio/hooks/use-timeline-persist";
import { computeTimelineDurationMs } from "@/features/creative-studio/lib/timeline-composition";
import {
  DEFAULT_CLIP_DURATION_MS,
  type MediaBinDragPayload,
} from "@/features/creative-studio/lib/studio-utils";
import type {
  CreativeProjectWithTimeline,
  CreativeTemplate,
  CreativeTimelineClip,
  CreativeTimelineTrackWithClips,
  SelectedClipRef,
} from "@/features/creative-studio/types/creative-studio.types";
import type {
  EnterpriseTimeline,
  EnterpriseTimelineTrackWithClips,
  RippleMode,
  TimelineMarker,
} from "@/features/creative-studio/types/timeline-engine.types";
import { cn } from "@/lib/utils";

type CreativeStudioWorkspaceProps = {
  project: CreativeProjectWithTimeline;
  templates: CreativeTemplate[];
  organizationId: string;
  mediaAssets?: MediaBinItem[];
};

export function CreativeStudioWorkspace({
  project: initialProject,
  templates,
  organizationId,
  mediaAssets = [],
}: CreativeStudioWorkspaceProps) {
  const [project, setProject] = useState(initialProject);
  const [pending, startTransition] = useTransition();
  const {
    layout,
    setLayout,
    setLeftTab,
    setTimelineHeight,
    toggleSnap,
    setZoom,
  } = useStudioLayout();

  const syncedTimelineLayoutRef = useRef(false);

  useEffect(() => {
    if (!initialProject.timeline || syncedTimelineLayoutRef.current) return;
    syncedTimelineLayoutRef.current = true;

    const zoomLevel = Number(initialProject.timeline.zoom_level);
    const snapEnabled = initialProject.timeline.snap_enabled;

    setLayout((prev) => {
      if (
        prev.zoomLevel === zoomLevel &&
        prev.snapEnabled === snapEnabled
      ) {
        return prev;
      }
      return { ...prev, zoomLevel, snapEnabled };
    });
  }, [
    initialProject.id,
    initialProject.timeline?.zoom_level,
    initialProject.timeline?.snap_enabled,
    setLayout,
  ]);

  const timelineDurationMs = useMemo(
    () =>
      computeTimelineDurationMs(
        project.tracks,
        project.timeline?.duration_ms ?? 60_000,
      ),
    [project.tracks, project.timeline?.duration_ms],
  );

  const preview = usePreviewPlayback({
    durationMs: timelineDurationMs,
    frameRate: Number(project.frame_rate),
    resolutionWidth: project.resolution_width,
    resolutionHeight: project.resolution_height,
    initialPlayheadMs: project.timeline?.playhead_ms ?? 0,
  });

  const { sources: mediaSources } = usePreviewMediaSources(project);

  useTimelinePersist({
    timelineId: project.timeline?.id,
    playheadMs: preview.state.playheadMs,
    zoomLevel: layout.zoomLevel,
    snapEnabled: layout.snapEnabled,
  });

  const [markers, setMarkers] = useState<TimelineMarker[]>([]);
  const [rippleMode, setRippleMode] = useState<RippleMode>(() => {
    const tl = initialProject.timeline as EnterpriseTimeline | null;
    if (tl?.ripple_mode) return tl.ripple_mode;
    return "off";
  });
  const [magneticEnabled, setMagneticEnabled] = useState(() => {
    const tl = initialProject.timeline as EnterpriseTimeline | null;
    return Boolean(tl?.magnetic_enabled);
  });

  const { canUndo, canRedo, undo, redo } = useUndoRedo();
  const {
    selectedClipIds,
    selectedTrackIds,
    primaryClipId,
    selectClip,
    selectTrack,
  } = useTimelineSelection(project.timeline?.playhead_ms ?? 0);

  const selectedClip: SelectedClipRef = useMemo(() => {
    if (!primaryClipId) return null;
    for (const track of project.tracks) {
      if (track.clips.some((c) => c.id === primaryClipId)) {
        return { clipId: primaryClipId, trackId: track.id };
      }
    }
    return null;
  }, [primaryClipId, project.tracks]);

  const [rightTab, setRightTab] = useState<"inspector" | "ai">("inspector");

  const selectedClipData = useMemo(() => {
    if (!selectedClip) return null;
    return (
      project.tracks
        .find((t) => t.id === selectedClip.trackId)
        ?.clips.find((c) => c.id === selectedClip.clipId) ?? null
    );
  }, [project.tracks, selectedClip]);

  const enterpriseTracks = project.tracks as EnterpriseTimelineTrackWithClips[];

  const updateTrackClips = useCallback(
    (
      trackId: string,
      updater: (clips: CreativeTimelineClip[]) => CreativeTimelineClip[],
    ) => {
      setProject((prev) => ({
        ...prev,
        tracks: prev.tracks.map((track) =>
          track.id === trackId
            ? { ...track, clips: updater(track.clips) }
            : track,
        ),
      }));
    },
    [],
  );

  const handleClipChange = useCallback(
    (patch: Partial<CreativeTimelineClip>) => {
      if (!selectedClip) return;

      updateTrackClips(selectedClip.trackId, (clips) =>
        clips.map((clip) =>
          clip.id === selectedClip.clipId ? { ...clip, ...patch } : clip,
        ),
      );

      startTransition(async () => {
        const result = await updateTimelineClipAction({
          clipId: selectedClip.clipId,
          patch,
        });
        if (!result.success) {
          toast.error(result.error ?? "Failed to update clip");
        }
      });
    },
    [selectedClip, updateTrackClips],
  );

  const handleDropMedia = useCallback(
  (
    track: CreativeTimelineTrackWithClips,
    startMs: number,
    payload: MediaBinDragPayload,
  ) => {
    const durationMs = payload.durationMs ?? DEFAULT_CLIP_DURATION_MS;

    startTransition(async () => {
      const result = await createTimelineClipAction({
        trackId: track.id,
        name: payload.name,
        clipKind: payload.clipKind,
        startMs,
        durationMs,
        mediaAssetId: payload.assetId,
      });

      if (!result.success) {
        toast.error("Failed to add clip");
        return;
      }

      updateTrackClips(track.id, (clips) =>
        [...clips, result.data].sort((a, b) => a.start_ms - b.start_ms),
      );
      selectClip(result.data.id);
      toast.success("Clip added to timeline");
    });
  },
  [updateTrackClips, selectClip],
);

  const handleTrimClip = useCallback(
    (
      trackId: string,
      clipId: string,
      startMs: number,
      endMs: number,
      rippleShiftMs?: number,
    ) => {
      const track = project.tracks.find((t) => t.id === trackId);
      const original = track?.clips.find((c) => c.id === clipId);
      if (!original) return;

      updateTrackClips(trackId, (clips) => {
        let next = clips.map((clip) => {
          if (clip.id === clipId) {
            return { ...clip, start_ms: startMs, end_ms: endMs };
          }
          if (
            rippleMode !== "off" &&
            rippleShiftMs &&
            clip.start_ms >= original.end_ms
          ) {
            return {
              ...clip,
              start_ms: clip.start_ms + rippleShiftMs,
              end_ms: clip.end_ms + rippleShiftMs,
            };
          }
          return clip;
        });
        next = next.sort((a, b) => a.start_ms - b.start_ms);
        return next;
      });

      startTransition(async () => {
        const primary = await trimTimelineClipAction({
          clipId,
          startMs,
          endMs,
        });
        if (!primary.success) {
          toast.error(primary.error ?? "Failed to trim clip");
          return;
        }

        if (
          rippleMode !== "off" &&
          rippleShiftMs &&
          rippleShiftMs !== 0 &&
          track
        ) {
          const rippleClips = track.clips.filter(
            (clip) =>
              clip.id !== clipId && clip.start_ms >= original.end_ms,
          );
          await Promise.all(
            rippleClips.map((clip) =>
              trimTimelineClipAction({
                clipId: clip.id,
                startMs: clip.start_ms + rippleShiftMs,
                endMs: clip.end_ms + rippleShiftMs,
              }),
            ),
          );
        }
      });
    },
    [rippleMode, project.tracks, updateTrackClips],
  );

  const updateTracks = useCallback(
    (
      trackId: string,
      patch: Partial<EnterpriseTimelineTrackWithClips>,
    ) => {
      setProject((prev) => ({
        ...prev,
        tracks: prev.tracks.map((track) =>
          track.id === trackId ? { ...track, ...patch } : track,
        ),
      }));

      startTransition(async () => {
        const result = await updateTimelineTrackAction({
          trackId,
          name: patch.name,
          muted: patch.muted,
          locked: patch.locked,
          collapsed: patch.collapsed,
          visible: patch.visible,
          solo: patch.solo,
          height: patch.height,
          colorLabel: patch.color_label,
        });
        if (!result.success) {
          toast.error(result.error ?? "Failed to update track");
        }
      });
    },
    [],
  );

  const handleSelectClip = useCallback(
    (ref: SelectedClipRef, additive = false) => {
      if (!ref) return;
      selectClip(ref.clipId, additive);
      preview.seek(
        project.tracks
          .find((t) => t.id === ref.trackId)
          ?.clips.find((c) => c.id === ref.clipId)?.start_ms ?? preview.state.playheadMs,
      );
    },
    [selectClip, preview, project.tracks],
  );

  const handleSplitClip = useCallback(() => {
    if (!selectedClip) return;
    const atMs = preview.state.playheadMs;

    startTransition(async () => {
      const result = await splitTimelineClipAction({
        clipId: selectedClip.clipId,
        atMs,
      });
      if (!result.success) {
        toast.error(result.error ?? "Split failed");
        return;
      }
      const [left, right] = result.data;
      updateTrackClips(selectedClip.trackId, (clips) =>
        clips
          .map((c) => (c.id === left.id ? { ...c, ...left } : c))
          .concat(right)
          .sort((a, b) => a.start_ms - b.start_ms),
      );
      selectClip(right.id);
      toast.success("Clip split");
    });
  }, [selectedClip, preview.state.playheadMs, updateTrackClips, selectClip]);

  const handleDuplicateClip = useCallback(() => {
    if (!selectedClip) return;

    startTransition(async () => {
      const result = await duplicateTimelineClipAction({
        clipId: selectedClip.clipId,
      });
      if (!result.success) {
        toast.error(result.error ?? "Duplicate failed");
        return;
      }

      updateTrackClips(selectedClip.trackId, (clips) =>
        [...clips, result.data].sort((a, b) => a.start_ms - b.start_ms),
      );
      selectClip(result.data.id);
      toast.success("Clip duplicated");
    });
  }, [selectedClip, updateTrackClips, selectClip]);

  const handleDeleteClip = useCallback(() => {
    if (!selectedClip) return;
    const { trackId, clipId } = selectedClip;

    updateTrackClips(trackId, (clips) => clips.filter((c) => c.id !== clipId));

    startTransition(async () => {
      const result = await deleteTimelineClipAction({ clipId });
      if (!result.success) {
        toast.error(result.error ?? "Delete failed");
      } else {
        toast.success("Clip deleted");
      }
    });
  }, [selectedClip, updateTrackClips]);

  const handleAddMarker = useCallback(() => {
    if (!project.timeline?.id) return;
    const startMs = preview.state.playheadMs;

    startTransition(async () => {
      const result = await addTimelineMarkerAction({
        timelineId: project.timeline!.id,
        startMs,
        label: "Marker",
      });
      if (!result.success) {
        toast.error(result.error ?? "Failed to add marker");
        return;
      }
      setMarkers((prev) =>
        [...prev, result.data].sort((a, b) => a.start_ms - b.start_ms),
      );
      toast.success("Marker added");
    });
  }, [project.timeline, preview.state.playheadMs]);

  const handleRippleModeChange = useCallback(
    (mode: RippleMode) => {
      setRippleMode(mode);
      if (!project.timeline?.id) return;
      startTransition(async () => {
        await updateEnterpriseTimelineAction({
          timelineId: project.timeline!.id,
          rippleMode: mode,
        });
      });
    },
    [project.timeline],
  );

  const handleToggleMagnetic = useCallback(() => {
    const next = !magneticEnabled;
    setMagneticEnabled(next);
    if (!project.timeline?.id) return;
    startTransition(async () => {
      await updateEnterpriseTimelineAction({
        timelineId: project.timeline!.id,
        magneticEnabled: next,
      });
    });
  }, [magneticEnabled, project.timeline]);

  const handleMoveClip = useCallback(
    (trackId: string, clipId: string, startMs: number) => {
      const track = project.tracks.find((t) => t.id === trackId);
      const clip = track?.clips.find((c) => c.id === clipId);
      if (!clip) return;

      const duration = clip.end_ms - clip.start_ms;
      const endMs = startMs + duration;

      updateTrackClips(trackId, (clips) =>
        clips
          .map((c) =>
            c.id === clipId ? { ...c, start_ms: startMs, end_ms: endMs } : c,
          )
          .sort((a, b) => a.start_ms - b.start_ms),
      );

      startTransition(async () => {
        const result = await moveTimelineClipAction({
          clipId,
          trackId,
          startMs,
        });
        if (!result.success) {
          toast.error(result.error ?? "Failed to move clip");
        }
      });
    },
    [project.tracks, updateTrackClips],
  );

  const graphicsTrackId = useMemo(
    () =>
      project.tracks.find(
        (t) => t.kind === "graphics" || t.name.toLowerCase().includes("graphic"),
      )?.id ?? null,
    [project.tracks],
  );

  const graphicsEditorHref = useMemo(() => {
    const params = new URLSearchParams({ projectId: project.id });
    if (graphicsTrackId) params.set("trackId", graphicsTrackId);
    return `/creative-studio/scenes?${params.toString()}`;
  }, [project.id, graphicsTrackId]);

  const shortcutHandlers = useMemo(
    () => ({
      onPlayPause: preview.togglePlay,
      onFrameBack: () => preview.stepFrame("back"),
      onFrameForward: () => preview.stepFrame("forward"),
      onZoomIn: () => setZoom(Math.min(3, layout.zoomLevel + 0.25)),
      onZoomOut: () => setZoom(Math.max(0.5, layout.zoomLevel - 0.25)),
      onToggleSnap: toggleSnap,
      onFullscreen: preview.toggleFullscreen,
    }),
    [layout.zoomLevel, preview, setZoom, toggleSnap],
  );

  useStudioShortcuts(shortcutHandlers);

  return (
    <div className="-m-4 flex h-[calc(100svh-3.5rem-2.25rem)] min-h-0 flex-col overflow-hidden border-y border-border/60 bg-background md:-m-6">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border/60 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            nativeButton={false}
            render={<Link href="/creative-studio" />}
          >
            <ChevronLeft className="size-4" />
            Projects
          </Button>
          <Film className="size-4 text-muted-foreground" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{project.title}</p>
            <p className="text-[11px] text-muted-foreground">
              {project.resolution_width}×{project.resolution_height} · Manual
              edit mode
              {rippleMode !== "off" ? ` · Ripple ${rippleMode}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            nativeButton={false}
            render={<Link href={graphicsEditorHref} />}
          >
            <Layers className="size-3.5" />
            Scenes
          </Button>
          <span className="hidden text-[11px] text-muted-foreground sm:inline">
            Snap {layout.snapEnabled ? "ON" : "OFF"}
          </span>
          <span className="text-[11px] text-muted-foreground">
            Zoom {(layout.zoomLevel * 100).toFixed(0)}%
          </span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <ResizablePanel
          storageKey={`mediaos.creative-studio.left.${project.id}`}
          defaultWidth={layout.leftPanelWidth}
          minWidth={220}
          maxWidth={400}
          side="left"
        >
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex border-b border-border/60">
              {(
                [
                  ["explorer", "Explorer"],
                  ["media", "Media"],
                  ["templates", "Templates"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={cn(
                    "flex-1 px-2 py-2 text-[11px] font-medium",
                    layout.leftPanelTab === id
                      ? "border-b-2 border-primary text-foreground"
                      : "text-muted-foreground",
                  )}
                  onClick={() => setLeftTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-3">
              {layout.leftPanelTab === "explorer" ? (
                <ProjectExplorerPanel project={project} />
              ) : null}
              {layout.leftPanelTab === "media" ? (
                <MediaBinPanel
                  organizationId={organizationId}
                  storyId={project.story_id}
                  initialAssets={mediaAssets}
                />
              ) : null}
              {layout.leftPanelTab === "templates" ? (
                <TemplateLibraryPanel templates={templates} />
              ) : null}
            </div>
          </div>
        </ResizablePanel>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
            <PreviewMonitor
              project={project}
              tracks={project.tracks}
              preview={preview}
              mediaSources={mediaSources}
              selectedClip={selectedClipData}
            />
          </div>
          <PlaybackControls preview={preview} />
        </div>

        <ResizablePanel
          storageKey={`mediaos.creative-studio.right.${project.id}`}
          defaultWidth={layout.rightPanelWidth}
          minWidth={260}
          maxWidth={420}
          side="right"
        >
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex border-b border-border/60">
              <button
                type="button"
                className={cn(
                  "flex-1 px-2 py-2 text-[11px] font-medium",
                  rightTab === "inspector"
                    ? "border-b-2 border-primary"
                    : "text-muted-foreground",
                )}
                onClick={() => setRightTab("inspector")}
              >
                Inspector
              </button>
              <button
                type="button"
                className={cn(
                  "flex-1 px-2 py-2 text-[11px] font-medium",
                  rightTab === "ai"
                    ? "border-b-2 border-primary"
                    : "text-muted-foreground",
                )}
                onClick={() => setRightTab("ai")}
              >
                AI Assistant
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-3">
              {rightTab === "inspector" ? (
                <InspectorPanel
                  clip={selectedClipData}
                  onChange={handleClipChange}
                  disabled={pending}
                  projectId={project.id}
                  graphicsTrackId={graphicsTrackId}
                />
              ) : (
                <AiAssistantPanel />
              )}
            </div>
          </div>
        </ResizablePanel>
      </div>

      <TimelineEngine
        project={project}
        tracks={enterpriseTracks}
        markers={markers}
        height={layout.timelineHeight}
        zoomLevel={layout.zoomLevel}
        snapEnabled={layout.snapEnabled}
        rippleMode={rippleMode}
        magneticEnabled={magneticEnabled}
        frameRate={Number(project.frame_rate)}
        playheadMs={preview.state.playheadMs}
        selectedClipIds={selectedClipIds}
        selectedTrackIds={selectedTrackIds}
        canUndo={canUndo}
        canRedo={canRedo}
        onSelectClip={handleSelectClip}
        onSelectTrack={selectTrack}
        onHeightChange={setTimelineHeight}
        onZoomChange={setZoom}
        onToggleSnap={toggleSnap}
        onRippleModeChange={handleRippleModeChange}
        onToggleMagnetic={handleToggleMagnetic}
        onSeek={preview.seek}
        onDropMedia={handleDropMedia}
        onTrimClip={handleTrimClip}
        onMoveClip={handleMoveClip}
        onUpdateTrack={updateTracks}
        onUndo={() => void undo()}
        onRedo={() => void redo()}
        onSplit={handleSplitClip}
        onDuplicate={handleDuplicateClip}
        onDelete={handleDeleteClip}
        onAddMarker={handleAddMarker}
      />
    </div>
  );
}
