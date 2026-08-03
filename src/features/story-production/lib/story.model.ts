/**
 * Module 3.7 — Central Story model (Single Source of Truth).
 * Story Data Form writes here; preview / timeline / inspector all read from it.
 */

import type { StoryDataRecord } from "@/features/story-production/types/story-data.types";

/** Canonical Story object — alias of the flat AI-ready record. */
export type Story = StoryDataRecord;

export const STORY_ENGINE_VERSION = "3.7";

/** Human-readable Story field catalog for bindings + debug. */
export const STORY_MODEL_FIELDS = [
  { key: "headline", binding: "headline", label: "Headline" },
  { key: "subheadline", binding: "subheadline", label: "Subheadline" },
  { key: "sub_headline_1", binding: "sub_headline_1", label: "Sub Headline 1" },
  { key: "sub_headline_2", binding: "sub_headline_2", label: "Sub Headline 2" },
  { key: "sub_headline_3", binding: "sub_headline_3", label: "Sub Headline 3" },
  { key: "sub_headline_4", binding: "sub_headline_4", label: "Sub Headline 4" },
  {
    key: "sub_headline_1_media",
    binding: "sub_headline_1_media",
    label: "Sub Headline 1 Media",
  },
  {
    key: "sub_headline_2_media",
    binding: "sub_headline_2_media",
    label: "Sub Headline 2 Media",
  },
  {
    key: "sub_headline_3_media",
    binding: "sub_headline_3_media",
    label: "Sub Headline 3 Media",
  },
  {
    key: "sub_headline_4_media",
    binding: "sub_headline_4_media",
    label: "Sub Headline 4 Media",
  },
  { key: "summary", binding: "summary", label: "Summary (joined slots)" },
  { key: "reporter_name", binding: "reporter", label: "Reporter" },
  { key: "reporter_photo", binding: "reporter_photo", label: "Reporter Photo" },
  { key: "location", binding: "location", label: "Location" },
  { key: "place", binding: "place", label: "Place" },
  { key: "category", binding: "category", label: "Category" },
  { key: "breaking_news", binding: "breaking_news", label: "Breaking" },
  { key: "live", binding: "live", label: "Live" },
  { key: "logo", binding: "logo", label: "Logo" },
  { key: "main_video", binding: "main_video", label: "Main Video" },
  { key: "secondary_video", binding: "secondary_video", label: "Secondary Video" },
  { key: "main_image", binding: "main_image", label: "Images" },
  { key: "gallery_images", binding: "gallery_images", label: "Gallery" },
  { key: "optional_info_image", binding: "optional_info_image", label: "Optional Info Image" },
  {
    key: "optional_info_image_3",
    binding: "optional_info_image_3",
    label: "Optional Info Image 3",
  },
  {
    key: "optional_info_transition_style",
    binding: "optional_info_transition_style",
    label: "Optional Info Transition Style",
  },
  {
    key: "optional_info_slide_interval_ms",
    binding: "optional_info_slide_interval_ms",
    label: "Optional Info Slide Interval",
  },
  {
    key: "optional_info_transition_ms",
    binding: "optional_info_transition_ms",
    label: "Optional Info Transition Duration",
  },
  {
    key: "optional_info_slide_index",
    binding: "optional_info_slide_index",
    label: "Optional Info Slide Index",
  },
  { key: "optional_info_text", binding: "optional_info_text", label: "Optional Info Text" },
  {
    key: "optional_info_text_3",
    binding: "optional_info_text_3",
    label: "Optional Info Text 3",
  },
  { key: "ticker", binding: "ticker", label: "Ticker" },
  { key: "quote", binding: "quote", label: "Quote" },
  { key: "bible_verse", binding: "bible_verse", label: "Bible Verse" },
  { key: "verse_reference", binding: "verse_reference", label: "Verse Reference" },
  { key: "voice_over", binding: "voice_over", label: "Voice Over" },
  { key: "background_music", binding: "background_music", label: "Music" },
  { key: "background_video", binding: "background_video", label: "Background Video" },
  { key: "time", binding: "time", label: "Clock" },
  { key: "date", binding: "date", label: "Date" },
  { key: "theme", binding: "theme", label: "Theme" },
] as const;

export type StoryModelFieldKey = (typeof STORY_MODEL_FIELDS)[number]["key"];
