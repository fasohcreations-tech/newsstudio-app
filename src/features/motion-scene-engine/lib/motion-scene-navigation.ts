import { MOTION_SCENE_DRAG_TYPE } from "@/features/motion-scene-engine/constants/motion-scene.constants";

export type MotionSceneDragPayload = {
  sceneId: string;
  sceneType: string;
  name: string;
  durationMs: number;
};

export type MotionSceneEditorContext = {
  projectId?: string | null;
  trackId?: string | null;
};

export function buildMotionSceneEditorQuery(
  context: MotionSceneEditorContext,
): string {
  const params = new URLSearchParams();
  if (context.projectId) params.set("projectId", context.projectId);
  if (context.trackId) params.set("trackId", context.trackId);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function buildMotionSceneEditorHref(
  sceneId: string,
  context: MotionSceneEditorContext = {},
): string {
  return `/creative-studio/scenes/${sceneId}${buildMotionSceneEditorQuery(context)}`;
}

export function hasMotionSceneDragType(
  types: DOMStringList | readonly string[],
): boolean {
  for (let i = 0; i < types.length; i += 1) {
    if (types[i] === MOTION_SCENE_DRAG_TYPE) return true;
  }
  return false;
}
