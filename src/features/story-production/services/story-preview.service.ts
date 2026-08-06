import type { SceneObject } from "@/features/scene-composer/types/scene-composer.types";
import { resolveVariableTokens } from "@/features/motion-scene-engine/lib/variable-binding";
import { parseBackgroundSlides } from "@/features/scene-composer/lib/background-slides";
import { isLibraryMediaRef } from "@/features/story-production/lib/library-media-reference";
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

function mediaBindingValue(
  bindings: Record<string, string>,
  key: string,
): string | null {
  const value = bindings[key];
  if (!value || value === "#" || value.startsWith("{{")) return null;
  return value;
}

/**
 * Background layer media. Prefer the slide queue on `background_video`.
 * Pending library refs wait for resolution (no demo fallthrough).
 */
export function resolveBackgroundMediaUrl(
  bindings: Record<string, string>,
): string | null {
  const slides = parseBackgroundSlides(bindings);
  if (slides.length > 0) return slides[0] ?? null;

  const primary = mediaBindingValue(bindings, "background_video");
  if (primary) {
    if (isLibraryMediaRef(primary) || primary.startsWith("clip://")) {
      return null;
    }
    // Multi-slide raw string before resolve — take first segment if resolved.
    const first = primary.split(",")[0]?.trim();
    return first || null;
  }
  const image = mediaBindingValue(bindings, "background_image");
  if (image) {
    if (isLibraryMediaRef(image) || image.startsWith("clip://")) return null;
    return image;
  }
  return null;
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

  if (
    object.metadata?.layer === "background" ||
    object.metadata?.component_kind === "background" ||
    object.metadata?.generator === "background" ||
    name === "background" ||
    (typeof object.metadata?.component_slug === "string" &&
      object.metadata.component_slug.includes("background"))
  ) {
    return resolveBackgroundMediaUrl(bindings);
  }

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
      "watermark",
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
        "channel_logo",
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

  const fromContent =
    typeof object.content.text === "string" ? object.content.text : "";
  const fromBinding =
    typeof object.bindings.text === "string" ? object.bindings.text : "";
  const text = fromContent || fromBinding;
  if (!text) return object.name;

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
