import type {
  AIProvider,
  AIProviderError,
  AIProviderId,
  CostEstimate,
  CostEstimateInput,
  GenerateImageInput,
  GenerateImageResult,
  GenerateTextInput,
  GenerateTextResult,
  ProviderHealth,
  StreamTextChunk,
  StreamTextInput,
  StructuredOutputInput,
  StructuredOutputResult,
} from "@/features/ai/types/ai";
import { AIProviderError as ProviderError } from "@/features/ai/types/ai";

/**
 * Shared stub behavior for Feature 005.
 * Real vendor SDKs will replace these methods in later sprints.
 */
export abstract class BaseAIProvider implements AIProvider {
  abstract readonly id: AIProviderId;
  abstract readonly displayName: string;
  abstract readonly defaultModel: string;

  /** Whether a server-side credential / endpoint is present (never expose the value). */
  protected abstract isConfigured(): boolean;

  protected notImplemented(method: string): never {
    throw new ProviderError(
      `${this.displayName} ${method} is not implemented yet. Use the AI Orchestrator framework only.`,
      this.id,
      "not_implemented",
    );
  }

  async generateText(_input: GenerateTextInput): Promise<GenerateTextResult> {
    this.notImplemented("generateText");
  }

  async generateStructuredOutput<T = unknown>(
    _input: StructuredOutputInput,
  ): Promise<StructuredOutputResult<T>> {
    this.notImplemented("generateStructuredOutput");
  }

  async generateImage(_input: GenerateImageInput): Promise<GenerateImageResult> {
    this.notImplemented("generateImage");
  }

  async *streamText(_input: StreamTextInput): AsyncIterable<StreamTextChunk> {
    this.notImplemented("streamText");
  }

  async healthCheck(): Promise<ProviderHealth> {
    const checkedAt = new Date().toISOString();
    if (!this.isConfigured()) {
      return {
        providerId: this.id,
        status: "unconfigured",
        message: `${this.displayName} credentials are not set in server environment.`,
        checkedAt,
      };
    }
    return {
      providerId: this.id,
      status: "healthy",
      message: `${this.displayName} credentials detected. Generation adapters are deferred.`,
      checkedAt,
      latencyMs: 0,
    };
  }

  async estimateCost(input: CostEstimateInput): Promise<CostEstimate> {
    // Placeholder rates — replaced when live billing metadata is wired.
    const rates: Record<string, { in: number; out: number }> = {
      default: { in: 0.00015 / 1000, out: 0.0006 / 1000 },
    };
    const rate = rates.default;
    const estimatedCost =
      input.inputTokens * rate.in + input.outputTokens * rate.out;
    return {
      currency: "USD",
      estimatedCost: Number(estimatedCost.toFixed(6)),
      breakdown: `Placeholder estimate for ${input.model ?? this.defaultModel}`,
    };
  }
}

export function isAIProviderError(error: unknown): error is AIProviderError {
  return error instanceof ProviderError;
}
