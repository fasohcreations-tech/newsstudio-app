import { z } from "zod";

import { AI_PROVIDER_IDS } from "@/features/ai/types/ai";

const providerToggleSchema = z.object({
  enabled: z.boolean(),
  preferredModel: z.string().min(1).max(120).optional(),
});

const productionSchema = z.object({
  stages: z.object({
    research: z.boolean(),
    editorial: z.boolean(),
    script: z.boolean(),
    translation: z.boolean(),
    voice: z.boolean(),
    timeline: z.boolean(),
    graphics: z.boolean(),
    publishing: z.boolean(),
  }),
  taskProviders: z
    .record(z.string(), z.enum(AI_PROVIDER_IDS))
    .optional()
    .default({}),
});

export const aiOrgSettingsSchema = z.object({
  defaultProvider: z.enum(AI_PROVIDER_IDS),
  preferredModel: z.string().min(1).max(120),
  temperature: z.number().min(0).max(2),
  topP: z.number().min(0).max(1),
  topK: z.number().int().min(1).max(100),
  maxTokens: z.number().int().min(64).max(128_000),
  timeoutMs: z.number().int().min(1_000).max(600_000),
  retryCount: z.number().int().min(0).max(5),
  providers: z.object({
    openai: providerToggleSchema,
    gemini: providerToggleSchema,
    claude: providerToggleSchema,
    ollama: providerToggleSchema,
  }),
  production: productionSchema.optional(),
});

export type AIOrgSettingsInput = z.infer<typeof aiOrgSettingsSchema>;
