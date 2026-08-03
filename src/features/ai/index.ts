export * from "@/features/ai/types/ai";
export * from "@/features/ai/lib/defaults";
export * as PromptManager from "@/features/ai/services/prompt-manager";
export * as AIJobManager from "@/features/ai/services/ai-job-manager";
export * as AISettingsService from "@/features/ai/services/ai-settings.service";

/** Module 6.0 — Intelligence Platform (recommendations only). */
export * from "@/features/ai/intelligence";

/** Server-only orchestrator — import from services path in server code. */
export type { AIOrgSettingsInput } from "@/features/ai/schemas/ai-settings.schemas";
