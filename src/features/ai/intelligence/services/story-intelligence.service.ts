import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { INTELLIGENCE_JOB_TYPES } from "@/features/ai/intelligence/constants/intelligence.constants";
import {
  clampConfidence,
  parseJsonObject,
} from "@/features/ai/intelligence/lib/parse-json-response";
import { createRecommendation } from "@/features/ai/intelligence/services/recommendation.service";
import type {
  AIRecommendation,
  IntelligenceServiceResult,
} from "@/features/ai/intelligence/types/intelligence.types";
import type { StoryIntelligenceCapability } from "@/features/ai/intelligence/constants/intelligence.constants";
import { generateText } from "@/features/ai/services/ai-orchestrator";

type Client = SupabaseClient;

type StoryContext = {
  organizationId: string;
  userId: string;
  storyId?: string | null;
  title?: string;
  body?: string;
  language?: string;
  targetLanguage?: string;
};

const CAPABILITY_PROMPTS: Record<
  StoryIntelligenceCapability,
  { type: string; jobType: string; instruction: string }
> = {
  headline: {
    type: "headline_improvement",
    jobType: INTELLIGENCE_JOB_TYPES.storyHeadline,
    instruction:
      "Improve the news headline. Return JSON: { suggestions: string[], confidence: number, rationale: string }",
  },
  subheadline: {
    type: "subheadline",
    jobType: INTELLIGENCE_JOB_TYPES.storySubheadline,
    instruction:
      "Generate 3 subheadline options. Return JSON: { suggestions: string[], confidence: number }",
  },
  summary: {
    type: "summary",
    jobType: INTELLIGENCE_JOB_TYPES.storySummary,
    instruction:
      "Write a concise news summary. Return JSON: { summary: string, bulletPoints: string[], confidence: number }",
  },
  translate: {
    type: "translation",
    jobType: INTELLIGENCE_JOB_TYPES.storyTranslate,
    instruction:
      "Translate the story text. Return JSON: { translatedText: string, detectedSourceLanguage: string, confidence: number }",
  },
  manglish: {
    type: "manglish_to_malayalam",
    jobType: INTELLIGENCE_JOB_TYPES.storyManglish,
    instruction:
      "Convert Manglish (Romanized Malayalam) to proper Malayalam script. Return JSON: { malayalamText: string, confidence: number }",
  },
  voice_to_text: {
    type: "voice_to_text",
    jobType: INTELLIGENCE_JOB_TYPES.voiceStt,
    instruction:
      "Treat the body as a transcript note and produce cleaned voice-to-text. Return JSON: { transcript: string, confidence: number }",
  },
  handwriting_to_text: {
    type: "handwriting_to_text",
    jobType: INTELLIGENCE_JOB_TYPES.storyGrammar,
    instruction:
      "Clean OCR/handwriting-derived text into readable copy. Return JSON: { text: string, confidence: number }",
  },
  seo: {
    type: "seo",
    jobType: INTELLIGENCE_JOB_TYPES.storySeo,
    instruction:
      "Suggest SEO title, meta description, and keywords. Return JSON: { seoTitle: string, metaDescription: string, keywords: string[], confidence: number }",
  },
  readability: {
    type: "readability",
    jobType: INTELLIGENCE_JOB_TYPES.storyReadability,
    instruction:
      "Analyze readability for broadcast/web. Return JSON: { score: number, gradeLevel: string, issues: string[], suggestions: string[], confidence: number }",
  },
  grammar: {
    type: "grammar",
    jobType: INTELLIGENCE_JOB_TYPES.storyGrammar,
    instruction:
      "Suggest grammar fixes without rewriting the whole story. Return JSON: { suggestions: Array<{ original: string, replacement: string, reason: string }>, confidence: number }",
  },
};

function heuristicPayload(
  capability: StoryIntelligenceCapability,
  ctx: StoryContext,
): Record<string, unknown> {
  const title = ctx.title?.trim() || "Untitled story";
  const body = ctx.body?.trim() || "";
  switch (capability) {
    case "headline":
      return {
        suggestions: [
          title,
          `${title}: What viewers need to know`,
          `Breaking — ${title}`,
        ],
        rationale: "Heuristic headline variants pending live model output.",
        confidence: 0.45,
      };
    case "subheadline":
      return {
        suggestions: [
          "Key developments and official statements",
          "Context, impact, and what happens next",
          "Local angles for evening bulletins",
        ],
        confidence: 0.4,
      };
    case "summary":
      return {
        summary: body.slice(0, 280) || `Summary pending for “${title}”.`,
        bulletPoints: ["Lead fact", "Stakeholder response", "Next steps"],
        confidence: 0.4,
      };
    case "seo":
      return {
        seoTitle: title.slice(0, 60),
        metaDescription: (body || title).slice(0, 155),
        keywords: title
          .toLowerCase()
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 6),
        confidence: 0.4,
      };
    case "readability":
      return {
        score: 68,
        gradeLevel: "Grade 8–9",
        issues: body.length > 1200 ? ["Long paragraphs"] : [],
        suggestions: ["Prefer short sentences for TV read"],
        confidence: 0.5,
      };
    case "grammar":
      return {
        suggestions: [],
        confidence: 0.35,
        note: "No heuristic grammar edits — run with a live provider for suggestions.",
      };
    case "translate":
      return {
        translatedText: body || title,
        detectedSourceLanguage: ctx.language ?? "en",
        targetLanguage: ctx.targetLanguage ?? "ml",
        confidence: 0.35,
      };
    case "manglish":
      return {
        malayalamText: body || title,
        confidence: 0.35,
        note: "Live Manglish conversion requires an enabled AI provider.",
      };
    default:
      return { text: body || title, confidence: 0.35 };
  }
}

/**
 * Story Intelligence — recommendations only; never writes story fields directly.
 */
export async function runStoryIntelligence(
  client: Client,
  capability: StoryIntelligenceCapability,
  ctx: StoryContext,
): Promise<IntelligenceServiceResult<AIRecommendation>> {
  const meta = CAPABILITY_PROMPTS[capability];
  const sourceText = [ctx.title, ctx.body].filter(Boolean).join("\n\n");

  const live = await generateText(client, {
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    storyId: ctx.storyId ?? undefined,
    jobType: meta.jobType,
    promptId: "intelligence.story",
    promptVariables: {
      instruction: meta.instruction,
      target_language: ctx.targetLanguage ?? ctx.language ?? "en",
      source_text: sourceText.slice(0, 12_000) || "(empty)",
    },
  });

  let payload = heuristicPayload(capability, ctx);
  let modelVersion: string | null = null;
  let confidence = clampConfidence(payload.confidence, 0.4);

  if (live.data?.text) {
    const parsed = parseJsonObject<Record<string, unknown>>(live.data.text);
    if (parsed) {
      payload = parsed;
      confidence = clampConfidence(parsed.confidence, 0.75);
      modelVersion = live.data.model;
    }
  }

  return createRecommendation(client, {
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    domain: "story",
    recommendationType: meta.type,
    title: `Story · ${capability.replaceAll("_", " ")}`,
    summary:
      typeof payload.rationale === "string"
        ? payload.rationale
        : typeof payload.summary === "string"
          ? payload.summary
          : "Review and accept to apply in the Story workspace.",
    payload: {
      ...payload,
      capability,
      liveModel: Boolean(live.data),
      orchestratorError: live.error,
    },
    confidence,
    modelVersion,
    aiJobId: live.jobId,
    storyId: ctx.storyId ?? null,
    metadata: { module: "6.0", capability },
  });
}
