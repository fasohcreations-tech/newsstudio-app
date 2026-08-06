/**
 * Resolve a Smart Container's mapping contract against Story data.
 * Resolve-at-read — does not mutate the SceneObject.
 */

import type {
  ComposerScene,
  SceneObject,
} from "@/features/scene-composer/types/scene-composer.types";
import {
  getMediaContainerConfig,
  mediaContainerResolveKey,
  parseMediaContainerSlides,
} from "@/features/scene-composer/lib/media-container";
import { hasSmartMappingConfig } from "@/features/scene-composer/lib/media-container";
import { getSmartMappingConfig } from "@/features/scene-composer/lib/story-mapping/defaults";
import { isMediaContainerMappingLayer } from "@/features/scene-composer/lib/story-mapping/layer-defaults";
import { applyMappingMode } from "@/features/scene-composer/lib/story-mapping/apply-mode";
import {
  inferCandidateKind,
  resolveMappingSourceCandidates,
} from "@/features/scene-composer/lib/story-mapping/resolve-source";
import type {
  SmartMappingConfig,
  SmartMappingPage,
  SmartMappingResolveContext,
  SmartMappingResolveResult,
} from "@/features/scene-composer/lib/story-mapping/types";
import { createEmptyStoryData } from "@/features/story-production/lib/story-data-defaults";
import type { StoryDataRecord } from "@/features/story-production/types/story-data.types";
import { resolveVariableTokens } from "@/features/motion-scene-engine/lib/variable-binding";

function pagesFromManualLayer(
  object: SceneObject,
  bindings: Record<string, string>,
  mapping: SmartMappingConfig,
): SmartMappingPage[] {
  if (isMediaContainerMappingLayer(object)) {
    return pagesFromManualSlides(object, bindings);
  }

  const pages: SmartMappingPage[] = [];
  const acceptsText = mapping.acceptedTypes.some(
    (t) =>
      t === "text" ||
      t === "ticker" ||
      t === "clock" ||
      t === "story_metadata" ||
      t === "ai_output",
  );
  const acceptsMedia = mapping.acceptedTypes.some(
    (t) =>
      t === "image" ||
      t === "video" ||
      t === "audio" ||
      t === "svg" ||
      t === "logo" ||
      t === "advertisement",
  );

  if (acceptsText) {
    const raw = String(
      object.content?.text ?? object.bindings?.text ?? mapping.staticValue ?? "",
    ).trim();
    if (raw) {
      const value = raw.includes("{{")
        ? resolveVariableTokens(raw, bindings)
        : raw;
      if (value && !value.startsWith("{{")) {
        pages.push({ value, kind: "text", label: "Manual text" });
      }
    }
  }

  if (acceptsMedia) {
    const raw = String(
      object.bindings?.src ??
        object.content?.src ??
        object.content?.url ??
        mapping.staticValue ??
        "",
    ).trim();
    if (raw) {
      const value = raw.includes("{{")
        ? resolveVariableTokens(raw, bindings)
        : raw;
      if (value && !value.startsWith("{{")) {
        pages.push({
          value,
          kind: inferCandidateKind(value),
          label: "Manual media",
        });
      }
    }
  }

  return pages;
}

/** Synthetic binding — mapped text for any layer. */
export function mappingTextResolveKey(objectId: string): string {
  return `__map_text_${objectId}`;
}

/** Synthetic binding — mapped primary media URL for any layer. */
export function mappingMediaResolveKey(objectId: string): string {
  return `__map_media_${objectId}`;
}

export function isStoryMappingConfigured(object: SceneObject): boolean {
  return hasSmartMappingConfig(object);
}

export function isStoryMappingDriven(object: SceneObject): boolean {
  const mapping = getSmartMappingConfig(object);
  return mapping.mappingMode !== "manual" || hasSmartMappingConfig(object);
}

function pagesFromManualSlides(
  object: SceneObject,
  bindings: Record<string, string>,
): SmartMappingPage[] {
  const config = getMediaContainerConfig(object, bindings);
  return parseMediaContainerSlides(config.slides, {
    includePendingLibraryRefs: true,
  }).map((value) => ({
    value,
    kind: inferCandidateKind(value),
  }));
}

function applyFallback(
  mappingFallback: string,
  pages: SmartMappingPage[],
): { pages: SmartMappingPage[]; usedFallback: boolean } {
  if (pages.length > 0) return { pages, usedFallback: false };
  const fallback = mappingFallback.trim();
  if (!fallback) return { pages: [], usedFallback: false };
  return {
    pages: [
      {
        value: fallback,
        kind: inferCandidateKind(fallback),
        label: "Fallback",
      },
    ],
    usedFallback: true,
  };
}

/** Merge flat bindings into a StoryDataRecord (for mapping resolve at preview time). */
export function storyDataFromBindings(
  bindings: Record<string, string> = {},
): StoryDataRecord {
  return coalesceStoryForMapping(undefined, bindings);
}

/** Merge scene story_data + flat bindings into a StoryDataRecord for source resolve. */
export function coalesceStoryForMapping(
  story: Partial<StoryDataRecord> | null | undefined,
  bindings: Record<string, string> = {},
): StoryDataRecord {
  const base = createEmptyStoryData();
  const fromStory = story && typeof story === "object" ? story : {};
  const merged: StoryDataRecord = {
    ...base,
    ...fromStory,
  };
  for (const [key, value] of Object.entries(bindings)) {
    if (!(key in merged)) continue;
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    const current = (merged as Record<string, unknown>)[key];
    if (typeof current === "boolean") continue;
    (merged as unknown as Record<string, string>)[key] = trimmed;
  }
  return merged;
}

export function storyDataFromComposerScene(
  scene: ComposerScene | null | undefined,
  bindings: Record<string, string> = {},
): StoryDataRecord {
  const meta = scene?.metadata as Record<string, unknown> | undefined;
  const raw = meta?.story_data;
  const story =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Partial<StoryDataRecord>)
      : null;
  return coalesceStoryForMapping(story, {
    ...(scene?.resolved_bindings ?? {}),
    ...bindings,
  });
}

/**
 * Story Mapping Engine entry: Story + Smart Container → pages / text / preview.
 */
export function resolveSmartContainerMapping(
  object: SceneObject,
  story: StoryDataRecord,
  context: SmartMappingResolveContext = {},
): SmartMappingResolveResult {
  const mapping = getSmartMappingConfig(object);
  const bindings = context.bindings ?? {};
  const coalesced = coalesceStoryForMapping(story, bindings);

  let pages: SmartMappingPage[] = [];
  if (mapping.mappingMode === "manual") {
    pages = pagesFromManualLayer(object, bindings, mapping);
  } else {
    const candidates = resolveMappingSourceCandidates(
      coalesced,
      mapping,
      context,
    );
    pages = applyMappingMode(mapping.mappingMode, candidates);
  }

  const withFallback = applyFallback(mapping.fallback, pages);
  pages = withFallback.pages;

  const mediaPages = pages.filter((p) => p.kind !== "text");
  const textPages = pages.filter((p) => p.kind === "text");
  const slidesRaw = (mediaPages.length > 0 ? mediaPages : pages)
    .map((p) => p.value)
    .filter(Boolean)
    .join(",");

  const text =
    textPages[0]?.value ||
    (pages.length === 1 && pages[0]?.kind === "text" ? pages[0].value : "") ||
    "";

  const previewLabel =
    pages.length === 0
      ? "Empty"
      : pages.length === 1
        ? pages[0]!.label || pages[0]!.value.slice(0, 48)
        : `${pages.length} pages`;

  return {
    pages,
    slidesRaw,
    text,
    previewLabel,
    usedFallback: withFallback.usedFallback,
    mapping,
  };
}

/** Alias — resolves Story Mapping for any layer type. */
export const resolveLayerMapping = resolveSmartContainerMapping;

/** Build synthetic preview bindings for all mapped layers in a scene. */
export function buildLayerMappingBindings(
  objects: SceneObject[],
  story: StoryDataRecord,
  context: SmartMappingResolveContext = {},
): Record<string, string> {
  const out: Record<string, string> = {};

  for (const object of objects) {
    const mapping = getSmartMappingConfig(object);
    const isContainer = isMediaContainerMappingLayer(object);
    const hasConfig = hasSmartMappingConfig(object);
    const isDriven = mapping.mappingMode !== "manual" || hasConfig;

    if (!isContainer && !isDriven) continue;

    const resolved = resolveLayerMapping(object, story, context);
    if (resolved.text.trim()) {
      out[mappingTextResolveKey(object.id)] = resolved.text;
    }
    if (isContainer && resolved.slidesRaw.trim()) {
      out[mediaContainerResolveKey(object.id)] = resolved.slidesRaw;
    } else if (resolved.slidesRaw.trim()) {
      const first =
        resolved.slidesRaw
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean)[0] ?? "";
      if (first) out[mappingMediaResolveKey(object.id)] = first;
    }
  }

  return out;
}

/** Interval for slideshow playback from mapping duration settings. */
export function resolveMappingIntervalMs(
  object: SceneObject,
  storyBindings: Record<string, string> = {},
): number {
  const mapping = getSmartMappingConfig(object);
  if (mapping.durationMode === "manual") {
    return Math.max(500, mapping.durationMs);
  }
  const media = getMediaContainerConfig(object, storyBindings);
  return media.intervalMs;
}
