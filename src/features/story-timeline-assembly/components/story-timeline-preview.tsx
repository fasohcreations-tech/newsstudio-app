"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Film, Loader2 } from "lucide-react";

import { getComposerSceneAction } from "@/features/scene-composer/actions/scene-composer.actions";
import type { ComposerScene } from "@/features/scene-composer/types/scene-composer.types";
import { StoryLivePreview } from "@/features/story-production/components/story-live-preview";
import { useResolvedStoryBindings } from "@/features/story-production/hooks/use-resolved-story-bindings";
import type { StoryPreviewAspect } from "@/features/story-production/types/story-data.types";
import {
  getActiveClipAtPlayhead,
  getSceneClipsSorted,
  getTrackIdByKind,
} from "@/features/story-timeline-assembly/lib/active-clip";
import { extendComposerSceneForDuration } from "@/features/story-scene-builder/lib/extend-scene-duration";
import type { StoryTimelineBundle } from "@/features/story-timeline-assembly/types/timeline.types";
import type { StorySceneInstanceRow } from "@/features/story-scene-builder/types/scene-builder.types";
import { cn } from "@/lib/utils";

type StoryTimelinePreviewProps = {
  bundle: StoryTimelineBundle;
  scenes: StorySceneInstanceRow[];
  playheadMs: number;
  playing: boolean;
  voiceUrl: string | null;
  className?: string;
};

function aspectFromTimeline(
  width: number | null | undefined,
  height: number | null | undefined,
): StoryPreviewAspect {
  if (width === 1080 && height === 1920) return "1080x1920";
  if (width === 1080 && height === 1080) return "1080x1080";
  if (width === 3840 && height === 2160) return "3840x2160";
  return "1920x1080";
}

function syncMediaTime(
  el: HTMLMediaElement,
  targetSec: number,
  playing: boolean,
  hard: boolean,
) {
  const drift = Math.abs(el.currentTime - targetSec);
  const threshold = playing ? 0.4 : 0.05;
  if (hard || drift > threshold) {
    try {
      el.currentTime = targetSec;
    } catch {
      /* ignore seek race before metadata */
    }
  }
  if (playing) {
    if (el.paused) void el.play().catch(() => undefined);
  } else if (!el.paused) {
    el.pause();
  }
}

function buildPreviewBindings(
  composer: ComposerScene | null,
  instance: StorySceneInstanceRow | null,
): Record<string, string> {
  const base: Record<string, string> = {
    ...(composer?.resolved_bindings ?? {}),
  };
  if (!instance) return base;

  const headline = instance.headline?.trim();
  const subheadline = instance.subheadline?.trim();
  const video = instance.video_asset_ref?.trim();
  const image = instance.image_asset_ref?.trim();
  const logo = instance.logo_ref?.trim();

  if (headline) base.headline = headline;
  if (subheadline) base.subheadline = subheadline;
  if (video) {
    base.main_video = video;
    base.video = video;
  }
  if (image) base.main_image = image;
  if (logo) {
    base.logo = logo;
    base.channel_logo = logo;
  }
  return base;
}

/**
 * Monitor preview for the production Timeline — composed Scene Instances.
 * Active scene loads first; neighbors prefetch in the background. Previous
 * frame is held across cuts so the monitor does not flash empty.
 */
export function StoryTimelinePreview({
  bundle,
  scenes,
  playheadMs,
  playing,
  voiceUrl,
  className,
}: StoryTimelinePreviewProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastVoiceClipId = useRef<string | null>(null);
  const cacheRef = useRef<Record<string, ComposerScene>>({});
  const inflightRef = useRef<Map<string, Promise<ComposerScene | null>>>(
    new Map(),
  );
  const [composerById, setComposerById] = useState<
    Record<string, ComposerScene>
  >({});
  const [activeLoading, setActiveLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const sceneTrackId = getTrackIdByKind(bundle, "scene");
  const voiceTrackId = getTrackIdByKind(bundle, "voice");
  const activeSceneClip = getActiveClipAtPlayhead(
    bundle.clips,
    sceneTrackId,
    playheadMs,
  );
  const activeVoiceClip = getActiveClipAtPlayhead(
    bundle.clips,
    voiceTrackId,
    playheadMs,
  );

  const instance = useMemo(() => {
    if (!activeSceneClip?.scene_instance_id) return null;
    return (
      scenes.find((s) => s.id === activeSceneClip.scene_instance_id) ?? null
    );
  }, [activeSceneClip?.scene_instance_id, scenes]);

  const motionSceneId = instance?.scene_id?.trim() || null;
  const composer = motionSceneId
    ? (composerById[motionSceneId] ?? cacheRef.current[motionSceneId] ?? null)
    : null;

  const displayComposerRef = useRef<ComposerScene | null>(null);
  const displayInstanceRef = useRef<StorySceneInstanceRow | null>(null);
  if (composer) {
    displayComposerRef.current = composer;
    displayInstanceRef.current = instance;
  }
  const displayComposer = composer ?? displayComposerRef.current;
  const displayInstance = composer ? instance : displayInstanceRef.current;

  const allMotionIds = useMemo(() => {
    const ids: string[] = [];
    const seen = new Set<string>();
    for (const clip of getSceneClipsSorted(bundle)) {
      const row = scenes.find((s) => s.id === clip.scene_instance_id);
      const id = row?.scene_id?.trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
    return ids;
  }, [bundle, scenes]);

  function remember(id: string, scene: ComposerScene) {
    cacheRef.current[id] = scene;
    setComposerById((prev) =>
      prev[id] === scene ? prev : { ...prev, [id]: scene },
    );
  }

  function loadComposer(id: string): Promise<ComposerScene | null> {
    const cached = cacheRef.current[id];
    if (cached) return Promise.resolve(cached);

    const existing = inflightRef.current.get(id);
    if (existing) return existing;

    const promise = getComposerSceneAction(id)
      .then((result) => {
        if (result.success && result.data) {
          remember(id, result.data);
          return result.data;
        }
        return null;
      })
      .catch(() => null)
      .finally(() => {
        inflightRef.current.delete(id);
      });

    inflightRef.current.set(id, promise);
    return promise;
  }

  // Priority: load the active scene immediately
  useEffect(() => {
    if (!motionSceneId) {
      setActiveLoading(false);
      return;
    }
    if (cacheRef.current[motionSceneId] || composerById[motionSceneId]) {
      setActiveLoading(false);
      setLoadError(null);
      return;
    }

    let alive = true;
    setActiveLoading(true);
    void loadComposer(motionSceneId).then((scene) => {
      if (!alive) return;
      setActiveLoading(false);
      if (!scene) {
        setLoadError("Could not load composed scene");
      } else {
        setLoadError(null);
      }
    });

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadComposer is stable via refs
  }, [motionSceneId]);

  // Background prefetch of the rest (does not block the monitor)
  useEffect(() => {
    const others = allMotionIds.filter((id) => id !== motionSceneId);
    for (const id of others) {
      if (cacheRef.current[id] || inflightRef.current.has(id)) continue;
      void loadComposer(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allMotionIds.join("|"), motionSceneId]);

  const rawBindings = useMemo(
    () => buildPreviewBindings(displayComposer, displayInstance),
    [displayComposer, displayInstance],
  );
  const resolvedBindings = useResolvedStoryBindings(rawBindings);

  const offsetInClip = activeSceneClip
    ? Math.max(0, playheadMs - activeSceneClip.start_ms)
    : 0;
  const scenePlayheadMs =
    (activeSceneClip?.trim_in_ms ?? 0) + offsetInClip;

  const previewComposer = useMemo(() => {
    if (!displayComposer) return null;
    const needMs = Math.max(
      activeSceneClip?.duration_ms ?? 0,
      displayComposer.duration_ms ?? 0,
      scenePlayheadMs + 1,
    );
    return extendComposerSceneForDuration(displayComposer, needMs);
  }, [displayComposer, activeSceneClip?.duration_ms, scenePlayheadMs]);

  useEffect(() => {
    lastVoiceClipId.current = null;
  }, [voiceUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !voiceUrl) return;

    if (!activeVoiceClip) {
      lastVoiceClipId.current = null;
      if (!audio.paused) audio.pause();
      return;
    }

    const clipChanged = lastVoiceClipId.current !== activeVoiceClip.id;
    lastVoiceClipId.current = activeVoiceClip.id;
    const localMs = Math.max(0, playheadMs - activeVoiceClip.start_ms);
    const voiceMs = (activeVoiceClip.trim_in_ms ?? 0) + localMs;
    syncMediaTime(audio, voiceMs / 1000, playing, clipChanged);
  }, [voiceUrl, playheadMs, playing, activeVoiceClip]);

  const aspect = aspectFromTimeline(
    bundle.timeline.resolution_width,
    bundle.timeline.resolution_height,
  );
  const cssAspect =
    bundle.timeline.resolution_width && bundle.timeline.resolution_height
      ? bundle.timeline.resolution_width / bundle.timeline.resolution_height
      : 16 / 9;

  const showLoader = activeLoading && !previewComposer;
  const switching = Boolean(motionSceneId) && !composer && Boolean(previewComposer);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-border/60 bg-zinc-950",
        className,
      )}
      style={{ aspectRatio: String(cssAspect) }}
    >
      {voiceUrl ? (
        <audio ref={audioRef} src={voiceUrl} preload="auto" className="hidden" />
      ) : null}

      {previewComposer ? (
        <div className="absolute inset-0 min-h-0">
          <StoryLivePreview
            key={composer?.id ?? displayComposer?.id ?? "preview"}
            scene={previewComposer}
            resolvedBindings={resolvedBindings}
            playheadMs={composer ? scenePlayheadMs : 0}
            motionMode={playing && Boolean(composer) ? "playback" : "edit"}
            isPlaying={playing && Boolean(composer)}
            aspect={aspect}
            interactive={false}
            className="h-full w-full !bg-transparent"
          />
        </div>
      ) : showLoader ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-400">
          <Loader2 className="size-8 animate-spin opacity-60" />
          <p className="text-xs">Loading scene…</p>
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-500">
          <Film className="size-10 opacity-40" />
          <p className="max-w-[80%] text-center text-xs">
            {!instance
              ? "No scene at playhead"
              : !motionSceneId
                ? "Scene Instance has no composed Motion Scene"
                : loadError ?? "Composed scene unavailable"}
          </p>
        </div>
      )}

      {switching ? (
        <div className="pointer-events-none absolute right-2 top-2 rounded bg-black/55 px-2 py-1 text-[10px] text-white/70">
          Preparing next scene…
        </div>
      ) : null}

      {instance ? (
        <div className="pointer-events-none absolute left-2 top-2 rounded bg-black/55 px-2 py-1 font-mono text-[10px] text-white/80">
          {activeSceneClip?.name ?? instance.name} · +
          {Math.round(offsetInClip)}ms
        </div>
      ) : null}
    </div>
  );
}
