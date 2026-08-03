export type {
  AnalyzedStoryPanel,
  AnalyzedStorySegment,
  BuildStoryScenesResult,
  StoryPackageBundle,
  StoryPackageRow,
  StoryPackageStatus,
  StorySceneInstanceRow,
  StorySceneInstanceStatus,
  StoryVoiceSegmentRow,
  TimedVoiceSegment,
} from "@/features/story-scene-builder/types/scene-builder.types";

export { analyzeApprovedScript } from "@/features/story-scene-builder/lib/analyze-script";
export {
  applyChromeToStoryData,
  buildPanelSceneBindings,
  extractMasterChromeAssets,
  GNN_MASTER_CHROME_DEFAULTS,
  isStoryInstanceScene,
  mergeChromeAssets,
  panelToInstanceFields,
  panelToStoryData,
  remapStoryDataToPanelScene,
  type MasterChromeAssets,
} from "@/features/story-scene-builder/lib/build-panel-bindings";
export { segmentVoiceTiming } from "@/features/story-scene-builder/lib/voice-segmentation";
export {
  DEFAULT_MASTER_TEMPLATE_CODE,
  findMasterTemplateByCode,
} from "@/features/story-scene-builder/lib/find-master-template";
export {
  assertMasterTemplatePatchAllowed,
  isLockedMasterTemplate,
  masterTemplateLockMessage,
} from "@/features/story-scene-builder/lib/master-template-guard";
export {
  buildStoryScenePackage,
  getStoryPackageByStoryId,
  listStoryPackagesForOrg,
  syncStoryPackageFromPanels,
  syncStorySceneInstanceFromPanels,
} from "@/features/story-scene-builder/services/story-package.service";
