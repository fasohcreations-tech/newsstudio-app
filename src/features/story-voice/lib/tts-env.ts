import "server-only";

import fs from "node:fs";
import path from "node:path";

/**
 * Google Cloud Text-to-Speech credentials (server-only).
 * Prefer GOOGLE_APPLICATION_CREDENTIALS pointing at a JSON key file.
 * Avoid multiline GOOGLE_CLOUD_TTS_CREDENTIALS in .env — dotenv truncates it.
 */
export type GoogleCloudTtsEnv = {
  credentialsJson: string | undefined;
  credentialsPath: string | undefined;
  projectId: string | undefined;
};

export function resolveTtsCredentialsPath(
  rawPath: string | undefined,
): string | undefined {
  if (!rawPath) return undefined;
  const trimmed = rawPath.trim();
  if (!trimmed) return undefined;
  return path.isAbsolute(trimmed)
    ? trimmed
    : path.resolve(process.cwd(), trimmed);
}

export function getGoogleCloudTtsEnv(): GoogleCloudTtsEnv {
  const credentialsPath = resolveTtsCredentialsPath(
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
  );

  return {
    credentialsJson:
      process.env.GOOGLE_CLOUD_TTS_CREDENTIALS?.trim() || undefined,
    credentialsPath,
    projectId: process.env.GOOGLE_CLOUD_PROJECT?.trim() || undefined,
  };
}

export function isGoogleCloudTtsConfigured(): boolean {
  const env = getGoogleCloudTtsEnv();
  if (env.credentialsPath) {
    return fs.existsSync(env.credentialsPath);
  }
  return Boolean(env.credentialsJson);
}

export function assertTtsCredentialsFile(credentialsPath: string): void {
  if (fs.existsSync(credentialsPath)) return;
  throw new Error(
    `TTS credentials file not found at:\n${credentialsPath}\n\nSave your Google service-account JSON as credentials/google-cloud-tts.json (project root), then restart npm run dev.`,
  );
}
