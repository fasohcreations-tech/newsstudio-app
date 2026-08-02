import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/shared/types/database.types";
import {
  createDefaultAIOrgSettings,
  DEFAULT_PROVIDER_MODELS,
} from "@/features/ai/lib/defaults";
import {
  AI_PROVIDER_IDS,
  type AIOrgSettings,
  type AIOrgSettingsPatch,
  type AIProviderId,
  type AIProviderToggle,
} from "@/features/ai/types/ai";
import {
  AI_PRODUCTION_STAGES,
  AI_WORKFLOW_TASK_TYPES,
  createDefaultAIProductionSettings,
  type AIProductionSettings,
} from "@/features/ai-production/constants/production.constants";

type Client = SupabaseClient<Database>;

const SETTINGS_KEY = "ai";

/**
 * Persist AI Orchestrator preferences on organizations.settings.ai
 * (no schema migration required).
 */
export async function getAIOrgSettings(
  client: Client,
  organizationId: string,
): Promise<{ settings: AIOrgSettings; error: string | null }> {
  const { data, error } = await client
    .from("organizations")
    .select("settings")
    .eq("id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    return { settings: createDefaultAIOrgSettings(), error: error.message };
  }
  if (!data) {
    return {
      settings: createDefaultAIOrgSettings(),
      error: "Organization not found.",
    };
  }

  return {
    settings: parseAIOrgSettings(data.settings),
    error: null,
  };
}

export async function saveAIOrgSettings(
  client: Client,
  organizationId: string,
  patch: AIOrgSettingsPatch,
): Promise<{ settings: AIOrgSettings; error: string | null }> {
  const current = await getAIOrgSettings(client, organizationId);
  if (current.error && current.error !== "Organization not found.") {
    // continue with defaults if parse failed; still attempt write
  }

  const merged = mergeAIOrgSettings(current.settings, patch);

  const { data: org, error: loadError } = await client
    .from("organizations")
    .select("settings")
    .eq("id", organizationId)
    .single();

  if (loadError) {
    return { settings: current.settings, error: loadError.message };
  }

  const existing =
    org.settings && typeof org.settings === "object" && !Array.isArray(org.settings)
      ? (org.settings as Record<string, Json>)
      : {};

  const nextSettings: Json = {
    ...existing,
    [SETTINGS_KEY]: merged as unknown as Json,
  };

  const { error: updateError } = await client
    .from("organizations")
    .update({ settings: nextSettings })
    .eq("id", organizationId);

  if (updateError) {
    return { settings: current.settings, error: updateError.message };
  }

  return { settings: merged, error: null };
}

export function parseAIOrgSettings(raw: Json | null | undefined): AIOrgSettings {
  const defaults = createDefaultAIOrgSettings();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return defaults;

  const root = raw as Record<string, unknown>;
  const ai = root[SETTINGS_KEY];
  if (!ai || typeof ai !== "object" || Array.isArray(ai)) return defaults;

  const bag = ai as Record<string, unknown>;
  const defaultProvider = isProviderId(bag.defaultProvider)
    ? bag.defaultProvider
    : defaults.defaultProvider;

  const providers = { ...defaults.providers };
  if (bag.providers && typeof bag.providers === "object" && !Array.isArray(bag.providers)) {
    const src = bag.providers as Record<string, unknown>;
    for (const id of AI_PROVIDER_IDS) {
      const entry = src[id];
      if (entry && typeof entry === "object" && !Array.isArray(entry)) {
        const toggle = entry as Record<string, unknown>;
        providers[id] = {
          enabled:
            typeof toggle.enabled === "boolean"
              ? toggle.enabled
              : providers[id].enabled,
          preferredModel:
            typeof toggle.preferredModel === "string"
              ? toggle.preferredModel
              : providers[id].preferredModel ?? DEFAULT_PROVIDER_MODELS[id],
        };
      }
    }
  }

  return {
    defaultProvider,
    preferredModel:
      typeof bag.preferredModel === "string"
        ? bag.preferredModel
        : defaults.preferredModel,
    temperature: clampNumber(bag.temperature, 0, 2, defaults.temperature),
    topP: clampNumber(bag.topP, 0, 1, defaults.topP),
    topK: clampNumber(bag.topK, 1, 100, defaults.topK),
    maxTokens: clampNumber(bag.maxTokens, 64, 128_000, defaults.maxTokens),
    timeoutMs: clampNumber(bag.timeoutMs, 1_000, 600_000, defaults.timeoutMs),
    retryCount: clampNumber(bag.retryCount, 0, 5, defaults.retryCount),
    providers,
    production: parseProductionSettings(bag.production),
  };
}

export function mergeAIOrgSettings(
  current: AIOrgSettings,
  patch: AIOrgSettingsPatch,
): AIOrgSettings {
  const providers = { ...current.providers };
  if (patch.providers) {
    for (const id of AI_PROVIDER_IDS) {
      const p = patch.providers[id];
      if (!p) continue;
      providers[id] = {
        enabled: p.enabled ?? providers[id].enabled,
        preferredModel: p.preferredModel ?? providers[id].preferredModel,
      } satisfies AIProviderToggle;
    }
  }

  return {
    defaultProvider: patch.defaultProvider ?? current.defaultProvider,
    preferredModel: patch.preferredModel ?? current.preferredModel,
    temperature: patch.temperature ?? current.temperature,
    topP: patch.topP ?? current.topP,
    topK: patch.topK ?? current.topK,
    maxTokens: patch.maxTokens ?? current.maxTokens,
    timeoutMs: patch.timeoutMs ?? current.timeoutMs,
    retryCount: patch.retryCount ?? current.retryCount,
    providers,
    production: patch.production
      ? mergeProductionSettings(
          current.production ?? createDefaultAIProductionSettings(),
          patch.production,
        )
      : current.production ?? createDefaultAIProductionSettings(),
  };
}

function parseProductionSettings(raw: unknown): AIProductionSettings {
  const defaults = createDefaultAIProductionSettings();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return defaults;
  const bag = raw as Record<string, unknown>;
  const stages = { ...defaults.stages };
  if (bag.stages && typeof bag.stages === "object" && !Array.isArray(bag.stages)) {
    const src = bag.stages as Record<string, unknown>;
    for (const stage of AI_PRODUCTION_STAGES) {
      if (typeof src[stage] === "boolean") stages[stage] = src[stage];
    }
  }
  const taskProviders = { ...defaults.taskProviders };
  if (
    bag.taskProviders &&
    typeof bag.taskProviders === "object" &&
    !Array.isArray(bag.taskProviders)
  ) {
    const src = bag.taskProviders as Record<string, unknown>;
    for (const task of AI_WORKFLOW_TASK_TYPES) {
      if (isProviderId(src[task])) taskProviders[task] = src[task];
    }
  }
  return { stages, taskProviders };
}

function mergeProductionSettings(
  current: AIProductionSettings,
  patch: AIProductionSettings,
): AIProductionSettings {
  return {
    stages: { ...current.stages, ...patch.stages },
    taskProviders: { ...current.taskProviders, ...patch.taskProviders },
  };
}

function isProviderId(value: unknown): value is AIProviderId {
  return typeof value === "string" && AI_PROVIDER_IDS.includes(value as AIProviderId);
}

function clampNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}
