import type { StoryDataRecord } from "@/features/story-production/types/story-data.types";
import type { TextBindingOption } from "@/features/scene-composer/lib/text-layer/types";

/** Story keys a Text Layer can bind to (Feature 043). */
export const TEXT_LAYER_BINDING_KEYS: TextBindingOption[] = [
  { key: "headline", label: "Headline", storyField: "headline" },
  { key: "subheadline", label: "Subheadline", storyField: "subheadline" },
  { key: "ticker", label: "Ticker", storyField: "ticker" },
  { key: "summary", label: "Story Summary", storyField: "summary" },
  { key: "story", label: "Story Summary", storyField: "summary" },
  { key: "ai_output", label: "AI Output", storyField: "summary" },
  { key: "reporter", label: "Reporter", storyField: "reporter_name" },
  { key: "location", label: "Location", storyField: "location" },
  { key: "date", label: "Date", storyField: "date" },
  { key: "time", label: "Time", storyField: "time" },
  { key: "quote", label: "Quote", storyField: "quote" },
  { key: "bible_verse", label: "Bible Verse", storyField: "bible_verse" },
];

/** `{{key}}` → key */
export function parseTextBindingToken(value: string | undefined): string | null {
  if (!value) return null;
  const match = /^\{\{\s*([\w.-]+)\s*\}\}$/.exec(value.trim());
  return match ? match[1] : null;
}

export function storyFieldForTextBinding(
  bindingKey: string,
): keyof StoryDataRecord | null {
  const hit = TEXT_LAYER_BINDING_KEYS.find((item) => item.key === bindingKey);
  return (hit?.storyField as keyof StoryDataRecord | undefined) ?? null;
}
