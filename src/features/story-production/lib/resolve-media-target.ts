/**
 * Resolve which Story field a canvas object should receive media into.
 */

import { GNN_001_MAIN_VIDEO_CONTAINER_SLUG } from "@/features/scene-composer/lib/gnn-001-main-video.constants";
import { isSmartContainerObject } from "@/features/scene-composer/lib/media-container";
import { REGION_STORY_BINDINGS } from "@/features/story-production/lib/story-binding-engine";
import type { SceneObject } from "@/features/scene-composer/types/scene-composer.types";
import type { StoryDataRecord } from "@/features/story-production/types/story-data.types";

export type MediaTargetKind = "video" | "image" | "audio" | "any";

export type StoryMediaTarget = {
  field: keyof StoryDataRecord;
  bindingKey: string;
  label: string;
  kind: MediaTargetKind;
  accept: string;
};

const FIELD_TARGETS: Record<string, StoryMediaTarget> = {
  main_video: {
    field: "main_video",
    bindingKey: "main_video",
    label: "Main Video",
    kind: "video",
    accept: "video/*,image/*",
  },
  background_video: {
    field: "background_video",
    bindingKey: "background_video",
    label: "Background Slides",
    kind: "video",
    // Picker shows videos + images; each pick appends to the slide queue.
    accept: "video/*,image/*",
  },
  /** Object-scoped Smart Container — never writes a Story field. */
  smart_container: {
    field: "main_image",
    bindingKey: "__smart_container__",
    label: "Smart Container",
    kind: "any",
    accept: "video/*,image/*",
  },
  main_image: {
    field: "main_image",
    bindingKey: "main_image",
    label: "Main Image",
    kind: "image",
    accept: "image/*",
  },
  reporter_photo: {
    field: "reporter_photo",
    bindingKey: "reporter_photo",
    label: "Reporter Photo",
    kind: "image",
    accept: "image/*",
  },
  logo: {
    field: "logo",
    bindingKey: "logo",
    label: "Logo",
    kind: "image",
    accept: "image/*",
  },
  background_image: {
    field: "background_image",
    bindingKey: "background_image",
    label: "Background Image",
    kind: "image",
    accept: "image/*",
  },
  optional_info_image: {
    field: "optional_info_image",
    bindingKey: "optional_info_image",
    label: "Optional Info",
    kind: "image",
    accept: "image/*",
  },
  optional_info_image_3: {
    field: "optional_info_image_3",
    bindingKey: "optional_info_image_3",
    label: "Optional Info 3",
    kind: "image",
    accept: "image/*",
  },
  sub_headline_1_media: {
    field: "sub_headline_1_media",
    bindingKey: "sub_headline_1_media",
    label: "Sub Headline 1 Media",
    kind: "any",
    accept: "image/*,video/*",
  },
  sub_headline_2_media: {
    field: "sub_headline_2_media",
    bindingKey: "sub_headline_2_media",
    label: "Sub Headline 2 Media",
    kind: "any",
    accept: "image/*,video/*",
  },
  sub_headline_3_media: {
    field: "sub_headline_3_media",
    bindingKey: "sub_headline_3_media",
    label: "Sub Headline 3 Media",
    kind: "any",
    accept: "image/*,video/*",
  },
  sub_headline_4_media: {
    field: "sub_headline_4_media",
    bindingKey: "sub_headline_4_media",
    label: "Sub Headline 4 Media",
    kind: "any",
    accept: "image/*,video/*",
  },
  voice_over: {
    field: "voice_over",
    bindingKey: "voice_over",
    label: "Voice Over",
    kind: "audio",
    accept: "audio/*",
  },
  background_music: {
    field: "background_music",
    bindingKey: "background_music",
    label: "Music",
    kind: "audio",
    accept: "audio/*",
  },
};

export const MEDIA_TARGET_OPTIONS = Object.values(FIELD_TARGETS);

export function mediaTargetFromBindingKey(
  bindingKey: string,
): StoryMediaTarget | null {
  if (bindingKey === "video") return FIELD_TARGETS.main_video;
  if (bindingKey === "image") return FIELD_TARGETS.main_image;
  if (bindingKey === "channel_logo") return FIELD_TARGETS.logo;
  if (bindingKey === "voice") return FIELD_TARGETS.voice_over;
  if (bindingKey === "music") return FIELD_TARGETS.background_music;
  return FIELD_TARGETS[bindingKey] ?? null;
}

function isBackgroundLayerObject(object: SceneObject): boolean {
  return (
    object.metadata?.layer === "background" ||
    object.metadata?.component_kind === "background" ||
    object.metadata?.generator === "background" ||
    object.name === "Background" ||
    (typeof object.metadata?.component_slug === "string" &&
      object.metadata.component_slug.includes("background"))
  );
}

export function resolveMediaTargetForObject(
  object: SceneObject | null | undefined,
): StoryMediaTarget | null {
  if (!object) return null;

  if (
    object.metadata?.component_slug === GNN_001_MAIN_VIDEO_CONTAINER_SLUG ||
    object.metadata?.layer === "main_video_container" ||
    object.name === "Main Video Container"
  ) {
    return FIELD_TARGETS.main_video;
  }

  // Layers-panel Background — image or video slide queue (story-backed).
  if (isBackgroundLayerObject(object)) {
    return FIELD_TARGETS.background_video;
  }

  // Smart / Slide Smart Containers — object-local queue via Mapping / Manual.
  if (isSmartContainerObject(object)) {
    return FIELD_TARGETS.smart_container;
  }

  if (
    (typeof object.metadata?.region_key === "string" &&
      object.metadata.region_key.startsWith("optional-info")) ||
    object.metadata?.component_slug === "gnn-001-optional-info" ||
    /optional information/i.test(object.name)
  ) {
    return FIELD_TARGETS.optional_info_image;
  }

  const region =
    typeof object.metadata?.region_key === "string"
      ? object.metadata.region_key
      : "";
  const regionSpec = REGION_STORY_BINDINGS[region];
  if (regionSpec?.mediaKeys?.[0]) {
    return mediaTargetFromBindingKey(regionSpec.mediaKeys[0]);
  }

  if (object.object_type === "video") return FIELD_TARGETS.main_video;
  if (object.object_type === "logo") return FIELD_TARGETS.logo;
  if (object.object_type === "image") {
    const name = object.name.toLowerCase();
    if (name.includes("optional")) return FIELD_TARGETS.optional_info_image;
    if (name.includes("reporter")) return FIELD_TARGETS.reporter_photo;
    if (name.includes("logo")) return FIELD_TARGETS.logo;
    if (name.includes("background")) return FIELD_TARGETS.background_image;
    return FIELD_TARGETS.main_image;
  }

  if (typeof object.bindings.story_field === "string") {
    return mediaTargetFromBindingKey(object.bindings.story_field);
  }

  return null;
}

export function defaultTargetForAssetCategory(
  category: string,
): StoryMediaTarget {
  if (category === "videos") return FIELD_TARGETS.main_video;
  if (category === "logos") return FIELD_TARGETS.logo;
  if (category === "voice_over") return FIELD_TARGETS.voice_over;
  if (category === "music") return FIELD_TARGETS.background_music;
  return FIELD_TARGETS.main_image;
}

/**
 * Pick the Story field to write for a media target.
 * Background browse always writes `background_video` (image or video) —
 * same pattern as main video — so demo/sibling fields cannot shadow the pick.
 * Smart Container targets never write Story fields.
 */
export function resolveApplyFieldForTarget(
  target: StoryMediaTarget,
  _mimeType?: string,
  _url?: string,
): keyof StoryDataRecord {
  if (target.bindingKey === "__smart_container__") {
    return "main_image";
  }
  if (target.bindingKey === "background_video") {
    return "background_video";
  }
  return target.field;
}

export function isObjectScopedMediaTarget(target: StoryMediaTarget | null | undefined): boolean {
  return target?.bindingKey === "__smart_container__";
}
