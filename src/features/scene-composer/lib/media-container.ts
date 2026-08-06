/**
 * Media slide container — shared by Background and Smart Container layers.
 * Queue + playback live on the SceneObject (`content.media_container`).
 */

import {
  isLibraryMediaRef,
  parseClipMediaRef,
  parseLibraryMediaRef,
} from "@/features/story-production/lib/library-media-reference";
import { SMART_MAPPING_CONTENT_KEY } from "@/features/scene-composer/lib/story-mapping/types";
import type { SceneObject } from "@/features/scene-composer/types/scene-composer.types";

export const MEDIA_CONTAINER_CONTENT_KEY = "media_container";

export type MediaTransitionStyle = "cut" | "fade" | "slide" | "push" | "zoom";
export type MediaContainerFit = "cover" | "contain" | "fill";

export type MediaContainerConfig = {
  /** Comma-separated library refs / URLs (images and videos). */
  slides: string;
  transitionStyle: MediaTransitionStyle;
  intervalMs: number;
  transitionMs: number;
  slideIndex: number;
  fit: MediaContainerFit;
  autoplay: boolean;
};

export type MediaContainerConfigPatch = Partial<{
  slides: string;
  transitionStyle: string;
  intervalMs: number;
  transitionMs: number;
  slideIndex: number;
  fit: string;
  autoplay: boolean;
}>;

const DEFAULTS: MediaContainerConfig = {
  slides: "",
  transitionStyle: "fade",
  intervalMs: 5000,
  transitionMs: 600,
  slideIndex: 0,
  fit: "contain",
  autoplay: true,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** Object hosts a Story Mapping contract (Feature 048). */
export function hasSmartMappingConfig(
  object: SceneObject | null | undefined,
): boolean {
  if (!object) return false;
  return isRecord(object.content?.[SMART_MAPPING_CONTENT_KEY]);
}

/** Background layer or Smart Container — hosts a media slide queue. */
export function isMediaSlideContainerObject(object: SceneObject | null | undefined): boolean {
  if (!object) return false;
  if (
    object.metadata?.layer === "background" ||
    object.metadata?.component_kind === "background" ||
    object.metadata?.generator === "background" ||
    object.name === "Background"
  ) {
    return true;
  }
  return isSmartContainerObject(object);
}

export function isSlideSmartContainerObject(
  object: SceneObject | null | undefined,
): boolean {
  if (!object) return false;
  return (
    object.metadata?.role === "slide_smart_container" ||
    object.metadata?.container_kind === "slide_smart" ||
    object.metadata?.layer_kind === "slide_smart_container" ||
    object.name === "Slide Smart Container"
  );
}

export function isSmartContainerObject(object: SceneObject | null | undefined): boolean {
  if (!object) return false;
  if (isSlideSmartContainerObject(object)) return true;
  // Story Mapping now exists on all layer types; mapping config alone must NOT
  // classify a layer as Smart Container.
  const hasMediaQueue = isRecord(object.content?.[MEDIA_CONTAINER_CONTENT_KEY]);
  if (hasSmartMappingConfig(object) && hasMediaQueue) return true;
  return (
    object.metadata?.role === "smart_container" ||
    object.metadata?.container_kind === "smart" ||
    object.metadata?.layer_kind === "smart_container" ||
    object.name === "Smart Container" ||
    object.name === "Slide Smart Container"
  );
}

export function isBackgroundContainerObject(
  object: SceneObject | null | undefined,
): boolean {
  if (!object) return false;
  return (
    object.metadata?.layer === "background" ||
    object.metadata?.component_kind === "background" ||
    object.metadata?.generator === "background" ||
    object.name === "Background"
  );
}

function normalizeStyle(value: unknown): MediaTransitionStyle {
  const style = String(value ?? DEFAULTS.transitionStyle).toLowerCase();
  if (style === "crossfade") return "fade";
  return style === "cut" ||
    style === "slide" ||
    style === "fade" ||
    style === "push" ||
    style === "zoom"
    ? style
    : DEFAULTS.transitionStyle;
}

function normalizeFit(value: unknown): MediaContainerFit {
  const fit = String(value ?? DEFAULTS.fit).toLowerCase();
  return fit === "contain" || fit === "fill" || fit === "cover"
    ? fit
    : DEFAULTS.fit;
}

/** Read container config from the object, with Background story-binding fallback. */
export function getMediaContainerConfig(
  object: SceneObject,
  storyBindings: Record<string, string> = {},
): MediaContainerConfig {
  const raw = object.content?.[MEDIA_CONTAINER_CONTENT_KEY];
  if (isRecord(raw)) {
    const interval = Number(raw.intervalMs);
    const transition = Number(raw.transitionMs);
    const index = Number(raw.slideIndex);
    const autoplayRaw = String(raw.autoplay ?? "true").toLowerCase();
    return {
      slides: typeof raw.slides === "string" ? raw.slides : "",
      transitionStyle: normalizeStyle(raw.transitionStyle),
      intervalMs: Number.isFinite(interval)
        ? Math.max(1000, interval)
        : DEFAULTS.intervalMs,
      transitionMs: Number.isFinite(transition)
        ? Math.max(0, transition)
        : DEFAULTS.transitionMs,
      slideIndex: Number.isFinite(index) ? Math.max(0, index) : DEFAULTS.slideIndex,
      fit: normalizeFit(raw.fit),
      autoplay: !(autoplayRaw === "false" || autoplayRaw === "0"),
    };
  }

  // Legacy Background: story bindings until the object is patched once.
  if (isBackgroundContainerObject(object)) {
    const slides =
      (storyBindings.background_video || "").trim() ||
      (storyBindings.background_image || "").trim() ||
      "";
    const interval = Number(storyBindings.background_slide_interval_ms);
    const transition = Number(storyBindings.background_transition_ms);
    const index = Number(storyBindings.background_slide_index);
    const autoplayRaw = String(
      storyBindings.background_autoplay ?? "true",
    ).toLowerCase();
    return {
      slides,
      transitionStyle: normalizeStyle(storyBindings.background_transition_style),
      intervalMs: Number.isFinite(interval)
        ? Math.max(1000, interval)
        : DEFAULTS.intervalMs,
      transitionMs: Number.isFinite(transition)
        ? Math.max(0, transition)
        : DEFAULTS.transitionMs,
      slideIndex: Number.isFinite(index) ? Math.max(0, index) : DEFAULTS.slideIndex,
      fit: normalizeFit(storyBindings.background_fit),
      autoplay: !(autoplayRaw === "false" || autoplayRaw === "0"),
    };
  }

  return { ...DEFAULTS };
}

export function setMediaContainerConfig(
  object: SceneObject,
  config: MediaContainerConfig,
): SceneObject {
  return {
    ...object,
    content: {
      ...object.content,
      [MEDIA_CONTAINER_CONTENT_KEY]: {
        slides: config.slides,
        transitionStyle: config.transitionStyle,
        intervalMs: config.intervalMs,
        transitionMs: config.transitionMs,
        slideIndex: config.slideIndex,
        fit: config.fit,
        autoplay: config.autoplay,
      },
    },
  };
}

export function patchMediaContainerConfig(
  object: SceneObject,
  patch: MediaContainerConfigPatch,
  storyBindings: Record<string, string> = {},
): SceneObject {
  const current = getMediaContainerConfig(object, storyBindings);
  const next: MediaContainerConfig = {
    ...current,
    ...(patch.slides !== undefined ? { slides: patch.slides } : null),
    ...(patch.transitionStyle !== undefined
      ? { transitionStyle: normalizeStyle(patch.transitionStyle) }
      : null),
    ...(patch.intervalMs !== undefined
      ? { intervalMs: Math.max(1000, Number(patch.intervalMs) || current.intervalMs) }
      : null),
    ...(patch.transitionMs !== undefined
      ? {
          transitionMs: Math.max(
            0,
            Number(patch.transitionMs) || current.transitionMs,
          ),
        }
      : null),
    ...(patch.slideIndex !== undefined
      ? { slideIndex: Math.max(0, Number(patch.slideIndex) || 0) }
      : null),
    ...(patch.fit !== undefined ? { fit: normalizeFit(patch.fit) } : null),
    ...(patch.autoplay !== undefined ? { autoplay: Boolean(patch.autoplay) } : null),
  };
  return setMediaContainerConfig(object, next);
}

/** Parse the slide queue into ordered refs/URLs. */
export function parseMediaContainerSlides(
  slidesRaw: string,
  options?: { includePendingLibraryRefs?: boolean },
): string[] {
  const includePending = options?.includePendingLibraryRefs === true;
  if (!slidesRaw.trim()) return [];
  return slidesRaw
    .split(",")
    .map((part) => part.trim())
    .filter((part) => {
      if (!part || part === "#" || part.startsWith("{{")) return false;
      if (!includePending && isLibraryMediaRef(part)) return false;
      if (!includePending && part.startsWith("clip://")) return false;
      return true;
    });
}

/** Append a media ref to the queue (deduped). */
export function appendMediaContainerSlide(
  slidesRaw: string,
  nextValue: string,
): string {
  const parts = slidesRaw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.includes(nextValue)) return slidesRaw;
  return [...parts, nextValue].join(",");
}

/** Resolve comma-separated library refs with a URL map (per asset/clip id). */
export function resolveMediaContainerSlideUrls(
  slidesRaw: string,
  urlByAssetId: Record<string, string>,
  urlByClipId: Record<string, string> = {},
): string[] {
  return slidesRaw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const clipId = parseClipMediaRef(part);
      if (clipId) return urlByClipId[clipId] || "";
      const assetId = parseLibraryMediaRef(part);
      if (assetId) return urlByAssetId[assetId] || "";
      if (part.startsWith("{{") || part === "#") return "";
      return part;
    })
    .filter(Boolean);
}

export function looksLikeMediaImageUrl(url: string): boolean {
  return /\.(png|jpe?g|gif|webp|svg|avif|bmp)(\?|#|$)/i.test(url);
}

export function mediaContainerResolveKey(objectId: string): string {
  return `__mc_${objectId}`;
}
export function mediaContainerToBackgroundStoryPatch(
  config: MediaContainerConfig,
): Record<string, string> {
  return {
    background_video: config.slides,
    background_image: "",
    background_transition_style: config.transitionStyle,
    background_slide_interval_ms: String(config.intervalMs),
    background_transition_ms: String(config.transitionMs),
    background_slide_index: String(config.slideIndex),
    background_fit: config.fit,
    background_autoplay: config.autoplay ? "true" : "false",
  };
}

// ---- Back-compat aliases ----

export type BackgroundTransitionStyle = MediaTransitionStyle;
export type BackgroundMediaFit = MediaContainerFit;
export type BackgroundSlideControls = Omit<MediaContainerConfig, "slides">;

export function parseBackgroundSlides(
  bindings: Record<string, string>,
  options?: { includePendingLibraryRefs?: boolean },
): string[] {
  const raw =
    (bindings.background_video || "").trim() ||
    (bindings.background_image || "").trim();
  return parseMediaContainerSlides(raw, options);
}

export function resolveBackgroundSlideControls(
  bindings: Record<string, string>,
): BackgroundSlideControls {
  const interval = Number(bindings.background_slide_interval_ms);
  const transition = Number(bindings.background_transition_ms);
  const index = Number(bindings.background_slide_index);
  const autoplayRaw = String(
    bindings.background_autoplay ?? "true",
  ).toLowerCase();
  return {
    transitionStyle: normalizeStyle(bindings.background_transition_style),
    intervalMs: Number.isFinite(interval)
      ? Math.max(1000, interval)
      : DEFAULTS.intervalMs,
    transitionMs: Number.isFinite(transition)
      ? Math.max(0, transition)
      : DEFAULTS.transitionMs,
    slideIndex: Number.isFinite(index) ? Math.max(0, index) : DEFAULTS.slideIndex,
    fit: normalizeFit(bindings.background_fit),
    autoplay: !(autoplayRaw === "false" || autoplayRaw === "0"),
  };
}

export function looksLikeBackgroundImageUrl(url: string): boolean {
  return looksLikeMediaImageUrl(url);
}
