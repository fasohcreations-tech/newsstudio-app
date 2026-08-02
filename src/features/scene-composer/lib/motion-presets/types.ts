/**
 * Module 4.1 – Motion Preset Library types.
 * Presets are reusable LayerMotionConfig packages — not scene-hardcoded.
 */

import type { LayerMotionConfig } from "@/features/scene-composer/lib/motion-animation/types";

export type MotionPresetCategoryId =
  | "basic"
  | "professional_news"
  | "lower_third"
  | "reporter"
  | "ticker"
  | "transitions"
  | "logo"
  | "text"
  | "video"
  | "background"
  | "breaking_news"
  | "sports"
  | "weather"
  | "social_media"
  | "promotional";

export type MotionPresetKind = "layer" | "transition";

/** Built-in or user-saved animation template. */
export type MotionPreset = {
  id: string;
  name: string;
  category: MotionPresetCategoryId;
  kind: MotionPresetKind;
  description: string;
  /** Nominal duration used for catalog display / apply defaults. */
  durationMs: number;
  tags: string[];
  /** Small preview glyph key for the browser card. */
  icon: string;
  builtin: boolean;
  /** Motion payload applied onto object.metadata.motion */
  motion: LayerMotionConfig;
};

export type MotionPresetCategoryMeta = {
  id: MotionPresetCategoryId;
  label: string;
  folder: string;
  description: string;
};

/** Persisted user library (custom presets + favorites). */
export type MotionPresetLibraryState = {
  version: 1;
  favorites: string[];
  custom: MotionPreset[];
};

export const MOTION_PRESET_METADATA_KEY = "motion_preset_id" as const;
export const MOTION_PRESET_NAME_METADATA_KEY = "motion_preset_name" as const;

export const MOTION_PRESET_STORAGE_KEY =
  "mediaos.composer.motion-preset-library.v1" as const;
