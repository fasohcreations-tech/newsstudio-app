import "server-only";

import type { GoogleGenAI } from "@google/genai";

import { BaseAIProvider } from "@/features/ai/providers/base-provider";
import {
  createGeminiClient,
  getGeminiApiKey,
  mapGeminiError,
  withTimeout,
} from "@/features/ai/providers/gemini/gemini-client";
import {
  buildGeminiStructuredPrompt,
  buildGeminiTextContents,
} from "@/features/ai/providers/gemini/prompt-manager";
import { getDefaultGeminiModel } from "@/features/ai/lib/server-env";
import {
  AIProviderError,
  type AIProviderId,
  type CostEstimate,
  type CostEstimateInput,
  type GenerateImageInput,
  type GenerateImageResult,
  type GenerateTextInput,
  type GenerateTextResult,
  type ProviderHealth,
  type StreamTextChunk,
  type StreamTextInput,
  type StructuredOutputInput,
  type StructuredOutputResult,
} from "@/features/ai/types/ai";
import type { Json } from "@/shared/types/database.types";

/**
 * Live Google Gemini adapter.
 * All MediaOS modules must call this only through the AI Orchestrator.
 */
export class GeminiProvider extends BaseAIProvider {
  readonly id: AIProviderId = "gemini";
  readonly displayName = "Google Gemini";
  readonly defaultModel = getDefaultGeminiModel();

  protected isConfigured(): boolean {
    return Boolean(getGeminiApiKey());
  }

  private client(): GoogleGenAI {
    return createGeminiClient();
  }

  async generateImage(input: GenerateImageInput): Promise<GenerateImageResult> {
    this.assertConfigured();
    const model =
      input.model?.trim() ||
      process.env.DEFAULT_GEMINI_IMAGE_MODEL?.trim() ||
      "gemini-2.5-flash-image";
    const prompt = input.prompt?.trim();
    if (!prompt) {
      throw new AIProviderError("Prompt is required.", this.id, "provider_error");
    }

    const timeoutMs = 90_000;

    try {
      const response = await withTimeout(
        this.client().models.generateContent({
          model,
          contents: prompt,
          config: {
            responseModalities: ["TEXT", "IMAGE"],
          },
        }),
        timeoutMs,
        "Gemini generateImage",
      );

      const images: Array<{ url?: string; b64?: string }> = [];
      const parts =
        (
          response as {
            candidates?: Array<{
              content?: { parts?: Array<Record<string, unknown>> };
            }>;
          }
        ).candidates?.[0]?.content?.parts ?? [];

      for (const part of parts) {
        const inline =
          (part.inlineData as
            | { data?: string; mimeType?: string }
            | undefined) ??
          (part.inline_data as
            | { data?: string; mimeType?: string }
            | undefined);
        if (inline?.data) {
          images.push({ b64: inline.data });
        }
      }

      if (images.length === 0) {
        throw new AIProviderError(
          "Gemini returned no image data. Try a more visual prompt.",
          this.id,
          "provider_error",
        );
      }

      return {
        images: images.slice(0, input.n ?? 1),
        model,
        raw: sanitizeRaw(response),
      };
    } catch (error) {
      throw mapGeminiError(error);
    }
  }

  async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    this.assertConfigured();
    const model = input.model?.trim() || this.defaultModel;
    const { contents, systemInstruction } = buildGeminiTextContents(input);
    if (!contents) {
      throw new AIProviderError("Prompt is required.", this.id, "provider_error");
    }

    const timeoutMs = input.timeoutMs ?? 60_000;

    try {
      const response = await withTimeout(
        this.client().models.generateContent({
          model,
          contents,
          config: {
            temperature: input.temperature,
            topP: input.topP,
            topK: input.topK,
            maxOutputTokens: input.maxTokens,
            systemInstruction,
          },
        }),
        timeoutMs,
        "Gemini generateText",
      );

      const text = response.text?.trim() ?? "";
      if (!text) {
        throw new AIProviderError(
          "Gemini returned an empty response.",
          this.id,
          "provider_error",
        );
      }

      const tokensUsed = extractTokenCount(response);
      return {
        text,
        model,
        tokensUsed,
        finishReason: extractFinishReason(response),
        raw: sanitizeRaw(response),
      };
    } catch (error) {
      throw mapGeminiError(error);
    }
  }

  async generateStructuredOutput<T = unknown>(
    input: StructuredOutputInput,
  ): Promise<StructuredOutputResult<T>> {
    this.assertConfigured();
    const model = input.model?.trim() || this.defaultModel;
    const prompt = buildGeminiStructuredPrompt(input);
    const timeoutMs = input.timeoutMs ?? 60_000;

    try {
      const response = await withTimeout(
        this.client().models.generateContent({
          model,
          contents: prompt,
          config: {
            temperature: input.temperature ?? 0.2,
            topP: input.topP,
            topK: input.topK,
            maxOutputTokens: input.maxTokens,
            systemInstruction: input.systemPrompt,
            responseMimeType: "application/json",
          },
        }),
        timeoutMs,
        "Gemini generateStructuredOutput",
      );

      const text = response.text?.trim() ?? "";
      if (!text) {
        throw new AIProviderError(
          "Gemini returned empty structured output.",
          this.id,
          "provider_error",
        );
      }

      let data: T;
      try {
        data = JSON.parse(text) as T;
      } catch {
        throw new AIProviderError(
          "Gemini returned invalid JSON for structured output.",
          this.id,
          "provider_error",
        );
      }

      return {
        data,
        model,
        tokensUsed: extractTokenCount(response),
        raw: sanitizeRaw(response),
      };
    } catch (error) {
      throw mapGeminiError(error);
    }
  }

  async *streamText(input: StreamTextInput): AsyncIterable<StreamTextChunk> {
    this.assertConfigured();
    const model = input.model?.trim() || this.defaultModel;
    const { contents, systemInstruction } = buildGeminiTextContents(input);
    if (!contents) {
      yield { type: "error", error: "Prompt is required." };
      return;
    }

    try {
      const stream = await this.client().models.generateContentStream({
        model,
        contents,
        config: {
          temperature: input.temperature,
          topP: input.topP,
          topK: input.topK,
          maxOutputTokens: input.maxTokens,
          systemInstruction,
        },
      });

      for await (const chunk of stream) {
        const text = chunk.text;
        if (text) {
          yield { type: "delta", text };
        }
      }
      yield { type: "done" };
    } catch (error) {
      const mapped = mapGeminiError(error);
      yield { type: "error", error: mapped.message };
    }
  }

  async healthCheck(): Promise<ProviderHealth> {
    const checkedAt = new Date().toISOString();
    if (!this.isConfigured()) {
      return {
        providerId: this.id,
        status: "unconfigured",
        message:
          "Google Gemini credentials are not set. Add GOOGLE_API_KEY on the server.",
        checkedAt,
      };
    }

    const started = Date.now();
    try {
      await withTimeout(
        this.client().models.generateContent({
          model: this.defaultModel,
          contents: "Reply with OK.",
          config: {
            maxOutputTokens: 8,
            temperature: 0,
          },
        }),
        15_000,
        "Gemini healthCheck",
      );

      return {
        providerId: this.id,
        status: "healthy",
        message: `${this.displayName} reachable (${this.defaultModel}).`,
        checkedAt,
        latencyMs: Date.now() - started,
      };
    } catch (error) {
      const mapped = mapGeminiError(error);
      return {
        providerId: this.id,
        status: "error",
        message: mapped.message,
        checkedAt,
        latencyMs: Date.now() - started,
      };
    }
  }

  async estimateCost(input: CostEstimateInput): Promise<CostEstimate> {
    const model = input.model ?? this.defaultModel;
    if (input.modality === "image") {
      // Placeholder per-image estimate for Gemini image models.
      const perImage = model.toLowerCase().includes("pro") ? 0.04 : 0.02;
      const count = Math.max(1, Math.ceil(input.outputTokens / 1000) || 1);
      return {
        currency: "USD",
        estimatedCost: Number((perImage * count).toFixed(4)),
        breakdown: `Placeholder image estimate for ${model} (~$${perImage}/image)`,
      };
    }
    const rates = resolvePlaceholderRates(model);
    const estimatedCost =
      (input.inputTokens / 1_000_000) * rates.in +
      (input.outputTokens / 1_000_000) * rates.out;

    return {
      currency: "USD",
      estimatedCost: Number(estimatedCost.toFixed(6)),
      breakdown: `Placeholder estimate for ${model} (in $${rates.in}/1M, out $${rates.out}/1M)`,
    };
  }

  private assertConfigured() {
    if (!this.isConfigured()) {
      throw new AIProviderError(
        "Google Gemini API key is not configured.",
        this.id,
        "invalid_api_key",
      );
    }
  }
}

function resolvePlaceholderRates(model: string): { in: number; out: number } {
  const lower = model.toLowerCase();
  if (lower.includes("pro")) return { in: 1.25, out: 10 };
  if (lower.includes("flash")) return { in: 0.15, out: 0.6 };
  return { in: 0.15, out: 0.6 };
}

function extractTokenCount(response: {
  usageMetadata?: {
    totalTokenCount?: number;
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
}): number | undefined {
  const meta = response.usageMetadata;
  if (!meta) return undefined;
  if (typeof meta.totalTokenCount === "number") return meta.totalTokenCount;
  const prompt = meta.promptTokenCount ?? 0;
  const candidates = meta.candidatesTokenCount ?? 0;
  const sum = prompt + candidates;
  return sum > 0 ? sum : undefined;
}

function extractFinishReason(response: {
  candidates?: Array<{ finishReason?: string }>;
}): string | undefined {
  return response.candidates?.[0]?.finishReason;
}

function sanitizeRaw(response: unknown): Json {
  // Avoid persisting huge nested SDK objects; keep usage + finish only.
  const r = response as {
    usageMetadata?: Json;
    candidates?: Array<{ finishReason?: string }>;
  };
  return {
    usageMetadata: r.usageMetadata ?? null,
    finishReason: r.candidates?.[0]?.finishReason ?? null,
  };
}
