"use client";

import { useCallback, useMemo, useRef } from "react";

import {
  COLLAPSED_TRACK_HEIGHT,
  MAX_TRACK_HEIGHT,
  MIN_TRACK_HEIGHT,
} from "@/features/creative-studio/constants/timeline-engine.constants";
import { msToPx } from "@/features/creative-studio/lib/timeline-engine-utils";
import { TimelineToolbar } from "@/features/creative-studio/components/timeline-engine/timeline-toolbar";
import {
  TimelineRuler,
  TimelineRulerSpacer,
} from "@/features/creative-studio/components/timeline-engine/timeline-ruler";
import { TrackHeader } from "@/features/creative-studio/components/timeline-engine/track-header";
import { TrackLane } from "@/features/creative-studio/components/timeline-engine/track-lane";
import type { MediaBinDragPayload } from "@/features/creative-studio/lib/studio-utils";
import type {
  CreativeProjectWithTimeline,
  SelectedClipRef,
} from "@/features/creative-studio/types/creative-studio.types";
import type {
  EnterpriseTimelineTrackWithClips,
  RippleMode,
  TimelineMarker,
} from "@/features/creative-studio/types/timeline-engine.types";
import { cn } from "@/lib/utils";

type TimelineEngineProps = {
  project: CreativeProjectWithTimeline;
  tracks: EnterpriseTimelineTrackWithClips[];
  markers?: TimelineMarker[];
  height: number;
  zoomLevel: number;
  snapEnabled: boolean;
  rippleMode: RippleMode;
  magneticEnabled: boolean;
  frameRate: number;
  playheadMs: number;
  selectedClipIds: string[];
  selectedTrackIds: string[];
  canUndo: boolean;
  canRedo: boolean;
  onSelectClip: (ref: SelectedClipRef, additive?: boolean) => void;
  onSelectTrack: (trackId: string) => void;
  onHeightChange: (height: number) => void;
  onZoomChange: (zoom: number) => void;
  onToggleSnap: () => void;
  onRippleModeChange: (mode: RippleMode) => void;
  onToggleMagnetic: () => void;
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
  onUpdateTrack: (
    trackId: string,
    patch: Partial<EnterpriseTimelineTrackWithClips>,
  ) => void;
  onUndo: () => void;
  onRedo: () => void;
  onSplit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onAddMarker: () => void;
};

function asEnterpriseTrack(
  track: EnterpriseTimelineTrackWithClips,
): EnterpriseTimelineTrackWithClips {
  return {
    ...track,
    collapsed: Boolean((track as EnterpriseTimelineTrackWithClips).collapsed),
    visible: (track as EnterpriseTimelineTrackWithClips).visible !== false,
    solo: Boolean((track as EnterpriseTimelineTrackWithClips).solo),
    color_label: String(
      (track as EnterpriseTimelineTrackWithClips).color_label ?? "default",
    ),
    clips: track.clips.map((clip) => ({
      ...clip,
      locked: Boolean((clip as { locked?: boolean }).locked),
      muted: Boolean((clip as { muted?: boolean }).muted),
      hidden: Boolean((clip as { hidden?: boolean }).hidden),
      color_label: String(
        (clip as { color_label?: string }).color_label ?? "default",
      ),
      content_object_id:
        (clip as { content_object_id?: string | null }).content_object_id ??
        null,
      scene_id: (clip as { scene_id?: string | null }).scene_id ?? null,
      voice_segment_id:
        (clip as { voice_segment_id?: string | null }).voice_segment_id ?? null,
      script_paragraph_id:
        (clip as { script_paragraph_id?: string | null }).script_paragraph_id ??
        null,
      source_clip_id:
        (clip as { source_clip_id?: string | null }).source_clip_id ?? null,
    })),
  };
}

export function TimelineEngine({
  project,
  tracks: rawTracks,
  markers = [],
  height,
  zoomLevel,
  snapEnabled,
  rippleMode,
  magneticEnabled,
  frameRate,
  playheadMs,
  selectedClipIds,
  selectedTrackIds,
  canUndo,
  canRedo,
  onSelectClip,
  onSelectTrack,
  onHeightChange,
  onZoomChange,
  onToggleSnap,
  onRippleModeChange,
  onToggleMagnetic,
  onSeek,
  onDropMedia,
  onTrimClip,
  onMoveClip,
  onUpdateTrack,
  onUndo,
  onRedo,
  onSplit,
  onDuplicate,
  onDelete,
  onAddMarker,
}: TimelineEngineProps) {
  const resizeRef = useRef<{
    trackId: string;
    originY: number;
    originHeight: number;
  } | null>(null);

  const tracks = useMemo(
    () => rawTracks.map(asEnterpriseTrack),
    [rawTracks],
  );

  const durationMs = project.timeline?.duration_ms ?? 60_000;
  const contentWidth = msToPx(durationMs, zoomLevel) + 120;
  const rippleActive = rippleMode !== "off";

  const handleTrim = useCallback(
    (
      trackId: string,
      clipId: string,
      startMs: number,
      endMs: number,
      rippleShiftMs?: number,
    ) => {
      onTrimClip(
        trackId,
        clipId,
        startMs,
        endMs,
        rippleActive ? rippleShiftMs : undefined,
      );
    },
    [onTrimClip, rippleActive],
  );

  const handleTrackResizeStart = (
    track: EnterpriseTimelineTrackWithClips,
    event: React.PointerEvent,
  ) => {
    resizeRef.current = {
      trackId: track.id,
      originY: event.clientY,
      originHeight: track.height,
    };
    event.currentTarget.setPointerCapture(event.pointerId);

    const onMove = (e: PointerEvent) => {
      if (!resizeRef.current) return;
      const delta = e.clientY - resizeRef.current.originY;
      const next = Math.min(
        MAX_TRACK_HEIGHT,
        Math.max(MIN_TRACK_HEIGHT, resizeRef.current.originHeight + delta),
      );
      onUpdateTrack(resizeRef.current.trackId, { height: next });
    };

    const onUp = () => {
      resizeRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <div
      className="flex shrink-0 flex-col border-t border-border/60 bg-muted/10"
      style={{ height }}
    >
      <TimelineToolbar
        snapEnabled={snapEnabled}
        rippleMode={rippleMode}
        magneticEnabled={magneticEnabled}
        zoomLevel={zoomLevel}
        canUndo={canUndo}
        canRedo={canRedo}
        hasSelection={selectedClipIds.length > 0}
        onToggleSnap={onToggleSnap}
        onRippleModeChange={onRippleModeChange}
        onToggleMagnetic={onToggleMagnetic}
        onZoomChange={onZoomChange}
        onHeightChange={(delta) =>
          onHeightChange(Math.max(160, Math.min(560, height + delta)))
        }
        onUndo={onUndo}
        onRedo={onRedo}
        onSplit={onSplit}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        onAddMarker={onAddMarker}
      />

      <div className="relative min-h-0 flex-1 overflow-auto">
        <div style={{ width: contentWidth, minWidth: "100%" }}>
          <div className="sticky top-0 z-20 flex bg-background/95">
            <TimelineRulerSpacer />
            <TimelineRuler
              durationMs={durationMs}
              zoomLevel={zoomLevel}
              snapEnabled={snapEnabled}
              frameRate={frameRate}
              playheadMs={playheadMs}
              markers={markers}
              onSeek={onSeek}
            />
          </div>

          {tracks.map((track) => (
            <div
              key={track.id}
              className={cn(
                "flex border-b border-border/40",
                track.solo ? "bg-primary/5" : "",
              )}
              style={{
                minHeight: track.collapsed
                  ? COLLAPSED_TRACK_HEIGHT
                  : track.height,
              }}
            >
              <TrackHeader
                track={track}
                selected={selectedTrackIds.includes(track.id)}
                onSelect={() => onSelectTrack(track.id)}
                onToggleCollapse={() =>
                  onUpdateTrack(track.id, { collapsed: !track.collapsed })
                }
                onToggleMute={() =>
                  onUpdateTrack(track.id, { muted: !track.muted })
                }
                onToggleLock={() =>
                  onUpdateTrack(track.id, { locked: !track.locked })
                }
                onResizeStart={(e) => handleTrackResizeStart(track, e)}
              />
              <TrackLane
                track={track}
                zoomLevel={zoomLevel}
                snapEnabled={snapEnabled}
                frameRate={frameRate}
                playheadMs={playheadMs}
                selectedClipIds={selectedClipIds}
                onSelectClip={(clipId, additive) => {
                  onSelectClip({ clipId, trackId: track.id }, additive);
                }}
                onSeek={onSeek}
                onDropMedia={onDropMedia}
                onTrimClip={handleTrim}
                onMoveClip={onMoveClip}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
