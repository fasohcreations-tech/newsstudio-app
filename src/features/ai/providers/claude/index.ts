import "server-only";

import { BaseAIProvider } from "@/features/ai/providers/base-provider";
import { getAIServerEnv } from "@/features/ai/lib/server-env";
import type { AIProviderId } from "@/features/ai/types/ai";

export class ClaudeProvider extends BaseAIProvider {
  readonly id: AIProviderId = "claude";
  readonly displayName = "Anthropic Claude";
  readonly defaultModel = "claude-sonnet-4-20250514";

  protected isConfigured(): boolean {
    return Boolean(getAIServerEnv().ANTHROPIC_API_KEY);
  }
}
