import { createDefaultLayerMotion } from "@/features/scene-composer/lib/motion-animation/constants";
import type { LayerMotionConfig } from "@/features/scene-composer/lib/motion-animation/types";
import type { MotionPreset } from "@/features/scene-composer/lib/motion-presets/types";

/** Helper to build a builtin LayerMotion preset quickly. */
export function definePreset(
  partial: Omit<MotionPreset, "builtin" | "motion" | "kind"> & {
    kind?: MotionPreset["kind"];
    motion: Partial<LayerMotionConfig>;
  },
): MotionPreset {
  return {
    ...partial,
    kind: partial.kind ?? "layer",
    builtin: true,
    motion: createDefaultLayerMotion(partial.motion),
  };
}
