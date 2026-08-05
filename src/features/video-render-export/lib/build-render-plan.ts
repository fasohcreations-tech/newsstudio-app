import {
  VIDEO_EXPORT_RESOLUTIONS,
} from "@/features/video-render-export/constants/render.constants";
import type {
  RenderPlan,
  RenderPlanClip,
  VideoExportSettings,
} from "@/features/video-render-export/types/render.types";
import type { StoryTimelineBundle } from "@/features/story-timeline-assembly/types/timeline.types";
import type { StorySceneInstanceRow } from "@/features/story-scene-builder/types/scene-builder.types";

function resolutionSize(id: VideoExportSettings["resolution"]) {
  return (
    VIDEO_EXPORT_RESOLUTIONS.find((r) => r.id === id) ??
    VIDEO_EXPORT_RESOLUTIONS[0]!
  );
}

/**
 * Build an immutable render plan from Timeline + Scene Instances.
 * Read-only — never writes back to Timeline / Scenes / Masters.
 */
export function buildRenderPlan(input: {
  storyId: string;
  bundle: StoryTimelineBundle;
  scenes: StorySceneInstanceRow[];
  settings: VideoExportSettings;
  resolvedMedia: Record<
    string,
    {
      videoUrl: string | null;
      imageUrl: string | null;
      logoUrl: string | null;
      advertisementUrl: string | null;
    }
  >;
  voiceUrl: string | null;
  musicUrl: string | null;
}): RenderPlan {
  const { width, height } = resolutionSize(input.settings.resolution);
  const sceneTrack = input.bundle.tracks.find((t) => t.kind === "scene");
  const clips = input.bundle.clips
    .filter(
      (c) =>
        c.track_id === sceneTrack?.id &&
        c.enabled &&
        !c.deleted_at,
    )
    .sort((a, b) => a.start_ms - b.start_ms);

  const transitionsByFrom = new Map(
    input.bundle.transitions.map((t) => [t.from_clip_id, t] as const),
  );

  const planClips: RenderPlanClip[] = clips.map((clip) => {
    const instance = input.scenes.find((s) => s.id === clip.scene_instance_id);
    const media = instance
      ? input.resolvedMedia[instance.id]
      : undefined;
    const transition = transitionsByFrom.get(clip.id);
    const meta = (instance?.metadata ?? {}) as Record<string, unknown>;
    const tickerFromMeta =
      typeof meta.ticker === "string"
        ? meta.ticker
        : typeof meta.ticker_text === "string"
          ? meta.ticker_text
          : "";

    return {
      clipId: clip.id,
      sceneInstanceId: clip.scene_instance_id,
      motionSceneId: instance?.scene_id ?? null,
      name: clip.name,
      startMs: clip.start_ms,
      endMs: clip.end_ms,
      durationMs: clip.duration_ms,
      trimInMs: clip.trim_in_ms ?? 0,
      headline: instance?.headline?.trim() || instance?.name || clip.name,
      subheadline: instance?.subheadline?.trim() || "",
      tickerText: tickerFromMeta.trim() || instance?.body_text?.trim() || "",
      videoUrl: media?.videoUrl ?? null,
      imageUrl: media?.imageUrl ?? null,
      logoUrl: media?.logoUrl ?? null,
      advertisementUrl: media?.advertisementUrl ?? null,
      transitionToNext: transition?.transition_type ?? "cut",
      transitionDurationMs: transition?.duration_ms ?? 0,
    };
  });

  const durationMs = Math.max(
    input.bundle.timeline.duration_ms,
    planClips.reduce((max, c) => Math.max(max, c.endMs), 0),
  );

  return {
    version: 1,
    storyId: input.storyId,
    timelineId: input.bundle.timeline.id,
    durationMs,
    width,
    height,
    frameRate: input.settings.frameRate,
    format: input.settings.format,
    bitrateKbps: input.settings.bitrateKbps,
    voiceUrl: input.settings.includeVoice ? input.voiceUrl : null,
    musicUrl: input.settings.includeMusic ? input.musicUrl : null,
    clips: planClips,
    builtAt: new Date().toISOString(),
  };
}
