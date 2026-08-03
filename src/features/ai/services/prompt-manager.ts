import {
  AI_LOCALES,
  type AILocale,
  type PromptTemplate,
  type RenderedPrompt,
} from "@/features/ai/types/ai";
import { PROMPT_BY_ID, PROMPT_CATALOG } from "@/features/ai/prompts";

const VARIABLE_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

/**
 * PromptManager — centralized templates with variable interpolation
 * and English / Malayalam (future locales) support.
 */
export function listPromptTemplates(
  category?: PromptTemplate["category"],
): PromptTemplate[] {
  if (!category) return [...PROMPT_CATALOG];
  return PROMPT_CATALOG.filter((p) => p.category === category);
}

export function getPromptTemplate(promptId: string): PromptTemplate | null {
  return PROMPT_BY_ID[promptId] ?? null;
}

export function resolveLocale(
  requested: AILocale | undefined,
  fallback: AILocale = "en",
): AILocale {
  if (requested && AI_LOCALES.includes(requested)) return requested;
  return fallback;
}

function pickLocalizedBody(
  map: Partial<Record<AILocale, string>> | undefined,
  locale: AILocale,
): string | null {
  if (!map) return null;
  return map[locale] ?? map.en ?? Object.values(map).find(Boolean) ?? null;
}

function interpolate(
  body: string,
  variables: Record<string, string>,
): string {
  return body.replace(VARIABLE_PATTERN, (_, key: string) => {
    return variables[key] ?? "";
  });
}

export function renderPrompt(
  promptId: string,
  variables: Record<string, string> = {},
  locale: AILocale = "en",
): RenderedPrompt {
  const template = getPromptTemplate(promptId);
  if (!template) {
    throw new Error(`Unknown prompt template: ${promptId}`);
  }

  const resolvedLocale = resolveLocale(locale);
  const body = pickLocalizedBody(template.templates, resolvedLocale);

  if (!body) {
    throw new Error(`Prompt ${promptId} has no template body.`);
  }

  const missing = template.variables.filter(
    (key) => variables[key] === undefined,
  );
  if (missing.length > 0) {
    throw new Error(
      `Missing prompt variables for ${promptId}: ${missing.join(", ")}`,
    );
  }

  const text = interpolate(body, variables);
  const systemBody = pickLocalizedBody(
    template.systemTemplates,
    resolvedLocale,
  );

  return {
    promptId: template.id,
    promptVersion: template.version,
    locale: template.templates[resolvedLocale] ? resolvedLocale : "en",
    text,
    systemText: systemBody ? interpolate(systemBody, variables) : undefined,
  };
}

export function extractTemplateVariables(body: string): string[] {
  const keys = new Set<string>();
  for (const match of body.matchAll(VARIABLE_PATTERN)) {
    keys.add(match[1]);
  }
  return [...keys];
}
