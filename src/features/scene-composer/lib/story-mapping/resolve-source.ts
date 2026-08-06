/**
 * Binding Source → ordered candidates from Story data.
 */

import {
  collectSubHeadlineSlots,
  readSubHeadlineMediaFromStoryData,
} from "@/features/story-production/lib/sub-headlines";
import type { StoryDataRecord } from "@/features/story-production/types/story-data.types";
import type {
  SmartDataType,
  SmartMappingCandidate,
  SmartMappingCandidateKind,
  SmartMappingConfig,
  SmartMappingResolveContext,
} from "@/features/scene-composer/lib/story-mapping/types";

function field(
  story: StoryDataRecord,
  bindings: Record<string, string>,
  key: string,
): string {
  const fromBindings = String(bindings[key] ?? "").trim();
  if (fromBindings) return fromBindings;
  const raw = (story as Record<string, unknown>)[key];
  return typeof raw === "string" ? raw.trim() : "";
}

function looksLikeVideo(value: string): boolean {
  return /\.(mp4|webm|mov|m4v|mkv)(\?|#|$)/i.test(value) || value.includes("/video");
}

function looksLikeAudio(value: string): boolean {
  return /\.(mp3|wav|aac|m4a|ogg)(\?|#|$)/i.test(value);
}

function looksLikeSvg(value: string): boolean {
  return /\.svg(\?|#|$)/i.test(value);
}

function looksLikeImage(value: string): boolean {
  return /\.(png|jpe?g|gif|webp|avif|bmp)(\?|#|$)/i.test(value);
}

export function inferCandidateKind(value: string): SmartMappingCandidateKind {
  if (!value) return "other";
  if (looksLikeVideo(value)) return "video";
  if (looksLikeAudio(value)) return "audio";
  if (looksLikeSvg(value)) return "svg";
  if (looksLikeImage(value) || value.startsWith("library://") || value.startsWith("clip://") || /^https?:\/\//i.test(value)) {
    if (looksLikeVideo(value)) return "video";
    if (looksLikeAudio(value)) return "audio";
    if (looksLikeSvg(value)) return "svg";
    return "image";
  }
  return "text";
}

function candidate(
  value: string,
  kind?: SmartMappingCandidateKind,
  label?: string,
): SmartMappingCandidate | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return {
    value: trimmed,
    kind: kind ?? inferCandidateKind(trimmed),
    label,
  };
}

function acceptsMedia(types: SmartDataType[]): boolean {
  return types.some((t) =>
    t === "image" ||
    t === "video" ||
    t === "audio" ||
    t === "svg" ||
    t === "logo" ||
    t === "advertisement" ||
    t === "ai_output",
  );
}

function acceptsText(types: SmartDataType[]): boolean {
  return types.some((t) =>
    t === "text" ||
    t === "ticker" ||
    t === "clock" ||
    t === "story_metadata" ||
    t === "ai_output",
  );
}

function filterByAccepted(
  items: SmartMappingCandidate[],
  accepted: SmartDataType[],
): SmartMappingCandidate[] {
  return items.filter((item) => {
    if (item.kind === "text") return acceptsText(accepted);
    if (item.kind === "video") {
      return accepted.includes("video") || accepted.includes("ai_output");
    }
    if (item.kind === "audio") return accepted.includes("audio");
    if (item.kind === "svg") {
      return accepted.includes("svg") || accepted.includes("logo");
    }
    if (item.kind === "image") {
      return (
        accepted.includes("image") ||
        accepted.includes("logo") ||
        accepted.includes("advertisement") ||
        accepted.includes("svg") ||
        accepted.includes("ai_output")
      );
    }
    return acceptsMedia(accepted) || acceptsText(accepted);
  });
}

/**
 * Collect Story candidates for the container's Binding Source.
 * Does not apply Mapping Mode — that happens in apply-mode.
 */
export function resolveMappingSourceCandidates(
  story: StoryDataRecord,
  mapping: SmartMappingConfig,
  context: SmartMappingResolveContext = {},
): SmartMappingCandidate[] {
  const bindings = context.bindings ?? {};
  const accepted = mapping.acceptedTypes;
  const out: SmartMappingCandidate[] = [];

  const push = (
    value: string,
    kind?: SmartMappingCandidateKind,
    label?: string,
  ) => {
    const item = candidate(value, kind, label);
    if (item) out.push(item);
  };

  switch (mapping.bindingSource) {
    case "story":
    case "story_headline":
      push(
        field(story, bindings, "story_headline") ||
          field(story, bindings, "title") ||
          field(story, bindings, "headline") ||
          field(story, bindings, "panel_subheadline"),
        "text",
        "Headline",
      );
      break;
    case "story_summary":
      push(field(story, bindings, "summary"), "text", "Summary");
      if (!out.length) {
        push(field(story, bindings, "ai_output"), "text", "AI Output");
      }
      break;
    case "reporter":
      push(field(story, bindings, "reporter_name"), "text", "Reporter");
      if (acceptsMedia(accepted)) {
        push(field(story, bindings, "reporter_photo"), "image", "Reporter Photo");
      }
      break;
    case "location":
      push(
        field(story, bindings, "location") || field(story, bindings, "place"),
        "text",
        "Location",
      );
      break;
    case "date":
      push(field(story, bindings, "date"), "text", "Date");
      break;
    case "voice_over":
      push(field(story, bindings, "voice_over") || field(story, bindings, "voice"), "audio", "Voice Over");
      break;
    case "ticker":
      push(field(story, bindings, "ticker"), "text", "Ticker");
      break;
    case "current_sub_headline": {
      const slots = collectSubHeadlineSlots(story);
      const primary =
        field(story, bindings, "headline") ||
        field(story, bindings, "subheadline") ||
        field(story, bindings, "panel_subheadline") ||
        slots.find(Boolean) ||
        "";
      push(primary, "text", "Sub Headline");
      break;
    }
    case "current_sub_headline_assets": {
      const media = readSubHeadlineMediaFromStoryData(story);
      media.forEach((slot, index) => {
        if (slot.kind === "caption" && slot.caption) {
          push(slot.caption, "text", `Sub Headline ${index + 1} Caption`);
          return;
        }
        if (slot.ref) {
          const kind: SmartMappingCandidateKind =
            slot.kind === "video"
              ? "video"
              : slot.kind === "image"
                ? "image"
                : inferCandidateKind(slot.ref);
          push(slot.ref, kind, `Sub Headline ${index + 1}`);
        }
      });
      // Scene instances often flatten a single panel into main_video/main_image
      // instead of sub_headline_* slots. Fall back so slideshow/media mapping
      // still resolves for template-linked story scenes.
      if (out.length === 0) {
        const mainVideo = field(story, bindings, "main_video");
        const video = field(story, bindings, "video");
        const mainImage = field(story, bindings, "main_image");
        push(mainVideo || video, "video", "Main Video");
        push(mainImage, "image", "Main Image");
      }
      break;
    }
    case "current_voice_segment":
      push(
        field(story, bindings, "voice_over") ||
          field(story, bindings, "voice") ||
          field(story, bindings, "approved_script"),
        acceptsMedia(accepted) ? "audio" : "text",
        "Voice Segment",
      );
      break;
    case "organization":
      push(
        (context.organizationName || "").trim() ||
          field(story, bindings, "organization"),
        "text",
        "Organization",
      );
      if (acceptsMedia(accepted)) {
        push(
          (context.organizationLogoUrl || "").trim() ||
            field(story, bindings, "logo"),
          "image",
          "Organization Logo",
        );
      }
      break;
    case "static_value":
      push(mapping.staticValue, undefined, "Static");
      break;
    default:
      break;
  }

  return filterByAccepted(out, accepted);
}
