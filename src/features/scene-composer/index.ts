export { SceneComposerWorkspace } from "@/features/scene-composer/components/scene-composer-workspace";

export { ComposerCanvas } from "@/features/scene-composer/components/panels/composer-canvas";
export { ComposerLeftPanel } from "@/features/scene-composer/components/panels/composer-left-panel";
export { ComposerRightPanel } from "@/features/scene-composer/components/panels/composer-right-panel";
export { ComposerTimelinePanel } from "@/features/scene-composer/components/panels/composer-timeline-panel";
export { ComposerLayersPanel } from "@/features/scene-composer/components/panels/composer-layers-panel";

export { useComposerDocument, useComposerAutosave } from "@/features/scene-composer/hooks/use-composer-document";
export { useComposerCanvas } from "@/features/scene-composer/hooks/use-composer-canvas";
export { useComposerPlayback } from "@/features/scene-composer/hooks/use-composer-playback";

export type * from "@/features/scene-composer/types/scene-composer.types";

export {
  SCENE_OBJECT_TYPES,
  SCENE_OBJECT_TYPE_LABELS,
  WORKFLOW_STATES,
  COMPOSER_VARIABLE_KEYS,
} from "@/features/scene-composer/constants/scene-composer.constants";
export {
  GNN_BROADCAST_PACKAGE_ID,
  GNN_DESIGN_SYSTEM,
  GNN_COMPONENT_LIBRARY,
  GNN_MOTION_PRESETS,
} from "@/features/scene-composer/constants/gnn-broadcast-package.constants";

export { createSceneComposerService, toComposerScene } from "@/features/scene-composer/services/scene-composer.service.impl";
export { createCanvasService } from "@/features/scene-composer/services/canvas.service.impl";
export { createLayerService } from "@/features/scene-composer/services/layer.service.impl";
export { createComposerHistoryService } from "@/features/scene-composer/services/history.service.impl";

export {
  ensureComposerDefaultsAction,
  saveComposerSceneAction,
  exportComposerSceneAction,
  getComposerSceneAction,
  listComposerComponentsAction,
} from "@/features/scene-composer/actions/scene-composer.actions";

export {
  createSceneObject,
  upgradeToComposerDocument,
  exportComposerJson,
} from "@/features/scene-composer/lib/object-factory";
export {
  LayerFactory,
  LAYER_CATEGORY_LABELS,
  LAYER_CATEGORY_ORDER,
  LAYER_MENU_CATALOG,
} from "@/features/scene-composer/lib/layer-factory";
export type {
  LayerKind,
  LayerCategory,
  LayerMenuItem,
  LayerFactoryOptions,
} from "@/features/scene-composer/lib/layer-factory";
export {
  TEXT_LAYER_BINDING_KEYS,
  defaultIndependentTextStyle,
  resolveTextLayerStyle,
  textLayerStyleToCss,
  parseTextBindingToken,
  storyFieldForTextBinding,
} from "@/features/scene-composer/lib/text-layer";
export type { TextLayerStyle } from "@/features/scene-composer/lib/text-layer";
export * from "@/features/scene-composer/lib/motion-animation";
export * from "@/features/scene-composer/lib/motion-presets";
export * from "@/features/scene-composer/lib/broadcast-effects";
export * from "@/features/scene-composer/lib/edge-sweep";
export * from "@/features/scene-composer/lib/shape-composer";
export * from "@/features/scene-composer/lib/story-mapping";
export {
  buildGnnBroadcastSceneDrafts,
  GNN_MASTER_SCENES,
} from "@/features/scene-composer/lib/gnn-broadcast-package";
export {
  buildAllResponsiveVariants,
  buildResponsiveVariant,
  RESPONSIVE_FORMATS,
} from "@/features/scene-composer/lib/responsive-layout";
