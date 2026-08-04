/**
 * Keyword extract + query generation for Story Panel discovery.
 * Primary goal: find image / video for each Sub Headline.
 */

import type {
  AssetDiscoveryKind,
  AssetSearchQuery,
  StoryPanelDiscoveryContext,
} from "@/features/ai-asset-discovery/types/discovery.types";

const STOP = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "that",
  "this",
  "into",
  "over",
  "under",
  "about",
  "after",
  "before",
  "a",
  "an",
  "of",
  "to",
  "in",
  "on",
  "at",
  "by",
  "is",
  "are",
  "was",
  "were",
  "be",
  "or",
  "as",
  "it",
  "its",
]);

export type SubHeadlineMediaFilter = "both" | "image" | "video";

export function extractKeywords(context: StoryPanelDiscoveryContext): string[] {
  const bag = [
    context.sceneHeadline,
    context.storyHeadline,
    context.category,
    context.location,
    ...context.keywords,
    ...context.entities,
    context.bodyText ?? "",
  ]
    .join(" ")
    .toLowerCase();

  const tokens = bag
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 2 && !STOP.has(t));

  return [...new Set(tokens)].slice(0, 16);
}

function kindsForFilter(filter: SubHeadlineMediaFilter): AssetDiscoveryKind[] {
  if (filter === "video") return ["video"];
  if (filter === "image") {
    return ["image", "illustration", "infographic", "screenshot"];
  }
  return ["image", "video", "illustration"];
}

export function buildSearchQueries(input: {
  context: StoryPanelDiscoveryContext;
  keywords: string[];
  expandedKeywords?: string[];
  /** Default: both image and video for Sub Headline media. */
  mediaFilter?: SubHeadlineMediaFilter;
}): AssetSearchQuery[] {
  const {
    context,
    keywords,
    expandedKeywords = [],
    mediaFilter = "both",
  } = input;
  const merged = [...new Set([...keywords, ...expandedKeywords])].slice(0, 20);
  const primary = context.sceneHeadline.trim() || context.storyHeadline.trim();
  const kinds = kindsForFilter(mediaFilter);

  const queries: AssetSearchQuery[] = [];

  if (primary) {
    queries.push({
      text: primary,
      kinds,
      language: context.language,
    });
  }

  if (context.location && primary) {
    queries.push({
      text: `${primary} ${context.location}`,
      kinds,
      language: context.language,
    });
  }

  if (context.category) {
    queries.push({
      text: `${context.category} ${merged.slice(0, 4).join(" ")}`.trim(),
      kinds,
      language: context.language,
    });
  }

  if (merged.length) {
    queries.push({
      text: merged.slice(0, 6).join(" "),
      kinds,
      language: context.language,
    });
  }

  const seen = new Set<string>();
  return queries.filter((q) => {
    const key = q.text.toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function isSubHeadlineMediaKind(kind: string): boolean {
  return (
    kind === "video" ||
    kind === "image" ||
    kind === "illustration" ||
    kind === "infographic" ||
    kind === "screenshot"
  );
}
