import { buildDefaultBindings } from "@/features/motion-scene-engine/lib/variable-binding";
import {
  STORY_BINDING_ALIASES,
  STORY_FIELD_TO_BINDING,
} from "@/features/story-production/constants/story-data.constants";
import { isLibraryMediaRef } from "@/features/story-production/lib/library-media-reference";
import {
  collectSubHeadlineSlots,
  joinSubHeadlineSlots,
  parseSubHeadlineSlots,
  SUB_HEADLINE_FIELD_KEYS,
} from "@/features/story-production/lib/sub-headlines";
import type { StoryDataRecord } from "@/features/story-production/types/story-data.types";

/** Keep summary / primary subheadline in sync with the four lower-info slots. */
export function syncSubHeadlineDerivedFields(
  data: StoryDataRecord,
): StoryDataRecord {
  const slots = collectSubHeadlineSlots(data);
  const joined = joinSubHeadlineSlots(slots);
  const primary = slots.find((slot) => slot.trim()) ?? "";
  return {
    ...data,
    sub_headline_1: slots[0] ?? "",
    sub_headline_2: slots[1] ?? "",
    sub_headline_3: slots[2] ?? "",
    sub_headline_4: slots[3] ?? "",
    summary: joined,
    subheadline: primary || data.subheadline,
  };
}

export function storyDataToBindings(
  data: StoryDataRecord,
): Record<string, string> {
  const synced = syncSubHeadlineDerivedFields(data);
  const bindings: Record<string, string> = {};

  for (const [fieldKey, bindingKey] of Object.entries(STORY_FIELD_TO_BINDING)) {
    const value = synced[fieldKey as keyof StoryDataRecord];
    if (value === undefined || value === null) continue;

    if (typeof value === "boolean") {
      bindings[bindingKey] = value ? "true" : "false";
      continue;
    }

    const str = String(value).trim();
    if (!str) continue;

    bindings[bindingKey] = str;

    const aliases = STORY_BINDING_ALIASES[bindingKey];
    if (aliases) {
      for (const alias of aliases) {
        bindings[alias] = str;
      }
    }
  }

  // Legacy compatibility — keep media keys distinct (do not clobber image).
  if (bindings.subheadline) bindings.subtitle = bindings.subheadline;
  if (bindings.main_video) bindings.video = bindings.main_video;
  if (bindings.main_image) bindings.image = bindings.main_image;
  if (bindings.reporter_photo) {
    bindings.reporter_image = bindings.reporter_photo;
    // Only fall back to image when no main_image is set.
    if (!bindings.main_image) bindings.image = bindings.reporter_photo;
  }
  if (bindings.logo) bindings.channel_logo = bindings.logo;
  if (bindings.voice_over) bindings.voice = bindings.voice_over;
  if (bindings.background_music) bindings.music = bindings.background_music;
  if (bindings.bible_verse) bindings.verse = bindings.bible_verse;
  if (bindings.verse_reference) bindings.reference = bindings.verse_reference;
  if (bindings.quote) bindings.author = bindings.quote;
  // Feature 043 text-binding aliases (Story Summary / AI Output / story).
  if (bindings.summary) {
    bindings.story = bindings.summary;
    bindings.story_summary = bindings.summary;
    if (!bindings.ai_output) bindings.ai_output = bindings.summary;
  }

  return bindings;
}

/**
 * Merge Story SSOT into bindings.
 * Order: theme defaults → existing scene bindings → Story form (wins).
 */
export function mergeStoryDataBindings(
  data: StoryDataRecord,
  existing?: Record<string, string>,
): Record<string, string> {
  const base = { ...buildDefaultBindings(), ...existing };
  const fromForm = storyDataToBindings(data);
  const merged = { ...base };

  for (const [key, value] of Object.entries(fromForm)) {
    if (value !== undefined && value !== "") merged[key] = value;
    if (value === "false") merged[key] = value;
  }

  // Empty story media fields must clear stale demo/previous bindings.
  // Otherwise a new background image never replaces demo background_video.
  const clearable = [
    "background_video",
    "background_image",
    "main_video",
    "main_image",
    "secondary_video",
  ] as const;
  for (const field of clearable) {
    const raw = data[field];
    if (typeof raw === "string" && raw.trim() === "") {
      delete merged[field];
      if (field === "main_video") delete merged.video;
      if (field === "main_image") {
        // Only drop `image` when it was an alias of main_image.
        if (!String(data.reporter_photo ?? "").trim()) delete merged.image;
      }
      if (field === "background_music") delete merged.music;
    }
  }

  return merged;
}

export function bindingsToStoryData(
  bindings: Record<string, string>,
  fallback?: StoryDataRecord,
): StoryDataRecord {
  const base = fallback ?? ({} as StoryDataRecord);

  for (const [fieldKey, bindingKey] of Object.entries(STORY_FIELD_TO_BINDING)) {
    const aliases = STORY_BINDING_ALIASES[bindingKey] ?? [bindingKey];
    for (const alias of aliases) {
      const value = bindings[alias];
      if (value != null && value !== "") {
        const field = fieldKey as keyof StoryDataRecord;
        if (
          field === "breaking_news" ||
          field === "live" ||
          field === "grid_visibility" ||
          field === "video_mask" ||
          field === "video_top_bar_visible" ||
          field === "video_bottom_bar_visible"
        ) {
          (base as Record<string, unknown>)[field] =
            value === "true" || value === "1";
        } else {
          (base as Record<string, unknown>)[field] = value;
        }
        break;
      }
    }
  }

  const hasSlots = SUB_HEADLINE_FIELD_KEYS.some((key) =>
    String(base[key] ?? "").trim(),
  );
  if (!hasSlots && base.summary) {
    const slots = parseSubHeadlineSlots(base.summary);
    base.sub_headline_1 = slots[0] ?? "";
    base.sub_headline_2 = slots[1] ?? "";
    base.sub_headline_3 = slots[2] ?? "";
    base.sub_headline_4 = slots[3] ?? "";
  }

  return syncSubHeadlineDerivedFields(base);
}

export function resolveBindingMediaUrl(
  bindings: Record<string, string>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = bindings[key];
    if (
      value &&
      value !== "#" &&
      !value.startsWith("{{") &&
      !isLibraryMediaRef(value)
    ) {
      return value;
    }
  }
  return null;
}
