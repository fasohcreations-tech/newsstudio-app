import "server-only";

import { OpenAIProvider } from "@/features/ai/providers/openai";
import { GeminiProvider } from "@/features/ai/providers/gemini";
import { ClaudeProvider } from "@/features/ai/providers/claude";
import { OllamaProvider } from "@/features/ai/providers/ollama";
import type { AIProvider, AIProviderId } from "@/features/ai/types/ai";

const registry: Record<AIProviderId, AIProvider> = {
  openai: new OpenAIProvider(),
  gemini: new GeminiProvider(),
  claude: new ClaudeProvider(),
  ollama: new OllamaProvider(),
};

export function getAIProvider(id: AIProviderId): AIProvider {
  return registry[id];
}

export function listAIProviders(): AIProvider[] {
  return Object.values(registry);
}

export function isAIProviderId(value: string): value is AIProviderId {
  return value in registry;
}
