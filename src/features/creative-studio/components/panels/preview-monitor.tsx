"use client";

import { useEffect, useMemo, useRef } from "react";
import { ImageIcon, Maximize2, Minimize2, Shield, Volume2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatTimecode } from "@/features/creative-studio/hooks/use-preview-playback";
import type { PreviewMediaSource } from "@/features/creative-studio/actions/preview.actions";
import {
  getActiveClipsAtPlayhead,
  getAudioLayers,
  getGraphicsLayers,
  getPrimaryVideoLayer,
  getSceneMotionLayers,
  hasSceneGraphicVisual,
} from "@/features/creative-studio/lib/timeline-composition";
import type {
  CreativeProjectWithTimeline,
  CreativeTimelineClip,
  CreativeTimelineTrackWithClips,
} from "@/features/creative-studio/types/creative-studio.types";
import { MotionSceneOverlay } from "@/features/motion-scene-engine/components/motion-scene-overlay";

type PreviewMonitorProps = {
  project: CreativeProjectWithTimeline;
  tracks: CreativeTimelineTrackWithClips[];
  preview: ReturnType<
    typeof import("@/features/creative-studio/hooks/use-preview-playback").usePreviewPlayback
  >;
  mediaSources: Record<string, PreviewMediaSource>;
  selectedClip: CreativeTimelineClip | null;
};

export function PreviewMonitor({
  project,
  tracks,
  preview,
  mediaSources,
  selectedClip,
}: PreviewMonitorProps) {
  const { state, toggleSafeArea, toggleFullscreen, setFullscreen } = preview;
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (state.isFullscreen && document.fullscreenElement !== el) {
      void el.requestFullscreen().catch(() => setFullscreen(false));
    } else if (!state.isFullscreen && document.fullscreenElement === el) {
      void document.exitFullscreen();
    }
  }, [state.isFullscreen, setFullscreen]);

  const layers = useMemo(
    () => getActiveClipsAtPlayhead(tracks, state.playheadMs),
    [tracks, state.playheadMs],
  );

  const videoLayer = useMemo(() => getPrimaryVideoLayer(layers), [layers]);
  const graphicsLayers = useMemo(() => getGraphicsLayers(layers), [layers]);
  const sceneMotionLayers = useMemo(
    () => getSceneMotionLayers(layers),
    [layers],
  );
  const audioLayers = useMemo(() => getAudioLayers(layers), [layers]);

  const videoSource = videoLayer?.clip.media_asset_id
    ? mediaSources[videoLayer.clip.media_asset_id]
    : null;

  const primaryAudio = audioLayers[0];
  const audioSource = primaryAudio?.clip.media_asset_id
    ? mediaSources[primaryAudio.clip.media_asset_id]
    : null;

  useEffect(() => {
    const onFullscreenChange = () => {
      const isFs = document.fullscreenElement === containerRef.current;
      if (isFs !== state.isFullscreen) {
        setFullscreen(isFs);
      }
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, [state.isFullscreen, setFullscreen]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoSource) return;

    const localSec = (videoLayer?.localMs ?? 0) / 1000;
    if (Math.abs(video.currentTime - localSec) > 0.15) {
      video.currentTime = localSec;
    }

    if (state.isPlaying) {
      void video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }, [
    state.playheadMs,
    state.isPlaying,
    videoSource,
    videoLayer?.localMs,
    videoLayer?.clip.id,
  ]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioSource) return;

    const localSec = (primaryAudio?.localMs ?? 0) / 1000;
    if (Math.abs(audio.currentTime - localSec) > 0.15) {
      audio.currentTime = localSec;
    }
    audio.volume = Number(primaryAudio?.clip.volume ?? 1);

    if (state.isPlaying) {
      void audio.play().catch(() => undefined);
    } else {
      audio.pause();
    }
  }, [
    state.playheadMs,
    state.isPlaying,
    audioSource,
    primaryAudio?.localMs,
    primaryAudio?.clip.id,
    primaryAudio?.clip.volume,
  ]);

  const hasVisual =
    videoSource ||
    hasSceneGraphicVisual(layers) ||
    graphicsLayers.some((layer) => layer.clip.media_asset_id);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span className="shrink-0 font-mono">
          {formatTimecode(state.playheadMs, state.frameRate)} /{" "}
          {formatTimecode(state.durationMs, state.frameRate)}
        </span>
        <span className="hidden truncate text-center sm:inline">
          {state.resolution.width}×{state.resolution.height} · {state.frameRate}{" "}
          fps
          {layers.length > 0 ? ` · ${layers.length} active` : ""}
        </span>
        <div className="flex shrink-0 gap-1">
          <Button
            type="button"
            size="icon-sm"
            variant={state.safeAreaVisible ? "secondary" : "ghost"}
            onClick={toggleSafeArea}
            aria-label="Toggle safe area"
          >
            <Shield className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={toggleFullscreen}
            aria-label="Fullscreen"
          >
            {state.isFullscreen ? (
              <Minimize2 className="size-3.5" />
            ) : (
              <Maximize2 className="size-3.5" />
            )}
          </Button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-zinc-950 p-3"
      >
        <div
          className="relative h-full w-auto max-w-full overflow-hidden rounded-md bg-black shadow-inner"
          style={{
            aspectRatio: `${project.resolution_width} / ${project.resolution_height}`,
          }}
        >
          {state.safeAreaVisible ? (
            <div
              className="pointer-events-none absolute inset-[8%] z-20 border border-dashed border-white/30"
              aria-hidden
            />
          ) : null}

          {videoSource && videoLayer?.clip.clip_kind === "video" ? (
            <video
              ref={videoRef}
              key={`${videoLayer.clip.id}-${videoSource.url}`}
              src={videoSource.url}
              className="absolute inset-0 size-full object-contain"
              style={{
                opacity: Number(videoLayer.clip.opacity),
                transform: `translate(${videoLayer.clip.position_x}px, ${videoLayer.clip.position_y}px) scale(${videoLayer.clip.scale}) rotate(${videoLayer.clip.rotation}deg)`,
              }}
              muted
              playsInline
              preload="auto"
            />
          ) : null}

          {videoSource && videoLayer?.clip.clip_kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={videoSource.url}
              alt={videoLayer.clip.name}
              className="absolute inset-0 size-full object-contain"
              style={{
                opacity: Number(videoLayer.clip.opacity),
                transform: `translate(${videoLayer.clip.position_x}px, ${videoLayer.clip.position_y}px) scale(${videoLayer.clip.scale}) rotate(${videoLayer.clip.rotation}deg)`,
              }}
            />
          ) : null}

          {graphicsLayers.map((layer) => {
            if (layer.clip.clip_kind === "graphic") return null;
            if (!layer.clip.media_asset_id) return null;
            const source = mediaSources[layer.clip.media_asset_id];
            if (!source) return null;
            if (
              videoLayer?.clip.id === layer.clip.id &&
              layer.track.kind === "video"
            ) {
              return null;
            }

            return source.fileType === "video" ? (
              <video
                key={layer.clip.id}
                src={source.url}
                className="pointer-events-none absolute inset-0 size-full object-contain"
                style={{
                  opacity: Number(layer.clip.opacity),
                  transform: `translate(${layer.clip.position_x}px, ${layer.clip.position_y}px) scale(${layer.clip.scale}) rotate(${layer.clip.rotation}deg)`,
                }}
                muted
                playsInline
                preload="metadata"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={layer.clip.id}
                src={source.url}
                alt={layer.clip.name}
                className="pointer-events-none absolute inset-0 size-full object-contain"
                style={{
                  opacity: Number(layer.clip.opacity),
                  transform: `translate(${layer.clip.position_x}px, ${layer.clip.position_y}px) scale(${layer.clip.scale}) rotate(${layer.clip.rotation}deg)`,
                }}
              />
            );
          })}

          {sceneMotionLayers.map((layer) => {
            const doc = layer.motion.sceneDocument;
            const canvasW = Number(
              (layer.clip.metadata as Record<string, unknown>).canvas_width ?? 1920,
            );
            const canvasH = Number(
              (layer.clip.metadata as Record<string, unknown>).canvas_height ?? 1080,
            );

            return (
            <MotionSceneOverlay
              key={layer.clip.id}
              sceneDocument={doc}
              resolvedBindings={layer.motion.resolvedBindings}
              canvasWidth={canvasW}
              canvasHeight={canvasH}
              className="pointer-events-none absolute inset-0 z-10"
              style={{
                opacity: Number(layer.clip.opacity),
                transform: `translate(${layer.clip.position_x}px, ${layer.clip.position_y}px) scale(${layer.clip.scale}) rotate(${layer.clip.rotation}deg)`,
              }}
            />
            );
          })}

          {audioSource ? (
            <audio
              ref={audioRef}
              key={`${primaryAudio?.clip.id}-${audioSource.url}`}
              src={audioSource.url}
              className="hidden"
              preload="auto"
            />
          ) : null}

          {!hasVisual ? (
            <div className="flex h-full min-h-[120px] w-full min-w-[200px] flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-center text-white/90">
              <ImageIcon className="mb-2 size-8 opacity-50" />
              <p className="text-sm font-medium">Program Monitor</p>
              <p className="mt-1 text-xs text-white/60">
                {selectedClip
                  ? `Selected: ${selectedClip.name}`
                  : layers.length === 0
                    ? "Scrub the timeline or add clips to preview"
                    : "Audio-only at playhead"}
              </p>
              {audioSource ? (
                <p className="mt-2 flex items-center gap-1 text-[10px] text-green-300">
                  <Volume2 className="size-3" />
                  {primaryAudio?.clip.name}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
