import type { AIOrgSettings, AIProviderId } from "@/features/ai/types/ai";
import { AI_PROVIDER_IDS } from "@/features/ai/types/ai";
import { createDefaultAIProductionSettings } from "@/features/ai-production/constants/production.constants";

export const DEFAULT_PROVIDER_MODELS: Record<AIProviderId, string> = {
  openai: "gpt-4o-mini",
  gemini: "gemini-3.5-flash",
  claude: "claude-sonnet-4-20250514",
  ollama: "llama3.2",
};

function envDefaultProvider(): AIProviderId {
  const raw = process.env.DEFAULT_AI_PROVIDER?.trim().toLowerCase();
  if (raw && AI_PROVIDER_IDS.includes(raw as AIProviderId)) {
    return raw as AIProviderId;
  }
  return "gemini";
}

function envGeminiModel(): string {
  return process.env.DEFAULT_GEMINI_MODEL?.trim() || DEFAULT_PROVIDER_MODELS.gemini;
}

function envTimeoutMs(): number {
  const raw = process.env.AI_REQUEST_TIMEOUT?.trim();
  const n = raw ? Number(raw) : NaN;
  if (Number.isFinite(n) && n >= 1_000) return Math.min(n, 600_000);
  return 60_000;
}

export function createDefaultAIOrgSettings(): AIOrgSettings {
  const defaultProvider = envDefaultProvider();
  const geminiModel = envGeminiModel();

  const providers = Object.fromEntries(
    AI_PROVIDER_IDS.map((id) => [
      id,
      {
        enabled: id === defaultProvider || id === "gemini",
        preferredModel:
          id === "gemini" ? geminiModel : DEFAULT_PROVIDER_MODELS[id],
      },
    ]),
  ) as AIOrgSettings["providers"];

  return {
    defaultProvider,
    preferredModel:
      defaultProvider === "gemini"
        ? geminiModel
        : DEFAULT_PROVIDER_MODELS[defaultProvider],
    temperature: 0.7,
    topP: 0.95,
    topK: 40,
    maxTokens: 2048,
    timeoutMs: envTimeoutMs(),
    retryCount: 2,
    providers,
    production: createDefaultAIProductionSettings(),
  };
}
