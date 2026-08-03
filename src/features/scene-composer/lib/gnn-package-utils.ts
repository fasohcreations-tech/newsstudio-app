import { GNN_BROADCAST_PACKAGE_ID } from "@/features/scene-composer/constants/gnn-broadcast-package.constants";
import type { SceneComponent } from "@/features/scene-composer/types/scene-composer.types";
import type { MotionScene } from "@/features/motion-scene-engine/types/motion-scene.types";

export function getScenePackageId(scene: MotionScene): string | null {
  const meta = scene.metadata as Record<string, unknown> | undefined;
  if (typeof meta?.package_id === "string") return meta.package_id;
  const props = scene.properties as Record<string, unknown> | undefined;
  if (typeof props?.package_id === "string") return props.package_id;
  return null;
}

export function getScenePackageCode(scene: MotionScene): string | null {
  const meta = scene.metadata as Record<string, unknown> | undefined;
  return typeof meta?.package_code === "string" ? meta.package_code : null;
}

export function isGnnScene(scene: MotionScene): boolean {
  return getScenePackageId(scene) === GNN_BROADCAST_PACKAGE_ID;
}

export function isGnnComponent(component: SceneComponent): boolean {
  const meta = component.metadata as Record<string, unknown> | undefined;
  return meta?.package_id === GNN_BROADCAST_PACKAGE_ID;
}

export function countGnnScenes(scenes: MotionScene[]): number {
  return scenes.filter(isGnnScene).length;
}

export function filterGnnScenes(scenes: MotionScene[]): MotionScene[] {
  return scenes.filter(isGnnScene);
}

export function filterGnnComponents(components: SceneComponent[]): SceneComponent[] {
  return components.filter(isGnnComponent);
}

export const GNN_PACKAGE_LABEL = "GNN Broadcast v1";
export const GNN_MASTER_SCENE_TARGET = 1;
