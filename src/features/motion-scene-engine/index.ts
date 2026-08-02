export { MotionSceneLibraryHome } from "@/features/motion-scene-engine/components/motion-scene-library-home";
export { MotionSceneEditorWorkspace } from "@/features/motion-scene-engine/components/motion-scene-editor-workspace";
export { MotionSceneOverlay } from "@/features/motion-scene-engine/components/motion-scene-overlay";

export { SceneLibraryPanel } from "@/features/motion-scene-engine/components/panels/scene-library-panel";
export { SceneCanvasPanel } from "@/features/motion-scene-engine/components/panels/scene-canvas-panel";
export { SceneTimelinePanel } from "@/features/motion-scene-engine/components/panels/scene-timeline-panel";
export { SceneInspectorPanel } from "@/features/motion-scene-engine/components/panels/scene-inspector-panel";

export { useScenePreview } from "@/features/motion-scene-engine/hooks/use-scene-preview";

export type * from "@/features/motion-scene-engine/types/motion-scene.types";

export {
  MOTION_SCENE_TYPES,
  MOTION_SCENE_TYPE_LABELS,
  MOTION_SCENE_DRAG_TYPE,
  NEWSROOM_QUICK_CREATE,
} from "@/features/motion-scene-engine/constants/motion-scene.constants";

export { createMotionSceneService } from "@/features/motion-scene-engine/services/motion-scene.service.impl";

export {
  parseClipMotionSceneMetadata,
  buildSceneEditorHref,
  buildSceneLibraryHref,
} from "@/features/motion-scene-engine/lib/clip-motion-scene-metadata";

export {
  buildMotionSceneEditorHref,
  hasMotionSceneDragType,
} from "@/features/motion-scene-engine/lib/motion-scene-navigation";

export {
  ensureMotionSceneDefaultsAction,
  createMotionSceneAction,
  updateMotionSceneAction,
  duplicateMotionSceneAction,
  placeMotionSceneOnTimelineAction,
  listMotionScenesAction,
} from "@/features/motion-scene-engine/actions/motion-scene.actions";
