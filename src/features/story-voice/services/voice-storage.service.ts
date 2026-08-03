import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { TTS_AUDIO_BUCKET } from "@/features/story-voice/constants/voice.constants";
import type { Database } from "@/shared/types/database.types";

type Client = SupabaseClient<Database>;

export function buildStoryVoiceStoragePath(input: {
  organizationId: string;
  storyId: string;
  voiceName: string;
  extension?: "mp3" | "wav";
}): string {
  const safeVoice = input.voiceName.replace(/[^a-zA-Z0-9_-]+/g, "_");
  const ext = input.extension ?? "mp3";
  return `${input.organizationId}/${input.storyId}/voice/${Date.now()}-${safeVoice}.${ext}`;
}

export async function uploadStoryVoiceAudio(
  client: Client,
  input: {
    organizationId: string;
    storyId: string;
    voiceName: string;
    audioBuffer: Buffer;
    contentType?: string;
  },
): Promise<{ path: string; publicUrl: string | null; error: string | null }> {
  const contentType = input.contentType ?? "audio/mpeg";
  const extension = contentType.includes("wav") ? "wav" : "mp3";
  const path = buildStoryVoiceStoragePath({
    organizationId: input.organizationId,
    storyId: input.storyId,
    voiceName: input.voiceName,
    extension,
  });

  const { error } = await client.storage
    .from(TTS_AUDIO_BUCKET)
    .upload(path, input.audioBuffer, {
      contentType,
      upsert: false,
      cacheControl: "3600",
    });

  if (error) {
    return { path, publicUrl: null, error: error.message };
  }

  const { data } = client.storage.from(TTS_AUDIO_BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl ?? null, error: null };
}

export async function createStoryVoiceSignedUrl(
  client: Client,
  storagePath: string,
  expiresInSeconds = 60 * 60,
): Promise<{ url: string | null; error: string | null }> {
  const { data, error } = await client.storage
    .from(TTS_AUDIO_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error) return { url: null, error: error.message };
  return { url: data.signedUrl, error: null };
}
