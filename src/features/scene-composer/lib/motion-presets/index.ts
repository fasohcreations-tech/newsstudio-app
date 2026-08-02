/**
 * Module 4.1 – Professional Motion Preset Library
 */

export type {
  MotionPreset,
  MotionPresetCategoryId,
  MotionPresetCategoryMeta,
  MotionPresetKind,
  MotionPresetLibraryState,
} from "@/features/scene-composer/lib/motion-presets/types";

export {
  MOTION_PRESET_METADATA_KEY,
  MOTION_PRESET_NAME_METADATA_KEY,
  MOTION_PRESET_STORAGE_KEY,
} from "@/features/scene-composer/lib/motion-presets/types";

export { MOTION_PRESET_CATEGORIES } from "@/features/scene-composer/lib/motion-presets/categories";
export { BUILTIN_MOTION_PRESETS } from "@/features/scene-composer/lib/motion-presets/presets";
export { definePreset } from "@/features/scene-composer/lib/motion-presets/define-preset";

export {
  listBuiltinPresets,
  getBuiltinPreset,
  listPresetsByCategory,
  searchPresets,
  getCategoryLabel,
  duplicatePreset,
  createCustomPresetFromMotion,
  mergePresetCatalog,
} from "@/features/scene-composer/lib/motion-presets/registry";

export {
  applyMotionPresetToObject,
  clearMotionPresetReference,
  getAppliedPresetId,
  getAppliedPresetName,
} from "@/features/scene-composer/lib/motion-presets/apply";

export { useMotionPresetLibrary } from "@/features/scene-composer/lib/motion-presets/store";
