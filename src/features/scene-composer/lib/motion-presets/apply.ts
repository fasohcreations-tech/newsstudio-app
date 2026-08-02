import { createDefaultLayerMotion } from "@/features/scene-composer/lib/motion-animation/constants";
import { setLayerMotionConfig } from "@/features/scene-composer/lib/motion-animation/engine";
import type {
  MotionPreset,
} from "@/features/scene-composer/lib/motion-presets/types";
import {
  MOTION_PRESET_METADATA_KEY,
  MOTION_PRESET_NAME_METADATA_KEY,
} from "@/features/scene-composer/lib/motion-presets/types";
import type { SceneObject } from "@/features/scene-composer/types/scene-composer.types";

/**
 * Apply a Motion Preset onto a scene object.
 * Writes motion config + preset identity into metadata (reusable, not scene-hardcoded).
 */
export function applyMotionPresetToObject(
  object: SceneObject,
  preset: MotionPreset,
): SceneObject {
  const withMotion = setLayerMotionConfig(
    object,
    createDefaultLayerMotion(preset.motion),
  );
  return {
    ...withMotion,
    metadata: {
      ...withMotion.metadata,
      [MOTION_PRESET_METADATA_KEY]: preset.id,
      [MOTION_PRESET_NAME_METADATA_KEY]: preset.name,
    },
  };
}

export function clearMotionPresetReference(
  object: SceneObject,
): SceneObject {
  const metadata = { ...object.metadata };
  delete metadata[MOTION_PRESET_METADATA_KEY];
  delete metadata[MOTION_PRESET_NAME_METADATA_KEY];
  return { ...object, metadata };
}

export function getAppliedPresetId(object: SceneObject): string | null {
  const value = object.metadata?.[MOTION_PRESET_METADATA_KEY];
  return typeof value === "string" ? value : null;
}

export function getAppliedPresetName(object: SceneObject): string | null {
  const value = object.metadata?.[MOTION_PRESET_NAME_METADATA_KEY];
  return typeof value === "string" ? value : null;
}
