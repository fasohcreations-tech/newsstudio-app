/**
 * Split an approved story into Story Panels for Scene Instance generation.
 *
 * Each panel owns: Subheadline, Media, Voice text, Duration weight, Order.
 * Story Headline is story-level identity only — never the on-screen headline.
 */

import {
  parseSubHeadlineMedia,
  parseSubHeadlineSlots,
  SUB_HEADLINE_MAX_CHARS,
  type SubHeadlineMediaRef,
} from "@/features/story-production/lib/sub-headlines";
import type { AnalyzedStoryPanel } from "@/features/story-scene-builder/types/scene-builder.types";

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length || 1;
}

function splitParagraphs(script: string): string[] {
  return script
    .split(/\n\s*\n+|\r\n\s*\r\n+/)
    .map((block) => block.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/** Derive a short panel subheadline from body text (never the story title). */
function derivePanelSubheadline(body: string, index: number): string {
  const cleaned = body.replace(/\s+/g, " ").trim();
  if (!cleaned) return `Panel ${String(index + 1).padStart(2, "0")}`;
  const sentence = cleaned.split(/(?<=[.!?।])\s+/)[0] ?? cleaned;
  return sentence.slice(0, SUB_HEADLINE_MAX_CHARS).trim();
}

export function analyzeApprovedScript(input: {
  title: string;
  summary?: string | null;
  approvedScript: string;
  subHeadlineMedia?: unknown;
}): AnalyzedStoryPanel[] {
  const storyHeadline = input.title.trim() || "Untitled story";
  const slots = parseSubHeadlineSlots(input.summary);
  const media = parseSubHeadlineMedia(input.subHeadlineMedia);
  const paragraphs = splitParagraphs(input.approvedScript);

  // Prefer Sub Headline slots (1–4) as Story Panels when present.
  const activeSlots = slots
    .map((text, index) => ({ text, index, media: media[index] }))
    .filter((row) => row.text.trim());

  if (activeSlots.length > 0) {
    return activeSlots.map((row, i) => {
      const body = paragraphs[i] ?? paragraphs[0] ?? row.text;
      const mediaRef = row.media ?? emptyMedia();
      return {
        index: i,
        label: `Scene ${String(i + 1).padStart(2, "0")}`,
        text: body,
        storyHeadline,
        /** Panel subheadline → becomes scene on-screen headline. */
        subheadline: row.text.trim(),
        bodyText: body,
        mediaKind: mediaRef.kind,
        mediaRef: mediaRef.ref,
        mediaCaption: mediaRef.caption,
        weight: wordCount(body),
      };
    });
  }

  // Fall back to paragraph panels (cap at 8). Subheadline from body — not story title.
  const blocks =
    paragraphs.length > 0
      ? paragraphs.slice(0, 8)
      : [input.approvedScript.trim() || storyHeadline];

  return blocks.map((body, i) => ({
    index: i,
    label: `Scene ${String(i + 1).padStart(2, "0")}`,
    text: body,
    storyHeadline,
    subheadline: derivePanelSubheadline(body, i),
    bodyText: body,
    mediaKind: "" as const,
    mediaRef: "",
    mediaCaption: "",
    weight: wordCount(body),
  }));
}

function emptyMedia(): SubHeadlineMediaRef {
  return { kind: "", ref: "", caption: "" };
}

/** @deprecated Use AnalyzedStoryPanel / analyzeApprovedScript */
export type AnalyzedStorySegment = AnalyzedStoryPanel;
