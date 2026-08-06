/**
 * Feature 048 — Story Mapping Engine contracts for Smart Containers.
 * Scene Composer authors these contracts; it never binds containers to Story fields directly.
 */

export const SMART_MAPPING_CONTENT_KEY = "smart_mapping";

export type SmartDataType =
  | "text"
  | "image"
  | "video"
  | "audio"
  | "svg"
  | "clock"
  | "ticker"
  | "logo"
  | "advertisement"
  | "ai_output"
  | "story_metadata";

export type SmartBindingSource =
  | "story"
  | "story_headline"
  | "story_summary"
  | "reporter"
  | "location"
  | "date"
  | "voice_over"
  | "ticker"
  | "current_sub_headline"
  | "current_sub_headline_assets"
  | "current_voice_segment"
  | "organization"
  | "static_value";

export type SmartMappingMode =
  | "single"
  | "first"
  | "last"
  | "sequential"
  | "random"
  | "slideshow"
  | "grid"
  | "timeline"
  | "manual";

export type SmartMappingTransition =
  | "cut"
  | "crossfade"
  | "slide"
  | "push"
  | "zoom";

export type SmartDurationMode = "auto" | "manual";

export type SmartMappingConfig = {
  containerName: string;
  acceptedTypes: SmartDataType[];
  bindingSource: SmartBindingSource;
  mappingMode: SmartMappingMode;
  fallback: string;
  staticValue: string;
  durationMode: SmartDurationMode;
  durationMs: number;
  transition: SmartMappingTransition;
};

export type SmartMappingConfigPatch = Partial<{
  containerName: string;
  acceptedTypes: SmartDataType[];
  bindingSource: string;
  mappingMode: string;
  fallback: string;
  staticValue: string;
  durationMode: string;
  durationMs: number;
  transition: string;
}>;

export type SmartMappingCandidateKind =
  | "text"
  | "image"
  | "video"
  | "audio"
  | "svg"
  | "other";

/** One Story-derived value before Mapping Mode collapses it into pages. */
export type SmartMappingCandidate = {
  value: string;
  kind: SmartMappingCandidateKind;
  label?: string;
};

/** One internal page / slide after Mapping Mode. */
export type SmartMappingPage = {
  value: string;
  kind: SmartMappingCandidateKind;
  label?: string;
};

export type SmartMappingResolveContext = {
  /** Flat story bindings (token values). */
  bindings?: Record<string, string>;
  /** Organization display name / logo when source = organization. */
  organizationName?: string | null;
  organizationLogoUrl?: string | null;
};

export type SmartMappingResolveResult = {
  pages: SmartMappingPage[];
  /** Comma-separated refs for media_container.slides / __mc_* keys. */
  slidesRaw: string;
  /** Primary text when accepted types include text. */
  text: string;
  previewLabel: string;
  usedFallback: boolean;
  mapping: SmartMappingConfig;
};
