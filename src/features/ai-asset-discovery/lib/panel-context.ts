/**
 * Build discovery context for each Story Panel from story + sub-headline slots.
 */

import { analyzeApprovedScript } from "@/features/story-scene-builder/lib/analyze-script";
import {
  parseSubHeadlineMedia,
  parseSubHeadlineSlots,
} from "@/features/story-production/lib/sub-headlines";
import type { StoryPanelDiscoveryContext } from "@/features/ai-asset-discovery/types/discovery.types";

export type StoryForDiscovery = {
  id: string;
  title: string;
  summary: string | null;
  category: string | null;
  language: string;
  approved_script: string | null;
  sub_headline_media?: unknown;
  created_at?: string;
  location?: string | null;
  keywords?: string | string[] | null;
  entities?: string | string[] | null;
};

function asStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[,;|]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

export function buildPanelDiscoveryContexts(
  story: StoryForDiscovery,
): StoryPanelDiscoveryContext[] {
  const slots = parseSubHeadlineSlots(story.summary);
  const media = parseSubHeadlineMedia(story.sub_headline_media);
  const panels = analyzeApprovedScript({
    title: story.title,
    summary: story.summary,
    approvedScript: story.approved_script ?? story.summary ?? "",
    subHeadlineMedia: story.sub_headline_media,
  });

  const keywords = asStringList(story.keywords);
  const entities = asStringList(story.entities);
  const location = (story.location ?? "").trim();
  const date = story.created_at
    ? new Date(story.created_at).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  if (panels.length === 0) {
    return [
      {
        panelIndex: 0,
        storyHeadline: story.title,
        sceneHeadline: story.title,
        category: story.category ?? "",
        location,
        keywords,
        entities,
        language: story.language || "en",
        date,
        bodyText: story.summary ?? "",
      },
    ];
  }

  return panels.map((panel) => {
    const caption = media[panel.index]?.caption?.trim() ?? "";
    const body = [panel.bodyText || panel.text, caption]
      .filter(Boolean)
      .join("\n");
    return {
      panelIndex: panel.index,
      storyHeadline: story.title,
      sceneHeadline: panel.subheadline || slots[panel.index] || story.title,
      category: story.category ?? "",
      location,
      keywords,
      entities,
      language: story.language || "en",
      date,
      bodyText: body,
    };
  });
}
