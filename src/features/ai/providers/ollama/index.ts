import "server-only";

import { BaseAIProvider } from "@/features/ai/providers/base-provider";
import { getAIServerEnv } from "@/features/ai/lib/server-env";
import type { AIProviderId } from "@/features/ai/types/ai";

export class OllamaProvider extends BaseAIProvider {
  readonly id: AIProviderId = "ollama";
  readonly displayName = "Ollama";
  readonly defaultModel = "llama3.2";

  protected isConfigured(): boolean {
    return Boolean(getAIServerEnv().OLLAMA_BASE_URL);
  }
}
