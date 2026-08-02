import type {
  CreativeTimelineClip,
  CreativeTimelineTrackWithClips,
} from "@/features/creative-studio/types/creative-studio.types";
import {
  parseClipMotionSceneMetadata,
  type ClipMotionSceneMetadata,
} from "@/features/motion-scene-engine/lib/clip-motion-scene-metadata";

export type ActiveClipLayer = {
  clip: CreativeTimelineClip;
  track: CreativeTimelineTrackWithClips;
  localMs: number;
};

export function computeTimelineDurationMs(
  tracks: CreativeTimelineTrackWithClips[],
  fallbackMs = 60_000,
): number {
  const maxEnd = tracks
    .flatMap((track) => track.clips)
    .reduce((max, clip) => Math.max(max, clip.end_ms), 0);
  return Math.max(fallbackMs, maxEnd + 5_000);
}

export function getActiveClipsAtPlayhead(
  tracks: CreativeTimelineTrackWithClips[],
  playheadMs: number,
): ActiveClipLayer[] {
  const layers: ActiveClipLayer[] = [];

  for (const track of tracks) {
    for (const clip of track.clips) {
      if (clip.clip_kind === "marker") continue;
      if (playheadMs < clip.start_ms || playheadMs >= clip.end_ms) continue;

      const localMs =
        clip.trim_start_ms + (playheadMs - clip.start_ms) * Number(clip.speed);

      layers.push({ clip, track, localMs });
    }
  }

  return layers.sort((a, b) => a.track.sort_order - b.track.sort_order);
}

export function getPrimaryVideoLayer(
  layers: ActiveClipLayer[],
): ActiveClipLayer | null {
  return (
    layers.find(
      (layer) =>
        layer.track.kind === "video" &&
        (layer.clip.clip_kind === "video" || layer.clip.clip_kind === "image"),
    ) ?? null
  );
}

export function getAudioLayers(layers: ActiveClipLayer[]): ActiveClipLayer[] {
  return layers.filter(
    (layer) =>
      layer.track.kind === "audio" || layer.clip.clip_kind === "audio",
  );
}

export function getGraphicsLayers(layers: ActiveClipLayer[]): ActiveClipLayer[] {
  return layers.filter(
    (layer) =>
      layer.track.kind === "graphics" ||
      layer.clip.clip_kind === "graphic" ||
      layer.clip.clip_kind === "image",
  );
}

export type SceneMotionLayer = ActiveClipLayer & {
  motion: ClipMotionSceneMetadata;
};

export function getSceneMotionLayers(
  layers: ActiveClipLayer[],
): SceneMotionLayer[] {
  const result: SceneMotionLayer[] = [];

  for (const layer of layers) {
    if (layer.clip.clip_kind !== "graphic") continue;
    const motion = parseClipMotionSceneMetadata(layer.clip.metadata);
    if (!motion) continue;
    result.push({ ...layer, motion });
  }

  return result;
}

/** @deprecated Use getSceneMotionLayers */
export type SceneGraphicLayer = SceneMotionLayer;
/** @deprecated Use getSceneMotionLayers */
export const getSceneGraphicLayers = getSceneMotionLayers;

export function hasSceneGraphicVisual(layers: ActiveClipLayer[]): boolean {
  return getSceneMotionLayers(layers).length > 0;
}
