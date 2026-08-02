import "server-only";

/**
 * Server-only AI credentials and defaults.
 * Never import this module from client components.
 */
export type AIServerEnv = {
  OPENAI_API_KEY: string | undefined;
  /** Resolved Gemini/Google key (never expose to client). */
  GEMINI_API_KEY: string | undefined;
  ANTHROPIC_API_KEY: string | undefined;
  OLLAMA_BASE_URL: string | undefined;
  DEFAULT_AI_PROVIDER: string | undefined;
  DEFAULT_GEMINI_MODEL: string;
  AI_REQUEST_TIMEOUT: number;
};

const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash";
const DEFAULT_TIMEOUT_MS = 60_000;

export function getAIServerEnv(): AIServerEnv {
  const timeoutRaw = process.env.AI_REQUEST_TIMEOUT?.trim();
  const timeoutParsed = timeoutRaw ? Number(timeoutRaw) : NaN;

  return {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY?.trim() || undefined,
    GEMINI_API_KEY:
      process.env.GOOGLE_API_KEY?.trim() ||
      process.env.GEMINI_API_KEY?.trim() ||
      process.env.GOOGLE_AI_API_KEY?.trim() ||
      undefined,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY?.trim() || undefined,
    OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL?.trim() || undefined,
    DEFAULT_AI_PROVIDER: process.env.DEFAULT_AI_PROVIDER?.trim() || undefined,
    DEFAULT_GEMINI_MODEL:
      process.env.DEFAULT_GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL,
    AI_REQUEST_TIMEOUT:
      Number.isFinite(timeoutParsed) && timeoutParsed >= 1_000
        ? Math.min(timeoutParsed, 600_000)
        : DEFAULT_TIMEOUT_MS,
  };
}

export function getProviderKeyPresence() {
  const env = getAIServerEnv();
  return {
    openai: {
      configured: Boolean(env.OPENAI_API_KEY),
      envVar: "OPENAI_API_KEY",
    },
    gemini: {
      configured: Boolean(env.GEMINI_API_KEY),
      envVar: "GOOGLE_API_KEY",
    },
    claude: {
      configured: Boolean(env.ANTHROPIC_API_KEY),
      envVar: "ANTHROPIC_API_KEY",
    },
    ollama: {
      configured: Boolean(env.OLLAMA_BASE_URL),
      envVar: "OLLAMA_BASE_URL",
    },
  } as const;
}

export function getDefaultGeminiModel(): string {
  return getAIServerEnv().DEFAULT_GEMINI_MODEL;
}

export function getDefaultAIRequestTimeoutMs(): number {
  return getAIServerEnv().AI_REQUEST_TIMEOUT;
}
