/**
 * AIProvider contract — re-exported for provider adapters.
 * Canonical definitions live in types/ai.ts.
 */

export type {
  AIProvider,
  AIProviderId,
  AIProviderError,
  GenerateTextInput,
  GenerateTextResult,
  StructuredOutputInput,
  StructuredOutputResult,
  StreamTextInput,
  StreamTextChunk,
  CostEstimateInput,
  CostEstimate,
  ProviderHealth,
} from "@/features/ai/types/ai";

export { AIProviderError as AIProviderErrorClass } from "@/features/ai/types/ai";
