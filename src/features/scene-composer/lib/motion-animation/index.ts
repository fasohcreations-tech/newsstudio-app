/**
 * Module 4.0 – Motion Animation Framework
 */

export type {
  LayerMotionConfig,
  MotionEntranceType,
  MotionExitType,
  MotionIdleType,
  MotionIdleAxis,
  MotionIdlePivot,
  MotionEasing,
  MotionPhaseConfig,
  SampledMotionStyle,
} from "@/features/scene-composer/lib/motion-animation/types";

export { MOTION_METADATA_KEY } from "@/features/scene-composer/lib/motion-animation/types";

export {
  ENTRANCE_ANIMATION_OPTIONS,
  EXIT_ANIMATION_OPTIONS,
  IDLE_ANIMATION_OPTIONS,
  MOTION_EASING_OPTIONS,
  MOTION_IDLE_AXIS_OPTIONS,
  MOTION_IDLE_PIVOT_OPTIONS,
  DEFAULT_IDLE_SWIVEL_AMPLITUDE_DEG,
  DEFAULT_IDLE_ROTATE_DEG_PER_SEC,
  DEFAULT_IDLE_PATH_RADIUS_PX,
  GNN_001_MOTION_DEFAULTS,
  createDefaultLayerMotion,
  DEFAULT_ENTRANCE_DURATION_MS,
  DEFAULT_EXIT_DURATION_MS,
} from "@/features/scene-composer/lib/motion-animation/constants";

export {
  getLayerMotionConfig,
  setLayerMotionConfig,
  patchLayerMotionConfig,
  ensureObjectMotionDefaults,
  sampleLayerMotion,
  getEntranceWindow,
  getExitWindow,
} from "@/features/scene-composer/lib/motion-animation/engine";
