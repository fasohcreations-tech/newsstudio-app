import "server-only";

import { createGeminiClient, getGeminiApiKey } from "@/features/ai/providers/gemini/gemini-client";
import { renderPrompt } from "@/features/ai/services/prompt-manager";
import {
  estimatePcmDurationMs,
  pcmToWav,
} from "@/features/story-voice/lib/pcm-to-wav";
import {
  DEFAULT_GEMINI_TTS_VOICE,
  GEMINI_TTS_VOICES,
} from "@/features/story-voice/constants/voice.constants";

export type GeminiSynthesizeInput = {
  text: string;
  voiceName: string;
  /** Optional director-style prompt prefix for delivery. */
  stylePrompt?: string;
};

export type GeminiSynthesizeResult = {
  audioBuffer: Buffer;
  mimeType: "audio/wav";
  durationMs: number;
  voiceName: string;
  languageCode: string;
  generationTimeMs: number;
  model: string;
};

const DEFAULT_GEMINI_TTS_MODEL = "gemini-2.5-flash-preview-tts";

export function isGeminiTtsConfigured(): boolean {
  return Boolean(getGeminiApiKey());
}

export function getGeminiTtsModel(): string {
  return (
    process.env.GEMINI_TTS_MODEL?.trim() || DEFAULT_GEMINI_TTS_MODEL
  );
}

function resolveGeminiVoice(voiceName: string): string {
  const match = GEMINI_TTS_VOICES.find((voice) => voice.name === voiceName);
  return match?.name ?? DEFAULT_GEMINI_TTS_VOICE;
}

function extractInlineAudio(response: unknown): {
  data: string;
  mimeType?: string;
} | null {
  const root = response as {
    candidates?: Array<{
      content?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> };
    }>;
  };
  const parts = root.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      return {
        data: part.inlineData.data,
        mimeType: part.inlineData.mimeType,
      };
    }
  }
  return null;
}

/**
 * Gemini TTS via @google/genai (uses GOOGLE_API_KEY / GEMINI_API_KEY).
 * Returns WAV so browsers can play without extra codecs.
 */
export async function synthesizeGeminiSpeech(
  input: GeminiSynthesizeInput,
): Promise<GeminiSynthesizeResult> {
  const text = input.text.trim();
  if (!text) {
    throw new Error("Cannot synthesize an empty script.");
  }
  if (text.length > 8000) {
    throw new Error(
      "Approved script is too long for Gemini TTS. Shorten the script and approve again.",
    );
  }

  if (!isGeminiTtsConfigured()) {
    throw new Error(
      "Gemini TTS is not configured. Set GOOGLE_API_KEY (or GEMINI_API_KEY) in .env.local.",
    );
  }

  const voiceName = resolveGeminiVoice(input.voiceName);
  const model = getGeminiTtsModel();
  const style = input.stylePrompt?.trim()
    ? renderPrompt("voice.gemini_style", {
        style_notes: input.stylePrompt.trim(),
      }).text
    : renderPrompt("voice.gemini_default_style", {}).text;
  const prompt = `${style}\n\n---\n\n${text}`;

  const client = createGeminiClient();
  const started = Date.now();

  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await client.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName,
              },
            },
          },
        },
      });

      const inline = extractInlineAudio(response);
      if (!inline?.data) {
        throw new Error("Gemini TTS returned no audio data.");
      }

      const pcm = Buffer.from(inline.data, "base64");
      const wav = pcmToWav(pcm, { sampleRate: 24_000, channels: 1, bitDepth: 16 });

      return {
        audioBuffer: wav,
        mimeType: "audio/wav",
        durationMs: estimatePcmDurationMs(pcm.length),
        voiceName,
        languageCode: "auto",
        generationTimeMs: Date.now() - started,
        model,
      };
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      // Preview models occasionally return 500 / empty audio — retry.
      if (
        attempt < 2 &&
        (message.includes("500") ||
          message.toLowerCase().includes("no audio") ||
          message.toLowerCase().includes("internal"))
      ) {
        await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
        continue;
      }
      break;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Gemini TTS failed.");
}

export function buildGeminiSampleText(voiceName: string, label?: string): string {
  const name = label ?? voiceName;
  return `This is the ${name} Gemini voice. MediaOS news sample. Hello, and welcome.`;
}
