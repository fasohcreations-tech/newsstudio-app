import type { SceneObject } from "@/features/scene-composer/types/scene-composer.types";
import { resolveVariableTokens } from "@/features/motion-scene-engine/lib/variable-binding";
import { resolveBindingMediaUrl } from "@/features/story-production/lib/story-data-bindings";

const TEXT_TYPES = new Set(["text", "rich_text", "ticker", "clock", "date"]);

function hasResolvableOrPendingBinding(
  bindings: Record<string, string>,
  keys: string[],
): boolean {
  return keys.some((key) => {
    const value = bindings[key];
    return Boolean(value && value !== "#" && !value.startsWith("{{"));
  });
}

export function resolveObjectMediaUrl(
  object: SceneObject,
  bindings: Record<string, string>,
): string | null {
  const name = object.name.toLowerCase();
  const region =
    typeof object.metadata?.region_key === "string"
      ? object.metadata.region_key
      : "";

  if (object.object_type === "logo" || region === "reporter-logo") {
    const reporterKeys = ["reporter_photo", "reporter_image"];
    if (hasResolvableOrPendingBinding(bindings, reporterKeys)) {
      // If reporter media is set (including pending library refs), do not
      // silently fall back to logo/image and show the wrong visual.
      return resolveBindingMediaUrl(bindings, reporterKeys);
    }
    return resolveBindingMediaUrl(bindings, [
      "logo",
      "channel_logo",
      "image",
    ]);
  }

  if (object.object_type === "video" || region === "main-video") {
    if (name.includes("background") || name.includes("bg")) {
      return resolveBindingMediaUrl(bindings, [
        "background_video",
        "secondary_video",
        "video",
        "main_video",
      ]);
    }
    return resolveBindingMediaUrl(bindings, [
      "main_video",
      "video",
      "background_video",
    ]);
  }

  if (object.object_type === "image") {
    if (region === "optional-info" || region === "optional-info-1" || region === "optional-info-2" || name.includes("optional")) {
      return resolveBindingMediaUrl(bindings, ["optional_info_image"]);
    }
    if (name.includes("reporter") || region.includes("reporter")) {
      return resolveBindingMediaUrl(bindings, [
        "reporter_photo",
        "reporter_image",
        "logo",
        "image",
        "main_image",
      ]);
    }
    if (name.includes("background") || name.includes("bg")) {
      return resolveBindingMediaUrl(bindings, [
        "background_image",
        "main_image",
        "image",
      ]);
    }
    return resolveBindingMediaUrl(bindings, [
      "main_image",
      "image",
      "reporter_photo",
      "gallery_images",
    ]);
  }

  return null;
}

export function resolveObjectDisplayText(
  object: SceneObject,
  bindings: Record<string, string>,
): string {
  if (object.object_type === "clock") {
    return bindings.time ?? "08:00";
  }

  if (object.object_type === "date") {
    return bindings.date ?? "28 ജൂലൈ 2026";
  }

  const text = object.content.text;
  if (typeof text !== "string") return object.name;

  return resolveVariableTokens(text, bindings);
}

export function isTextLikeObject(object: SceneObject): boolean {
  return TEXT_TYPES.has(object.object_type);
}

export function filterVisibleObjects(
  objects: SceneObject[],
  playheadMs: number,
): SceneObject[] {
  return objects.filter(
    (obj) =>
      obj.visible && playheadMs >= obj.start_ms && playheadMs <= obj.end_ms,
  );
}
