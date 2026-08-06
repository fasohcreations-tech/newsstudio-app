import type {
  SmartBindingSource,
  SmartDataType,
  SmartMappingMode,
  SmartMappingTransition,
} from "@/features/scene-composer/lib/story-mapping/types";

export const SMART_DATA_TYPES: SmartDataType[] = [
  "text",
  "image",
  "video",
  "audio",
  "svg",
  "clock",
  "ticker",
  "logo",
  "advertisement",
  "ai_output",
  "story_metadata",
];

export const SMART_DATA_TYPE_LABELS: Record<SmartDataType, string> = {
  text: "Text",
  image: "Image",
  video: "Video",
  audio: "Audio",
  svg: "SVG",
  clock: "Clock",
  ticker: "Ticker",
  logo: "Logo",
  advertisement: "Advertisement",
  ai_output: "AI Output",
  story_metadata: "Story Metadata",
};

export const SMART_BINDING_SOURCES: SmartBindingSource[] = [
  "story",
  "story_headline",
  "story_summary",
  "reporter",
  "location",
  "date",
  "voice_over",
  "ticker",
  "current_sub_headline",
  "current_sub_headline_assets",
  "current_voice_segment",
  "organization",
  "static_value",
];

export const SMART_BINDING_SOURCE_LABELS: Record<SmartBindingSource, string> = {
  story: "Story",
  story_headline: "Story Headline",
  story_summary: "Story Summary",
  reporter: "Reporter",
  location: "Location",
  date: "Date",
  voice_over: "Voice Over",
  ticker: "Ticker",
  current_sub_headline: "Current Sub Headline",
  current_sub_headline_assets: "Current Sub Headline Assets",
  current_voice_segment: "Current Voice Segment",
  organization: "Organization",
  static_value: "Static Value",
};

export const SMART_MAPPING_MODES: SmartMappingMode[] = [
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

export const SMART_MAPPING_MODE_LABELS: Record<SmartMappingMode, string> = {
  single: "Single",
  first: "First",
  last: "Last",
  sequential: "Sequential",
  random: "Random",
  slideshow: "Slideshow",
  grid: "Grid",
  timeline: "Timeline",
  manual: "Manual",
};

export const SMART_MAPPING_TRANSITIONS: SmartMappingTransition[] = [
  "cut",
  "crossfade",
  "slide",
  "push",
  "zoom",
];

export const SMART_MAPPING_TRANSITION_LABELS: Record<
  SmartMappingTransition,
  string
> = {
  cut: "Cut",
  crossfade: "Cross Fade",
  slide: "Slide",
  push: "Push",
  zoom: "Zoom",
};
