export {
  SMART_DATA_TYPES,
  SMART_DATA_TYPE_LABELS,
  SMART_BINDING_SOURCES,
  SMART_BINDING_SOURCE_LABELS,
  SMART_MAPPING_MODES,
  SMART_MAPPING_MODE_LABELS,
  SMART_MAPPING_TRANSITIONS,
  SMART_MAPPING_TRANSITION_LABELS,
} from "@/features/scene-composer/lib/story-mapping/catalogs";

export {
  DEFAULT_SMART_MAPPING,
  DEFAULT_SLIDE_SMART_MAPPING,
  getSmartMappingConfig,
  setSmartMappingConfig,
  patchSmartMappingConfig,
  mappingTransitionToMediaStyle,
} from "@/features/scene-composer/lib/story-mapping/defaults";

export { resolveMappingSourceCandidates, inferCandidateKind } from "@/features/scene-composer/lib/story-mapping/resolve-source";
export { applyMappingMode } from "@/features/scene-composer/lib/story-mapping/apply-mode";
export {
  resolveSmartContainerMapping,
  resolveLayerMapping,
  resolveMappingIntervalMs,
  buildLayerMappingBindings,
  coalesceStoryForMapping,
  storyDataFromBindings,
  storyDataFromComposerScene,
  mappingTextResolveKey,
  mappingMediaResolveKey,
  isStoryMappingConfigured,
  isStoryMappingDriven,
} from "@/features/scene-composer/lib/story-mapping/resolve-container";

export {
  inferDefaultMappingForObject,
  isMediaContainerMappingLayer,
  isTextMappingLayer,
  allowedMappingModesForObject,
} from "@/features/scene-composer/lib/story-mapping/layer-defaults";

export type {
  SmartDataType,
  SmartBindingSource,
  SmartMappingMode,
  SmartMappingTransition,
  SmartDurationMode,
  SmartMappingConfig,
  SmartMappingConfigPatch,
  SmartMappingCandidate,
  SmartMappingCandidateKind,
  SmartMappingPage,
  SmartMappingResolveContext,
  SmartMappingResolveResult,
} from "@/features/scene-composer/lib/story-mapping/types";

export { SMART_MAPPING_CONTENT_KEY } from "@/features/scene-composer/lib/story-mapping/types";
