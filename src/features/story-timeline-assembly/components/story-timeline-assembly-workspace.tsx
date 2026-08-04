"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  AlertTriangle,
  Loader2,
  Magnet,
  Play,
  RefreshCw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePreviewPlayback } from "@/features/creative-studio/hooks/use-preview-playback";
import {
  assembleStoryTimelineAction,
  decideSceneSyncAction,
  deleteTimelineClipAction,
  duplicateTimelineClipAction,
  getStoryTimelineAction,
  listSceneSyncPromptsAction,
  setTimelineTransitionAction,
  splitTimelineClipAction,
  updateTimelineClipAction,
} from "@/features/story-timeline-assembly/actions/timeline.actions";
import {
  MAX_ZOOM,
  MIN_ZOOM,
  StoryTimelinePanel,
} from "@/features/story-timeline-assembly/components/story-timeline-panel";
import { StoryTimelinePreview } from "@/features/story-timeline-assembly/components/story-timeline-preview";
import { StoryTimelineTransport } from "@/features/story-timeline-assembly/components/story-timeline-transport";
import {
  findNeighborSceneClip,
  getActiveClipAtPlayhead,
  getTrackIdByKind,
} from "@/features/story-timeline-assembly/lib/active-clip";
import type {
  SceneSyncPrompt,
  StoryTimelineBundle,
  StoryTimelineTransitionType,
} from "@/features/story-timeline-assembly/types/timeline.types";
import { getStoryPackageAction } from "@/features/story-scene-builder/actions/scene-builder.actions";
import type { StorySceneInstanceRow } from "@/features/story-scene-builder/types/scene-builder.types";
import { getStoryVoiceSignedUrlAction } from "@/features/story-voice/actions/voice.actions";

type StoryTimelineEditorProps = {
  storyId: string;
  storyTitle: string;
};

/**
 * Fully functional production Timeline editor:
 * preview monitor + transport + multi-track editing.
 */
export function StoryTimelineAssemblyWorkspace({
  storyId,
  storyTitle,
}: StoryTimelineEditorProps) {
  const [pending, startTransition] = useTransition();
  const [bundle, setBundle] = useState<StoryTimelineBundle | null>(null);
  const [scenes, setScenes] = useState<StorySceneInstanceRow[]>([]);
  const [packageReady, setPackageReady] = useState(false);
  const [packageStatus, setPackageStatus] = useState<string | null>(null);
  const [sceneCount, setSceneCount] = useState(0);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [snap, setSnap] = useState(true);
  const [syncPrompts, setSyncPrompts] = useState<SceneSyncPrompt[]>([]);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);

  const durationMs = bundle?.timeline.duration_ms || 60_000;
  const frameRate = Number(bundle?.timeline.frame_rate) || 30;

  const {
    state: playback,
    play,
    pause,
    togglePlay,
    seek,
    stepFrame,
  } = usePreviewPlayback({
    durationMs,
    frameRate,
    resolutionWidth: bundle?.timeline.resolution_width ?? 1920,
    resolutionHeight: bundle?.timeline.resolution_height ?? 1080,
  });

  const playheadMs = playback.playheadMs;
  const playing = playback.isPlaying;

  const refresh = useCallback(() => {
    startTransition(async () => {
      const [tl, pkg, sync, voice] = await Promise.all([
        getStoryTimelineAction(storyId),
        getStoryPackageAction(storyId),
        listSceneSyncPromptsAction(storyId),
        getStoryVoiceSignedUrlAction(storyId),
      ]);

      if (pkg.success && pkg.data) {
        setPackageReady(pkg.data.package.status === "ready");
        setPackageStatus(pkg.data.package.status);
        setSceneCount(pkg.data.scenes.length);
        setScenes(pkg.data.scenes);
      } else {
        setPackageReady(false);
        setPackageStatus(null);
        setSceneCount(0);
        setScenes([]);
      }

      if (tl.success) setBundle(tl.data);
      else if (
        tl.error &&
        !/relation|does not exist|schema cache/i.test(tl.error)
      ) {
        toast.error(tl.error);
      }

      if (sync.success) setSyncPrompts(sync.data);
      if (voice.success) setVoiceUrl(voice.data.url);
      else setVoiceUrl(null);
    });
  }, [storyId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Space = play/pause when timeline loaded
  useEffect(() => {
    if (!bundle) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.code === "ArrowLeft" && e.shiftKey) {
        e.preventDefault();
        stepFrame("back");
      } else if (e.code === "ArrowRight" && e.shiftKey) {
        e.preventDefault();
        stepFrame("forward");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bundle, togglePlay, stepFrame]);

  // Auto-select scene clip under playhead
  useEffect(() => {
    if (!bundle) return;
    const sceneTrackId = getTrackIdByKind(bundle, "scene");
    const active = getActiveClipAtPlayhead(
      bundle.clips,
      sceneTrackId,
      playheadMs,
    );
    if (active && active.id !== selectedClipId) {
      setSelectedClipId(active.id);
    }
  }, [bundle, playheadMs]); // eslint-disable-line react-hooks/exhaustive-deps

  function assemble(replace = true) {
    startTransition(async () => {
      const result = await assembleStoryTimelineAction({
        storyId,
        replaceAssemblyClips: replace,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setBundle(result.data.bundle);
      setSelectedClipId(null);
      seek(0);
      pause();
      toast.success(
        result.data.created
          ? "Timeline assembled from Scene Collection"
          : `Timeline reassembled (${result.data.replacedClipCount} clips replaced)`,
      );
      const sync = await listSceneSyncPromptsAction(storyId);
      if (sync.success) setSyncPrompts(sync.data);
    });
  }

  function patchLocalClip(
    clipId: string,
    patch: Partial<StoryTimelineBundle["clips"][number]>,
  ) {
    setBundle((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        clips: prev.clips.map((c) =>
          c.id === clipId ? { ...c, ...patch } : c,
        ),
      };
    });
  }

  function goNeighbor(dir: "prev" | "next") {
    if (!bundle) return;
    const clip = findNeighborSceneClip(bundle, playheadMs, dir);
    if (!clip) {
      seek(dir === "prev" ? 0 : durationMs);
      return;
    }
    setSelectedClipId(clip.id);
    seek(clip.start_ms);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Timeline Editor</h2>
          <p className="text-xs text-muted-foreground">
            Preview and edit the production timeline for{" "}
            <strong>{storyTitle}</strong>. Clips reference Scene Instances —
            Space to play/pause.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {bundle?.timeline.status ? (
            <Badge variant="secondary" className="capitalize">
              {bundle.timeline.status}
            </Badge>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8"
            disabled={pending}
            onClick={refresh}
          >
            <RefreshCw className="size-3.5" />
            Refresh
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8"
            disabled={pending || !packageReady || sceneCount === 0}
            onClick={() => assemble(true)}
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Play className="size-3.5" />
            )}
            {bundle ? "Reassemble" : "Assemble Timeline"}
          </Button>
        </div>
      </div>

      {!packageReady ? (
        <Alert>
          <AlertTitle>Ready for Timeline</AlertTitle>
          <AlertDescription>
            Build a Scene Collection first (Scenes tab). Package status:{" "}
            {packageStatus ?? "none"}.
          </AlertDescription>
        </Alert>
      ) : null}

      {syncPrompts.length > 0 ? (
        <Alert className="border-amber-500/40 bg-amber-500/5">
          <AlertTriangle className="size-4 text-amber-600" />
          <AlertTitle>Scene Instance updated</AlertTitle>
          <AlertDescription>
            <p className="mb-2 text-xs">
              Update Timeline? Changes never auto-overwrite timeline edits.
            </p>
            <ul className="space-y-2">
              {syncPrompts.map((p) => (
                <li
                  key={p.clipId}
                  className="flex flex-wrap items-center gap-2 text-xs"
                >
                  <span>
                    <strong>{p.clipName}</strong> ← {p.sceneName}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    className="h-6 text-[10px]"
                    disabled={pending}
                    onClick={() => {
                      startTransition(async () => {
                        const result = await decideSceneSyncAction({
                          clipId: p.clipId,
                          decision: "apply",
                        });
                        if (!result.success) {
                          toast.error(result.error);
                          return;
                        }
                        toast.success("Timeline clip updated from Scene");
                        refresh();
                      });
                    }}
                  >
                    Apply
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-6 text-[10px]"
                    disabled={pending}
                    onClick={() => {
                      startTransition(async () => {
                        const result = await decideSceneSyncAction({
                          clipId: p.clipId,
                          decision: "ignore",
                        });
                        if (!result.success) {
                          toast.error(result.error);
                          return;
                        }
                        toast.message("Kept timeline edit");
                        refresh();
                      });
                    }}
                  >
                    Ignore
                  </Button>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      {bundle ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div className="space-y-3">
            <StoryTimelinePreview
              bundle={bundle}
              scenes={scenes}
              playheadMs={playheadMs}
              playing={playing}
              voiceUrl={voiceUrl}
            />
            <StoryTimelineTransport
              playing={playing}
              playheadMs={playheadMs}
              durationMs={durationMs}
              frameRate={frameRate}
              onTogglePlay={togglePlay}
              onSeek={seek}
              onStepFrame={stepFrame}
              onPrevClip={() => goNeighbor("prev")}
              onNextClip={() => goNeighbor("next")}
            />
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="size-8"
                disabled={zoom <= MIN_ZOOM}
                title="Zoom out"
                onClick={() =>
                  setZoom((z) =>
                    Math.max(MIN_ZOOM, Number((z / 1.25).toFixed(3))),
                  )
                }
              >
                <ZoomOut className="size-3.5" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 min-w-[3.5rem] px-2 font-mono text-[11px]"
                title="Reset zoom"
                onClick={() => setZoom(1)}
              >
                {Math.round(zoom * 100)}%
              </Button>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="size-8"
                disabled={zoom >= MAX_ZOOM}
                title="Zoom in"
                onClick={() =>
                  setZoom((z) =>
                    Math.min(MAX_ZOOM, Number((z * 1.25).toFixed(3))),
                  )
                }
              >
                <ZoomIn className="size-3.5" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant={snap ? "default" : "outline"}
                className="h-8 text-xs"
                onClick={() => setSnap((v) => !v)}
              >
                <Magnet className="size-3.5" />
                Snap
              </Button>
              <span className="text-[11px] text-muted-foreground">
                {bundle.timeline.resolution_width}×
                {bundle.timeline.resolution_height} · {frameRate} fps
                {voiceUrl ? " · Voice ready" : " · No voice"}
              </span>
            </div>

            <StoryTimelinePanel
              bundle={bundle}
              selectedClipId={selectedClipId}
              playheadMs={playheadMs}
              zoom={zoom}
              snap={snap}
              onSelectClip={(id) => {
                setSelectedClipId(id);
                if (id) {
                  const clip = bundle.clips.find((c) => c.id === id);
                  if (clip) seek(clip.start_ms);
                }
              }}
              onSeek={seek}
              onMoveClip={(clipId, startMs) => {
                const clip = bundle.clips.find((c) => c.id === clipId);
                if (!clip) return;
                const endMs = startMs + clip.duration_ms;
                patchLocalClip(clipId, { start_ms: startMs, end_ms: endMs });
                startTransition(async () => {
                  const result = await updateTimelineClipAction({
                    clipId,
                    startMs,
                    endMs,
                  });
                  if (!result.success) toast.error(result.error);
                  else refresh();
                });
              }}
              onTrimClip={(clipId, endMs) => {
                const clip = bundle.clips.find((c) => c.id === clipId);
                if (!clip) return;
                patchLocalClip(clipId, {
                  end_ms: endMs,
                  duration_ms: endMs - clip.start_ms,
                });
                startTransition(async () => {
                  const result = await updateTimelineClipAction({
                    clipId,
                    endMs,
                  });
                  if (!result.success) toast.error(result.error);
                  else refresh();
                });
              }}
              onDuplicate={(clipId) => {
                startTransition(async () => {
                  const result = await duplicateTimelineClipAction(clipId);
                  if (!result.success) toast.error(result.error);
                  else {
                    toast.success("Clip duplicated");
                    refresh();
                  }
                });
              }}
              onDelete={(clipId) => {
                startTransition(async () => {
                  const result = await deleteTimelineClipAction(clipId);
                  if (!result.success) toast.error(result.error);
                  else {
                    setSelectedClipId(null);
                    toast.message("Clip removed from timeline");
                    refresh();
                  }
                });
              }}
              onToggleLock={(clipId, locked) => {
                startTransition(async () => {
                  const result = await updateTimelineClipAction({
                    clipId,
                    locked,
                  });
                  if (!result.success) toast.error(result.error);
                  else refresh();
                });
              }}
              onToggleEnabled={(clipId, enabled) => {
                startTransition(async () => {
                  const result = await updateTimelineClipAction({
                    clipId,
                    enabled,
                  });
                  if (!result.success) toast.error(result.error);
                  else refresh();
                });
              }}
              onSplit={(clipId, atMs) => {
                startTransition(async () => {
                  const result = await splitTimelineClipAction({
                    clipId,
                    atMs,
                  });
                  if (!result.success) toast.error(result.error);
                  else {
                    toast.success("Clip split");
                    refresh();
                  }
                });
              }}
              onSetTransition={(fromClipId, toClipId, type) => {
                startTransition(async () => {
                  const result = await setTimelineTransitionAction({
                    timelineId: bundle.timeline.id,
                    fromClipId,
                    toClipId,
                    transitionType: type as StoryTimelineTransitionType,
                    durationMs: type === "cut" ? 0 : 600,
                  });
                  if (!result.success) toast.error(result.error);
                  else toast.success(`Transition: ${type}`);
                });
              }}
            />
          </div>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
          No production timeline yet. When the Scene Collection is ready, click
          Assemble Timeline.
        </p>
      )}
    </div>
  );
}
