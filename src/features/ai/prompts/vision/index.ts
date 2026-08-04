import type { PromptTemplate } from "@/features/ai/types/ai";

export const visionAnalyzeVideoPrompt: PromptTemplate = {
  id: "vision.analyze_video",
  version: "1.0.0",
  category: "media",
  description:
    "Enrich video visual understanding metadata (scenes, keywords, detections)",
  variables: [
    "asset_name",
    "duration_ms",
    "source_provider",
    "mime_type",
    "seed_keywords",
    "heuristic_summary",
  ],
  systemTemplates: {
    en: `You are MediaOS AI Visual Understanding. Return only valid JSON. No markdown fences.
You analyze news footage metadata to propose editorial-useful structure. Prefer concrete visual nouns.`,
  },
  templates: {
    en: `Enrich this video analysis package for broadcast clipping.

Asset name: {{asset_name}}
Duration ms: {{duration_ms}}
Source: {{source_provider}}
MIME: {{mime_type}}
Seed keywords: {{seed_keywords}}
Heuristic summary: {{heuristic_summary}}

Return JSON:
{
  "summary": string,
  "transcript": string,
  "keywords": string[],
  "scenes": Array<{ "startMs": number, "endMs": number, "label": string, "confidence": number }>,
  "shots": Array<{ "startMs": number, "endMs": number, "label": string }>,
  "ocr": Array<{ "startMs": number, "endMs": number, "text": string }>,
  "faces": Array<{ "startMs": number, "endMs": number, "label": string, "confidence": number }>,
  "objects": Array<{ "startMs": number, "endMs": number, "label": string }>,
  "logos": Array<{ "startMs": number, "endMs": number, "label": string }>,
  "landmarks": Array<{ "startMs": number, "endMs": number, "label": string }>,
  "locations": Array<{ "startMs": number, "endMs": number, "label": string }>,
  "actions": Array<{ "startMs": number, "endMs": number, "label": string }>,
  "confidence": number
}

Rules:
- Stay within 0..duration_ms
- Prefer 3–8 scenes
- Keywords: max 20 concrete editorial terms
- If unsure, keep arrays short rather than inventing celebrities
- confidence 0..1`,
  },
};

export const visionRecommendClipPrompt: PromptTemplate = {
  id: "vision.recommend_clip",
  version: "1.0.0",
  category: "media",
  description: "Recommend IN/OUT for a Story Panel from analyzed video segments",
  variables: [
    "story_headline",
    "scene_headline",
    "category",
    "keywords",
    "voice_duration_ms",
    "duration_ms",
    "top_segments_json",
    "transcript_excerpt",
  ],
  systemTemplates: {
    en: `You are MediaOS editorial clip assistant. Return only valid JSON. No markdown fences.
Recommend the best continuous clip for the Story Panel. Editors will review before saving.`,
  },
  templates: {
    en: `Recommend IN/OUT points for this Story Panel.

Story headline: {{story_headline}}
Scene headline: {{scene_headline}}
Category: {{category}}
Keywords: {{keywords}}
Target voice duration ms (optional): {{voice_duration_ms}}
Video duration ms: {{duration_ms}}
Top candidate segments JSON: {{top_segments_json}}
Transcript excerpt: {{transcript_excerpt}}

Return JSON:
{
  "suggestedInMs": number,
  "suggestedOutMs": number,
  "confidence": number,
  "reason": string
}

Rules:
- out > in, both within 0..duration_ms
- Prefer duration near voice_duration_ms when provided (±20%), else 4–12 seconds
- Reason: one short editorial sentence
- Prefer segments that match scene headline meaning`,
  },
};
