/**
 * Module 4.3 – Edge Sweep Behavior
 */

export type * from "@/features/scene-composer/lib/edge-sweep/types";
export {
  BEHAVIORS_METADATA_KEY,
  EDGE_SWEEP_BEHAVIOR_KEY,
} from "@/features/scene-composer/lib/edge-sweep/types";

export {
  createDefaultEdgeSweep,
  EDGE_SWEEP_PRESETS,
  EDGE_SWEEP_STYLE_OPTIONS,
} from "@/features/scene-composer/lib/edge-sweep/defaults";

export {
  getEdgeSweepConfig,
  setEdgeSweepConfig,
  patchEdgeSweepConfig,
  applyEdgeSweepPreset,
  ensureEdgeSweepDemo,
  needsGnn001EdgeSweepDemoPatch,
  patchGnn001EdgeSweepDemos,
  resolveCornerRadius,
  resolveEdgeSweepSideMargins,
  resolveEdgeSweepPathBox,
  roundedRectPerimeter,
} from "@/features/scene-composer/lib/edge-sweep/apply";
