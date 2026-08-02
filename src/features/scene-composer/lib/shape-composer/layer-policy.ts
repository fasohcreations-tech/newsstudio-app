import { isShapeComposerActive } from "@/features/scene-composer/lib/shape-composer/apply";
import type { SceneObject } from "@/features/scene-composer/types/scene-composer.types";

/**
 * Layers that keep their native content when Shape Composer is enabled.
 * Shape draws as a frame/overlay instead of replacing the layer.
 */
export function isShapeOverlayLayer(object: SceneObject): boolean {
  const slug =
    typeof object.metadata?.component_slug === "string"
      ? object.metadata.component_slug
      : "";
  const layer =
    typeof object.metadata?.layer === "string" ? object.metadata.layer : "";
  const region =
    typeof object.metadata?.region_key === "string"
      ? object.metadata.region_key
      : "";

  if (layer === "main_video_container" || slug.includes("main-video")) {
    return true;
  }
  if (layer === "background" || layer === "frames") return true;
  if (object.metadata?.skeleton === true) return true;
  if (region.length > 0) return true;

  return [
    "video",
    "image",
    "logo",
    "text",
    "rich_text",
    "ticker",
    "clock",
    "date",
    "component",
  ].includes(object.object_type);
}

/** Replace the whole layer with ShapeRenderer (pure shape objects). */
export function shouldReplaceContentWithShape(object: SceneObject): boolean {
  return isShapeComposerActive(object) && !isShapeOverlayLayer(object);
}

/** Draw ShapeRenderer on top of existing layer content. */
export function shouldOverlayShape(object: SceneObject): boolean {
  return isShapeComposerActive(object) && isShapeOverlayLayer(object);
}
