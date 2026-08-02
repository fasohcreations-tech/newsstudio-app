/**
 * Module 4.4 – Shape Composer
 * Procedural broadcast shapes, path editor, library, and tools.
 */

export type * from "@/features/scene-composer/lib/shape-composer/types";
export { SHAPE_METADATA_KEY } from "@/features/scene-composer/lib/shape-composer/types";

export {
  createDefaultShapeConfig,
  createDefaultPath,
  createPathPoint,
  shapeKindFromObjectType,
} from "@/features/scene-composer/lib/shape-composer/defaults";

export {
  getShapeConfig,
  hasExplicitShapeConfig,
  isShapeComposerActive,
  enableShapeComposer,
  disableShapeComposer,
  enableShapeComposerOnAllLayers,
  disableShapeComposerOnAllLayers,
  areShapesEnabledOnAllLayers,
  needsShapeComposerSeed,
  seedShapeComposerOnAllLayers,
  setShapeConfig,
  patchShapeConfig,
  convertShapeKind,
  applyShapeLibraryItem,
  applyShapePreset,
  syncShapeFromTransform,
} from "@/features/scene-composer/lib/shape-composer/apply";

export {
  buildShapePathD,
  resolveRadii,
  roundedRectPath,
  pathFromPoints,
  gradientCss,
} from "@/features/scene-composer/lib/shape-composer/geometry";

export {
  movePathPoint,
  addPathPoint,
  deletePathPoint,
  setPathPointHandles,
  smoothPathPoint,
  cornerPathPoint,
  mirrorPathHandles,
} from "@/features/scene-composer/lib/shape-composer/path-editor";

export {
  createShapeObject,
  createShapeFromLibraryItem,
  duplicateShapeObject,
  objectTypeForShapeKind,
  alignObjects,
  distributeObjects,
  markBooleanOperation,
  toggleShapeLock,
  toggleShapeHide,
  snapObjectToGrid,
} from "@/features/scene-composer/lib/shape-composer/tools";

export {
  SHAPE_LIBRARY,
  SHAPE_LIBRARY_CATEGORIES,
  listShapeLibrary,
  getShapeLibraryItem,
} from "@/features/scene-composer/lib/shape-composer/library";

export {
  SHAPE_PRESETS,
  SHAPE_KIND_OPTIONS,
  SHAPE_BEHAVIOR_OPTIONS,
} from "@/features/scene-composer/lib/shape-composer/presets";

export {
  isShapeOverlayLayer,
  shouldReplaceContentWithShape,
  shouldOverlayShape,
} from "@/features/scene-composer/lib/shape-composer/layer-policy";

export {
  createDefaultAnchorPoint,
  createDefaultPlacement,
  anchorPresetToPoint,
  nearestAnchorPreset,
  resolveAnchorPoint,
  resolvePlacement,
  cssTransformOriginFromAnchor,
} from "@/features/scene-composer/lib/shape-composer/anchor";

export {
  sampleShapeBehaviors,
  createShapeBehavior,
  type SampledShapeBehaviorStyle,
} from "@/features/scene-composer/lib/shape-composer/behaviors";

export {
  createDefaultReveal,
  resolveRevealConfig,
  sampleShapeReveal,
  shapeRevealTotalMs,
  shapeBehaviorDurationMs,
  shapePreviewDurationMs,
  defaultRevealEntranceBehavior,
  type SampledShapeReveal,
  type ShapeRevealPhase,
} from "@/features/scene-composer/lib/shape-composer/reveal";
