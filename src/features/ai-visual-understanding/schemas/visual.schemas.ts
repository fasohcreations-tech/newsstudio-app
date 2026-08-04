import { z } from "zod";

export const analyzeAssetSchema = z.object({
  mediaAssetId: z.string().uuid(),
  force: z.boolean().optional().default(false),
  durationMs: z.number().int().nonnegative().optional(),
});

export const recommendClipSchema = z.object({
  storyId: z.string().uuid(),
  panelIndex: z.number().int().min(0).max(15),
  mediaAssetId: z.string().uuid(),
  /** Prefer a different range than previous pending suggestions. */
  excludeSuggestionId: z.string().uuid().optional(),
  targetDurationMs: z.number().int().positive().optional(),
});

export const suggestionDecisionSchema = z.object({
  suggestionId: z.string().uuid(),
  /** Optional editor-adjusted IN/OUT before accept. */
  inPointMs: z.number().int().nonnegative().optional(),
  outPointMs: z.number().int().positive().optional(),
  clipName: z.string().trim().min(1).max(200).optional(),
  attachToStoryPanel: z.boolean().optional().default(true),
});

export type AnalyzeAssetInput = z.infer<typeof analyzeAssetSchema>;
export type RecommendClipInput = z.infer<typeof recommendClipSchema>;
export type SuggestionDecisionInput = z.infer<typeof suggestionDecisionSchema>;
