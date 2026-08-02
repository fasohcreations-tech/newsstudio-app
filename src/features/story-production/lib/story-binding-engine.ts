/**
 * Module 3.7 — Live Story Data Binding Engine.
 * Resolves {{tokens}} from Story SSOT into preview / layers / timeline metadata.
 */

import { resolveVariableTokens } from "@/features/motion-scene-engine/lib/variable-binding";
import {
  STORY_FIELD_TO_BINDING,
} from "@/features/story-production/constants/story-data.constants";
import {
  mergeStoryDataBindings,
  storyDataToBindings,
} from "@/features/story-production/lib/story-data-bindings";
import {
  STORY_ENGINE_VERSION,
  STORY_MODEL_FIELDS,
  type Story,
} from "@/features/story-production/lib/story.model";

/** Region key → primary Story binding token (without braces). */
export const REGION_STORY_BINDINGS: Record<
  string,
  {
    textToken?: string;
    mediaKeys?: string[];
    kind:
      | "text"
      | "video"
      | "image"
      | "ticker"
      | "clock"
      | "date"
      | "chrome";
  }
> = {
  headline: { textToken: "headline", kind: "text" },
  subheadline: { textToken: "subheadline", kind: "text" },
  ticker: { textToken: "ticker", kind: "ticker" },
  place: { textToken: "place", kind: "text" },
  "meta-info-bar": { textToken: "place", kind: "text" },
  clock: { textToken: "time", kind: "clock" },
  date: { textToken: "date", kind: "date" },
  "reporter-logo": {
    mediaKeys: ["reporter_photo", "logo", "channel_logo"],
    kind: "image",
  },
  "main-video": {
    mediaKeys: ["main_video", "video"],
    kind: "video",
  },
  "lower-info-panel": { textToken: "summary", kind: "chrome" },
  "optional-info": {
    textToken: "optional_info_text",
    mediaKeys: ["optional_info_image"],
    kind: "image",
  },
  "optional-info-2": {
    textToken: "optional_info_text",
    mediaKeys: ["optional_info_image"],
    kind: "image",
  },
  "optional-info-1": {
    textToken: "optional_info_text",
    mediaKeys: ["optional_info_image"],
    kind: "image",
  },
  "header-bar": { textToken: "organization", kind: "chrome" },
  "left-side-panel": { kind: "chrome" },
};

/** Skeleton content.text / bindings for a region. */
export function storyTokensForRegion(regionKey: string): {
  text: string;
  bindings: Record<string, string>;
} {
  const spec = REGION_STORY_BINDINGS[regionKey];
  if (!spec) {
    return { text: "", bindings: {} };
  }
  const bindings: Record<string, string> = {};
  let text = "";
  if (spec.textToken) {
    text = `{{${spec.textToken}}}`;
    bindings.text = text;
  }
  if (spec.mediaKeys?.[0]) {
    bindings.src = `{{${spec.mediaKeys[0]}}}`;
  }
  return { text, bindings };
}

export function formatSystemTime(now = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
}

export function formatSystemDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(now);
}

/** Overlay live system clock/date onto bindings (preview SSOT for clock layers). */
export function applySystemClockBindings(
  bindings: Record<string, string>,
  now = new Date(),
): Record<string, string> {
  return {
    ...bindings,
    time: formatSystemTime(now),
    date: formatSystemDate(now),
    system_clock: formatSystemTime(now),
    system_date: formatSystemDate(now),
  };
}

/**
 * Build reactive bindings from Story SSOT.
 * Form values win; existing scene bindings preserved; defaults only fill gaps.
 */
export function buildLiveStoryBindings(
  story: Story,
  existing?: Record<string, string>,
  options?: { systemClock?: boolean; now?: Date },
): Record<string, string> {
  let bindings = mergeStoryDataBindings(story, existing);
  if (options?.systemClock) {
    bindings = applySystemClockBindings(bindings, options.now);
  }
  return bindings;
}

export function resolveStoryText(
  template: string,
  bindings: Record<string, string>,
): string {
  return resolveVariableTokens(template, bindings);
}

export function isUnresolvedToken(value: string | null | undefined): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  return !trimmed || /^\{\{[a-z0-9_]+\}\}$/i.test(trimmed);
}

export function hasStoryContent(
  bindings: Record<string, string>,
  keys: string[],
): boolean {
  return keys.some((key) => {
    const value = bindings[key];
    return Boolean(value) && value !== "#" && !value.startsWith("{{");
  });
}

/** Active binding rows for developer debug. */
export function listActiveBindings(
  story: Story,
  bindings: Record<string, string>,
): Array<{ field: string; binding: string; value: string }> {
  return STORY_MODEL_FIELDS.map((field) => {
    const bindingKey =
      STORY_FIELD_TO_BINDING[field.key as keyof typeof STORY_FIELD_TO_BINDING] ??
      field.binding;
    const value = bindings[bindingKey] ?? "";
    return {
      field: field.label,
      binding: `{{${bindingKey}}}`,
      value: value.length > 80 ? `${value.slice(0, 77)}…` : value,
    };
  }).filter((row) => row.value.length > 0);
}

export function storyEngineMeta(story: Story) {
  return {
    story_data: story,
    story_data_version: "1.0",
    story_engine_version: STORY_ENGINE_VERSION,
  };
}

export { storyDataToBindings, STORY_ENGINE_VERSION };
