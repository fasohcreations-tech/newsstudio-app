import "server-only";

import { BaseAIProvider } from "@/features/ai/providers/base-provider";
import { getAIServerEnv } from "@/features/ai/lib/server-env";
import type { AIProviderId } from "@/features/ai/types/ai";

export class OpenAIProvider extends BaseAIProvider {
  readonly id: AIProviderId = "openai";
  readonly displayName = "OpenAI";
  readonly defaultModel = "gpt-4o-mini";

  protected isConfigured(): boolean {
    return Boolean(getAIServerEnv().OPENAI_API_KEY);
  }
}
