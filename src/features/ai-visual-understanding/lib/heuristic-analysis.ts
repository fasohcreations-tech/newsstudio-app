/**
 * Heuristic video structure when frame-level vision is unavailable.
 * Produces reusable scene/shot/keyframe scaffolds for semantic search.
 */

import { embedText } from "@/features/ai-visual-understanding/lib/embeddings";
import type {
  SegmentEmbeddingDraft,
  TimecodedEventDraft,
} from "@/features/ai-visual-understanding/types/visual.types";

export type HeuristicAnalysisInput = {
  name: string;
  mimeType: string;
  sourceProvider: string | null;
  externalUrl: string | null;
  durationMs: number;
  keywords?: string[];
};

export type HeuristicAnalysisResult = {
  transcript: string;
  keywords: string[];
  summary: string;
  events: TimecodedEventDraft[];
  segments: SegmentEmbeddingDraft[];
  semanticPayload: Record<string, unknown>;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function tokensFromName(name: string): string[] {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .split(/\s+/)
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 2)
    .slice(0, 12);
}

/**
 * Build scene boundaries (~8–20s), shot changes, keyframes, and segment embeddings.
 */
export function buildHeuristicAnalysis(
  input: HeuristicAnalysisInput,
): HeuristicAnalysisResult {
  const durationMs = Math.max(1000, input.durationMs || 60_000);
  const nameTokens = tokensFromName(input.name);
  const keywords = [
    ...new Set([...(input.keywords ?? []), ...nameTokens, "video", "footage"]),
  ].slice(0, 24);

  const targetSegMs = clamp(Math.round(durationMs / 6), 4_000, 20_000);
  const segmentCount = Math.max(1, Math.ceil(durationMs / targetSegMs));

  const events: TimecodedEventDraft[] = [];
  const segments: SegmentEmbeddingDraft[] = [];

  for (let i = 0; i < segmentCount; i += 1) {
    const startMs = Math.round((i / segmentCount) * durationMs);
    const endMs =
      i === segmentCount - 1
        ? durationMs
        : Math.round(((i + 1) / segmentCount) * durationMs);
    const mid = Math.round((startMs + endMs) / 2);
    const label = `Scene ${i + 1}`;
    const text = [
      label,
      input.name,
      ...keywords.slice(0, 6),
      input.sourceProvider ?? "",
    ]
      .filter(Boolean)
      .join(" ");

    events.push({
      kind: "scene_boundary",
      startMs,
      endMs,
      label,
      confidence: 0.55,
      payload: { index: i, heuristic: true },
    });
    events.push({
      kind: "shot_change",
      startMs,
      endMs: Math.min(endMs, startMs + 400),
      label: `Shot ${i + 1}`,
      confidence: 0.45,
      payload: { index: i, heuristic: true },
    });
    events.push({
      kind: "keyframe",
      startMs: mid,
      endMs: mid,
      label: `Keyframe ${i + 1}`,
      confidence: 0.5,
      payload: { index: i, heuristic: true },
    });
    events.push({
      kind: "keyword",
      startMs,
      endMs,
      label: keywords[i % keywords.length] ?? "footage",
      confidence: 0.4,
      payload: { keywords },
    });

    segments.push({
      segmentIndex: i,
      startMs,
      endMs,
      textContent: text,
      embedding: embedText(text),
    });
  }

  if (input.externalUrl?.includes("youtube")) {
    events.push({
      kind: "logo",
      startMs: 0,
      endMs: Math.min(3000, durationMs),
      label: "youtube",
      confidence: 0.35,
      payload: { provider: "youtube" },
    });
  }

  const transcript = [
    `Heuristic transcript for ${input.name}.`,
    `Duration ${Math.round(durationMs / 1000)}s.`,
    `Keywords: ${keywords.join(", ")}.`,
    "Frame-level speech/OCR/faces will enrich this package on reprocess when vision providers are enabled.",
  ].join(" ");

  const summary = `Visual package for “${input.name}” (${Math.round(durationMs / 1000)}s) with ${segmentCount} scene segments.`;

  return {
    transcript,
    keywords,
    summary,
    events,
    segments,
    semanticPayload: {
      mode: "heuristic",
      segmentCount,
      mimeType: input.mimeType,
      sourceProvider: input.sourceProvider,
      supports: {
        sceneBoundaries: true,
        shotChanges: true,
        keyframes: true,
        speechTranscript: false,
        ocr: false,
        faces: false,
        objects: false,
        logos: Boolean(input.externalUrl),
        landmarks: false,
        locations: false,
        actions: false,
        embeddings: true,
      },
    },
  };
}
