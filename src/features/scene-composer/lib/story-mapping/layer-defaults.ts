/**
 * Per-layer Story Mapping defaults (Feature 048 — all layer types).
 */

import { isBackgroundContainerObject, isSmartContainerObject } from "@/features/scene-composer/lib/media-container";
import {
  DEFAULT_SLIDE_SMART_MAPPING,
  DEFAULT_SMART_MAPPING,
} from "@/features/scene-composer/lib/story-mapping/defaults";
import type {
  SmartBindingSource,
  SmartDataType,
  SmartMappingConfig,
  SmartMappingMode,
} from "@/features/scene-composer/lib/story-mapping/types";
import type { SceneObject } from "@/features/scene-composer/types/scene-composer.types";

const TEXT_OBJECT_TYPES = new Set([
  "text",
  "rich_text",
  "ticker",
  "clock",
  "date",
]);

const MEDIA_OBJECT_TYPES = new Set(["video", "image", "logo"]);

const SHAPE_OBJECT_TYPES = new Set([
  "rectangle",
  "rounded_rectangle",
  "circle",
  "ellipse",
  "line",
  "polygon",
  "gradient",
  "svg",
  "mask",
]);

function baseConfig(
  object: SceneObject,
  partial: Partial<SmartMappingConfig>,
): SmartMappingConfig {
  return {
    containerName: object.name || "Layer",
    acceptedTypes: ["text"],
    bindingSource: "static_value",
    mappingMode: "manual",
    fallback: "",
    staticValue: "",
    durationMode: "auto",
    durationMs: 5000,
    transition: "crossfade",
    ...partial,
  };
}

function inferTextSource(object: SceneObject): SmartBindingSource {
  const name = object.name.toLowerCase();
  const layerKind = String(object.metadata?.layer_kind ?? "").toLowerCase();
  const region = String(object.metadata?.region_key ?? "").toLowerCase();

  if (layerKind === "headline" || region === "headline" || name.includes("headline")) {
    return "story_headline";
  }
  if (
    layerKind === "subheadline" ||
    region === "subheadline" ||
    name.includes("subheadline") ||
    name.includes("sub-headline")
  ) {
    return "current_sub_headline";
  }
  if (layerKind === "ticker" || object.object_type === "ticker" || name.includes("ticker")) {
    return "ticker";
  }
  if (object.object_type === "clock" || name.includes("clock")) {
    return "static_value";
  }
  if (object.object_type === "date" || name.includes("date")) {
    return "date";
  }
  if (name.includes("reporter") || region.includes("reporter")) {
    return "reporter";
  }
  if (name.includes("location") || region.includes("location")) {
    return "location";
  }
  if (name.includes("summary") || name.includes("story")) {
    return "story_summary";
  }
  return "story_headline";
}

function inferMediaSource(object: SceneObject): SmartBindingSource {
  const name = object.name.toLowerCase();
  const region = String(object.metadata?.region_key ?? "").toLowerCase();

  if (name.includes("logo") || object.object_type === "logo" || region.includes("logo")) {
    return "organization";
  }
  if (name.includes("reporter") || region.includes("reporter")) {
    return "reporter";
  }
  if (name.includes("background") || region.includes("background")) {
    return "static_value";
  }
  if (object.object_type === "video" || region.includes("video")) {
    return "static_value";
  }
  return "current_sub_headline_assets";
}

/** Default mapping contract when none is persisted on the object. */
export function inferDefaultMappingForObject(
  object: SceneObject,
): SmartMappingConfig {
  if (
    object.metadata?.role === "slide_smart_container" ||
    object.metadata?.layer_kind === "slide_smart_container"
  ) {
    return {
      ...DEFAULT_SLIDE_SMART_MAPPING,
      containerName: object.name || DEFAULT_SLIDE_SMART_MAPPING.containerName,
    };
  }

  if (isSmartContainerObject(object) && !isBackgroundContainerObject(object)) {
    return {
      ...DEFAULT_SMART_MAPPING,
      containerName: object.name || DEFAULT_SMART_MAPPING.containerName,
    };
  }

  if (isBackgroundContainerObject(object)) {
    return baseConfig(object, {
      acceptedTypes: ["image", "video"],
      bindingSource: "static_value",
      mappingMode: "manual",
    });
  }

  if (TEXT_OBJECT_TYPES.has(object.object_type)) {
    const source = inferTextSource(object);
    const isSystem = object.object_type === "clock" || object.object_type === "date";
    return baseConfig(object, {
      acceptedTypes:
        object.object_type === "ticker"
          ? ["text", "ticker"]
          : ["text"],
      bindingSource: source,
      mappingMode: isSystem ? "single" : "single",
      staticValue:
        object.object_type === "clock"
          ? "{{time}}"
          : object.object_type === "date"
            ? "{{date}}"
            : "",
    });
  }

  if (MEDIA_OBJECT_TYPES.has(object.object_type)) {
    const types: SmartDataType[] =
      object.object_type === "video" ? ["video", "image"] : ["image", "svg", "logo"];
    return baseConfig(object, {
      acceptedTypes: types,
      bindingSource: inferMediaSource(object),
      mappingMode: "single",
    });
  }

  if (SHAPE_OBJECT_TYPES.has(object.object_type)) {
    return baseConfig(object, {
      acceptedTypes: ["text"],
      bindingSource: "static_value",
      mappingMode: "manual",
    });
  }

  // Groups, components, etc.
  return baseConfig(object, {
    acceptedTypes: ["text", "image", "video"],
    bindingSource: "static_value",
    mappingMode: "manual",
  });
}

export function isMediaContainerMappingLayer(object: SceneObject): boolean {
  return isSmartContainerObject(object) || isBackgroundContainerObject(object);
}

export function isTextMappingLayer(object: SceneObject): boolean {
  const mapping = inferDefaultMappingForObject(object);
  return (
    TEXT_OBJECT_TYPES.has(object.object_type) ||
    mapping.acceptedTypes.every((t) => t === "text" || t === "ticker")
  );
}

export function allowedMappingModesForObject(
  object: SceneObject,
): SmartMappingMode[] {
  if (isMediaContainerMappingLayer(object)) {
    return [
      "single",
      "first",
      "last",
      "sequential",
      "random",
      "slideshow",
      "grid",
      "timeline",
      "manual",
    ];
  }
  if (MEDIA_OBJECT_TYPES.has(object.object_type)) {
    return ["single", "first", "last", "random", "manual"];
  }
  return ["single", "first", "last", "manual"];
}
