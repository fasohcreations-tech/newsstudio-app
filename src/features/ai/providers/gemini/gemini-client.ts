import "server-only";

import { GoogleGenAI } from "@google/genai";

import { getAIServerEnv } from "@/features/ai/lib/server-env";
import { AIProviderError } from "@/features/ai/types/ai";

let cachedClient: GoogleGenAI | null = null;
let cachedKey: string | null = null;

/**
 * Server-only Gemini client factory.
 * Uses the official @google/genai SDK. Never import from client code.
 */
export function getGeminiApiKey(): string | undefined {
  return getAIServerEnv().GEMINI_API_KEY;
}

export function createGeminiClient(apiKey?: string): GoogleGenAI {
  const key = apiKey ?? getGeminiApiKey();
  if (!key) {
    throw new AIProviderError(
      "Google Gemini API key is not configured. Set GOOGLE_API_KEY (or GEMINI_API_KEY) on the server.",
      "gemini",
      "invalid_api_key",
    );
  }

  if (cachedClient && cachedKey === key) {
    return cachedClient;
  }

  cachedClient = new GoogleGenAI({ apiKey: key });
  cachedKey = key;
  return cachedClient;
}

export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label = "Gemini request",
): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return promise;
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(
        new AIProviderError(
          `${label} timed out after ${timeoutMs}ms.`,
          "gemini",
          "timeout",
        ),
      );
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

/** Flatten nested Google GenAI / fetch error payloads for classification. */
function flattenGeminiErrorMessage(error: unknown): string {
  if (error instanceof AIProviderError) return error.message;
  if (!(error instanceof Error) && typeof error !== "object") {
    return String(error ?? "Unknown Gemini provider error");
  }

  const parts: string[] = [];
  if (error instanceof Error && error.message) parts.push(error.message);

  const bag = error as Record<string, unknown>;
  const nested =
    (bag.error as Record<string, unknown> | undefined) ??
    (bag.response as Record<string, unknown> | undefined) ??
    bag;

  if (typeof nested?.message === "string") parts.push(nested.message);
  if (typeof nested?.status === "string") parts.push(nested.status);
  if (typeof nested?.statusText === "string") parts.push(nested.statusText);
  if (typeof nested?.code === "number" || typeof nested?.code === "string") {
    parts.push(String(nested.code));
  }

  const details = nested?.details;
  if (Array.isArray(details)) {
    try {
      parts.push(JSON.stringify(details));
    } catch {
      /* ignore */
    }
  }

  const cause = (error as { cause?: unknown }).cause;
  if (cause instanceof Error && cause.message) parts.push(cause.message);

  return parts.filter(Boolean).join(" | ") || "Unknown Gemini provider error";
}

export function mapGeminiError(error: unknown): AIProviderError {
  if (error instanceof AIProviderError) return error;

  const message = flattenGeminiErrorMessage(error);
  const lower = message.toLowerCase();

  if (
    lower.includes("api key") ||
    lower.includes("api_key") ||
    lower.includes("401") ||
    lower.includes("permission denied") ||
    lower.includes("unauthenticated")
  ) {
    return new AIProviderError(
      "Invalid or missing Google API key.",
      "gemini",
      "invalid_api_key",
    );
  }

  // Image / paid models often return 429 with free_tier quotaValue 0.
  const hardQuota =
    lower.includes("check your plan and billing") ||
    lower.includes("billing details") ||
    lower.includes("free_tier") ||
    lower.includes("quotavalue\":\"0\"") ||
    lower.includes('"quotavalue":"0"') ||
    lower.includes("quota value\": \"0\"") ||
    /quota(?:value)?["\s:=]+0\b/.test(lower);

  if (hardQuota) {
    return new AIProviderError(
      "Gemini image quota is unavailable on this API key. Enable billing on the Google AI / Cloud project (image models like gemini-3.1-flash-image are paid), then retry. See https://ai.google.dev/gemini-api/docs/rate-limits",
      "gemini",
      "quota_exhausted",
    );
  }

  if (
    lower.includes("429") ||
    lower.includes("rate") ||
    lower.includes("quota") ||
    lower.includes("resource_exhausted")
  ) {
    return new AIProviderError(
      "Gemini rate limit or daily quota exceeded. Wait a minute (RPD resets midnight Pacific) or check plan limits at https://ai.google.dev/gemini-api/docs/rate-limits",
      "gemini",
      "rate_limit",
    );
  }

  if (
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("deadline")
  ) {
    return new AIProviderError(message, "gemini", "timeout");
  }

  if (
    lower.includes("fetch failed") ||
    lower.includes("network") ||
    lower.includes("econnrefused") ||
    lower.includes("enotfound") ||
    lower.includes("socket")
  ) {
    return new AIProviderError(
      "Network error while contacting Gemini.",
      "gemini",
      "network",
    );
  }

  if (
    lower.includes("503") ||
    lower.includes("unavailable") ||
    lower.includes("offline")
  ) {
    return new AIProviderError(
      "Gemini provider appears offline or unavailable.",
      "gemini",
      "provider_offline",
    );
  }

  console.error("[GeminiClient] provider error", message);
  return new AIProviderError(message, "gemini", "provider_error");
}
