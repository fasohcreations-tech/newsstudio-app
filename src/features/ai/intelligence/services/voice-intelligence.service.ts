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
import { generateText } from "@/features/ai/services/ai-orchestrator";

type Client = SupabaseClient;

export type VoiceCapability =
  | "voice_to_text"
  | "text_to_speech"
  | "pronunciation"
  | "language_detection"
  | "subtitles";

type VoiceInput = {
  organizationId: string;
  userId: string;
  storyId?: string | null;
  text?: string;
  languageHint?: string;
  capability: VoiceCapability;
};

const VOICE_META: Record<
  VoiceCapability,
  { type: string; jobType: string; instruction: string }
> = {
  voice_to_text: {
    type: "voice_to_text",
    jobType: INTELLIGENCE_JOB_TYPES.voiceStt,
    instruction:
      "Produce a cleaned transcript. Return JSON: { transcript: string, confidence: number }",
  },
  text_to_speech: {
    type: "text_to_speech",
    jobType: INTELLIGENCE_JOB_TYPES.voiceTts,
    instruction:
      "Plan TTS delivery (do not claim audio was rendered). Return JSON: { ssmlHints: string, voiceStyle: string, estimatedDurationSec: number, confidence: number }",
  },
  pronunciation: {
    type: "pronunciation",
    jobType: INTELLIGENCE_JOB_TYPES.voicePronounce,
    instruction:
      "Suggest pronunciations for difficult names/terms. Return JSON: { items: Array<{ term: string, ipa?: string, hint: string }>, confidence: number }",
  },
  language_detection: {
    type: "language_detection",
    jobType: INTELLIGENCE_JOB_TYPES.voiceLanguage,
    instruction:
      "Detect language. Return JSON: { language: string, script: string, confidence: number }",
  },
  subtitles: {
    type: "subtitles",
    jobType: INTELLIGENCE_JOB_TYPES.voiceSubtitles,
    instruction:
      "Generate editable subtitle cues. Return JSON: { cues: Array<{ startMs: number, endMs: number, text: string }>, confidence: number }",
  },
};

/**
 * Voice Intelligence — STT/TTS/pronunciation/language/subtitles as recommendations.
 * Does not auto-write story voice tracks.
 */
export async function runVoiceIntelligence(
  client: Client,
  input: VoiceInput,
): Promise<IntelligenceServiceResult<AIRecommendation>> {
  const meta = VOICE_META[input.capability];
  const text = input.text?.trim() || "";

  const live = await generateText(client, {
    organizationId: input.organizationId,
    userId: input.userId,
    storyId: input.storyId ?? undefined,
    jobType: meta.jobType,
    promptId: "intelligence.voice",
    promptVariables: {
      instruction: meta.instruction,
      language_hint: input.languageHint ?? "auto",
      source_text: text.slice(0, 10_000) || "(empty)",
    },
  });

  let payload: Record<string, unknown> = {
    capability: input.capability,
    note: "Heuristic stub — enable an AI provider for richer voice assistance.",
    confidence: 0.35,
  };

  if (input.capability === "language_detection") {
    payload = {
      language: input.languageHint ?? (/[\u0D00-\u0D7F]/.test(text) ? "ml" : "en"),
      script: /[\u0D00-\u0D7F]/.test(text) ? "Malayalam" : "Latin",
      confidence: 0.55,
    };
  } else if (input.capability === "subtitles" && text) {
    const words = text.split(/\s+/).filter(Boolean);
    const cues = [];
    let start = 0;
    for (let i = 0; i < words.length; i += 8) {
      const chunk = words.slice(i, i + 8).join(" ");
      const end = start + Math.max(1500, chunk.length * 60);
      cues.push({ startMs: start, endMs: end, text: chunk });
      start = end;
    }
    payload = { cues, confidence: 0.45 };
  } else if (input.capability === "voice_to_text") {
    payload = { transcript: text, confidence: 0.4 };
  } else if (input.capability === "text_to_speech") {
    payload = {
      ssmlHints: text.slice(0, 400),
      voiceStyle: "neutral-news",
      estimatedDurationSec: Math.max(3, Math.round(text.split(/\s+/).length / 2.5)),
      confidence: 0.4,
    };
  } else if (input.capability === "pronunciation") {
    payload = { items: [], confidence: 0.35 };
  }

  let confidence = clampConfidence(payload.confidence, 0.4);
  let modelVersion: string | null = null;

  if (live.data?.text) {
    const parsed = parseJsonObject<Record<string, unknown>>(live.data.text);
    if (parsed) {
      payload = { ...parsed, capability: input.capability };
      confidence = clampConfidence(parsed.confidence, 0.75);
      modelVersion = live.data.model;
    }
  }

  return createRecommendation(client, {
    organizationId: input.organizationId,
    userId: input.userId,
    domain: "voice",
    recommendationType: meta.type,
    title: `Voice · ${input.capability.replaceAll("_", " ")}`,
    summary: "Voice assistance ready for explicit accept/reject.",
    payload: {
      ...payload,
      liveModel: Boolean(live.data),
      orchestratorError: live.error,
    },
    confidence,
    modelVersion,
    aiJobId: live.jobId,
    storyId: input.storyId ?? null,
    metadata: { module: "6.0", capability: input.capability },
  });
}
