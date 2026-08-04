import "server-only";

/**
 * Server-only keys for web media search (Sub Headline Find image/video).
 */
export type WebMediaSearchEnv = {
  PEXELS_API_KEY: string | undefined;
  UNSPLASH_ACCESS_KEY: string | undefined;
  GOOGLE_CSE_API_KEY: string | undefined;
  GOOGLE_CSE_CX: string | undefined;
  /** YouTube Data API v3 (falls back to GOOGLE_API_KEY). */
  YOUTUBE_DATA_API_KEY: string | undefined;
};

export function getWebMediaSearchEnv(): WebMediaSearchEnv {
  // Keep CSE on the Cloud key only — AI Studio Gemini keys cannot call CSE.
  const cseKey = process.env.GOOGLE_CSE_API_KEY?.trim() || undefined;
  const youtubeKey =
    process.env.YOUTUBE_DATA_API_KEY?.trim() ||
    cseKey ||
    process.env.GOOGLE_API_KEY?.trim() ||
    undefined;

  return {
    PEXELS_API_KEY: process.env.PEXELS_API_KEY?.trim() || undefined,
    UNSPLASH_ACCESS_KEY: process.env.UNSPLASH_ACCESS_KEY?.trim() || undefined,
    GOOGLE_CSE_API_KEY: cseKey,
    GOOGLE_CSE_CX: process.env.GOOGLE_CSE_CX?.trim() || undefined,
    YOUTUBE_DATA_API_KEY: youtubeKey,
  };
}

export function hasWebMediaSearchConfigured(): boolean {
  const env = getWebMediaSearchEnv();
  return Boolean(
    env.PEXELS_API_KEY ||
      env.UNSPLASH_ACCESS_KEY ||
      env.YOUTUBE_DATA_API_KEY ||
      (env.GOOGLE_CSE_API_KEY && env.GOOGLE_CSE_CX),
  );
}
