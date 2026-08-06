import type { SceneObject } from "@/features/scene-composer/types/scene-composer.types";
import {
  SMART_BINDING_SOURCES,
  SMART_DATA_TYPES,
  SMART_MAPPING_MODES,
  SMART_MAPPING_TRANSITIONS,
} from "@/features/scene-composer/lib/story-mapping/catalogs";
import {
  inferDefaultMappingForObject,
} from "@/features/scene-composer/lib/story-mapping/layer-defaults";
import {
  SMART_MAPPING_CONTENT_KEY,
  type SmartBindingSource,
  type SmartDataType,
  type SmartDurationMode,
  type SmartMappingConfig,
  type SmartMappingConfigPatch,
  type SmartMappingMode,
  type SmartMappingTransition,
} from "@/features/scene-composer/lib/story-mapping/types";

export const DEFAULT_SMART_MAPPING: SmartMappingConfig = {
  containerName: "Smart Container",
  acceptedTypes: ["image", "video"],
  bindingSource: "static_value",
  mappingMode: "manual",
  fallback: "",
  staticValue: "",
  durationMode: "auto",
  durationMs: 5000,
  transition: "crossfade",
};

export const DEFAULT_SLIDE_SMART_MAPPING: SmartMappingConfig = {
  containerName: "Slide Smart Container",
  acceptedTypes: ["image", "video"],
  bindingSource: "current_sub_headline_assets",
  mappingMode: "slideshow",
  fallback: "",
  staticValue: "",
  durationMode: "auto",
  durationMs: 5000,
  transition: "crossfade",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeDataType(value: unknown): SmartDataType | null {
  const key = String(value ?? "").trim().toLowerCase();
  return (SMART_DATA_TYPES as string[]).includes(key)
    ? (key as SmartDataType)
    : null;
}

function normalizeSource(value: unknown): SmartBindingSource {
  const key = String(value ?? "").trim().toLowerCase();
  return (SMART_BINDING_SOURCES as string[]).includes(key)
    ? (key as SmartBindingSource)
    : DEFAULT_SMART_MAPPING.bindingSource;
}

function normalizeMode(value: unknown): SmartMappingMode {
  const key = String(value ?? "").trim().toLowerCase();
  return (SMART_MAPPING_MODES as string[]).includes(key)
    ? (key as SmartMappingMode)
    : DEFAULT_SMART_MAPPING.mappingMode;
}

function normalizeTransition(value: unknown): SmartMappingTransition {
  const key = String(value ?? "").trim().toLowerCase();
  if (key === "fade") return "crossfade";
  return (SMART_MAPPING_TRANSITIONS as string[]).includes(key)
    ? (key as SmartMappingTransition)
    : DEFAULT_SMART_MAPPING.transition;
}

function normalizeDurationMode(value: unknown): SmartDurationMode {
  const key = String(value ?? "").trim().toLowerCase();
  return key === "manual" ? "manual" : "auto";
}

function normalizeAcceptedTypes(value: unknown): SmartDataType[] {
  if (!Array.isArray(value)) return [...DEFAULT_SMART_MAPPING.acceptedTypes];
  const next = value
    .map((item) => normalizeDataType(item))
    .filter((item): item is SmartDataType => Boolean(item));
  return next.length > 0 ? next : [...DEFAULT_SMART_MAPPING.acceptedTypes];
}

export function getSmartMappingConfig(
  object: SceneObject,
  fallbackName?: string,
): SmartMappingConfig {
  const raw = object.content?.[SMART_MAPPING_CONTENT_KEY];
  const nameFallback =
    fallbackName ||
    object.name ||
    DEFAULT_SMART_MAPPING.containerName;

  if (!isRecord(raw)) {
    return inferDefaultMappingForObject(object);
  }

  const duration = Number(raw.durationMs);
  return {
    containerName:
      typeof raw.containerName === "string" && raw.containerName.trim()
        ? raw.containerName.trim()
        : nameFallback,
    acceptedTypes: normalizeAcceptedTypes(raw.acceptedTypes),
    bindingSource: normalizeSource(raw.bindingSource),
    mappingMode: normalizeMode(raw.mappingMode),
    fallback: typeof raw.fallback === "string" ? raw.fallback : "",
    staticValue: typeof raw.staticValue === "string" ? raw.staticValue : "",
    durationMode: normalizeDurationMode(raw.durationMode),
    durationMs: Number.isFinite(duration)
      ? Math.max(500, duration)
      : DEFAULT_SMART_MAPPING.durationMs,
    transition: normalizeTransition(raw.transition),
  };
}

export function setSmartMappingConfig(
  object: SceneObject,
  config: SmartMappingConfig,
): SceneObject {
  return {
    ...object,
    content: {
      ...object.content,
      [SMART_MAPPING_CONTENT_KEY]: {
        containerName: config.containerName,
        acceptedTypes: config.acceptedTypes,
        bindingSource: config.bindingSource,
        mappingMode: config.mappingMode,
        fallback: config.fallback,
        staticValue: config.staticValue,
        durationMode: config.durationMode,
        durationMs: config.durationMs,
        transition: config.transition,
      },
    },
  };
}

export function patchSmartMappingConfig(
  object: SceneObject,
  patch: SmartMappingConfigPatch,
): SceneObject {
  const current = getSmartMappingConfig(object);
  const next: SmartMappingConfig = {
    ...current,
    ...(patch.containerName !== undefined
      ? { containerName: String(patch.containerName).trim() || current.containerName }
      : null),
    ...(patch.acceptedTypes !== undefined
      ? { acceptedTypes: normalizeAcceptedTypes(patch.acceptedTypes) }
      : null),
    ...(patch.bindingSource !== undefined
      ? { bindingSource: normalizeSource(patch.bindingSource) }
      : null),
    ...(patch.mappingMode !== undefined
      ? { mappingMode: normalizeMode(patch.mappingMode) }
      : null),
    ...(patch.fallback !== undefined ? { fallback: String(patch.fallback) } : null),
    ...(patch.staticValue !== undefined
      ? { staticValue: String(patch.staticValue) }
      : null),
    ...(patch.durationMode !== undefined
      ? { durationMode: normalizeDurationMode(patch.durationMode) }
      : null),
    ...(patch.durationMs !== undefined
      ? {
          durationMs: Math.max(
            500,
            Number(patch.durationMs) || current.durationMs,
          ),
        }
      : null),
    ...(patch.transition !== undefined
      ? { transition: normalizeTransition(patch.transition) }
      : null),
  };
  return setSmartMappingConfig(object, next);
}

/** Map mapping transition → media_container transitionStyle. */
export function mappingTransitionToMediaStyle(
  transition: SmartMappingTransition,
): "cut" | "fade" | "slide" | "push" | "zoom" {
  if (transition === "crossfade") return "fade";
  return transition;
}
