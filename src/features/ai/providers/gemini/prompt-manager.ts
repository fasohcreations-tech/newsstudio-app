import "server-only";

import type {
  GenerateTextInput,
  StructuredOutputInput,
} from "@/features/ai/types/ai";

/**
 * Gemini-specific prompt shaping (system instruction + user contents).
 * Shared Prompt Manager remains at services/prompt-manager.ts for org templates.
 */
export function buildGeminiTextContents(input: GenerateTextInput): {
  contents: string;
  systemInstruction?: string;
} {
  return {
    contents: input.prompt.trim(),
    systemInstruction: input.systemPrompt?.trim() || undefined,
  };
}

export function buildGeminiStructuredPrompt(
  input: StructuredOutputInput,
): string {
  const schemaHint = [
    `Return ONLY valid JSON matching schema "${input.schemaName}".`,
    input.schemaDescription
      ? `Schema description: ${input.schemaDescription}`
      : null,
    "Do not wrap the JSON in markdown fences.",
    "",
    input.prompt.trim(),
  ]
    .filter(Boolean)
    .join("\n");

  return schemaHint;
}
