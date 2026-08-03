import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  Database,
  StoryStatus,
  StoryVoiceStatus,
} from "@/shared/types/database.types";
import type { Story } from "@/features/newsroom/types/story.types";
import { getCurrentStoryScript } from "@/features/story-workspace/services/script.service";
import {
  DEFAULT_GEMINI_TTS_VOICE,
  DEFAULT_PITCH,
  DEFAULT_SPEAKING_RATE,
  DEFAULT_TTS_LANGUAGE,
  DEFAULT_TTS_PROVIDER,
  DEFAULT_TTS_VOICE,
  DEFAULT_VOLUME_GAIN_DB,
  findVoiceOption,
  type TtsLanguageCode,
  type TtsProvider,
} from "@/features/story-voice/constants/voice.constants";
import { synthesizeSpeech } from "@/features/story-voice/services/google-cloud-tts.service";
import { synthesizeGeminiSpeech } from "@/features/story-voice/services/gemini-tts.service";
import {
  createStoryVoiceSignedUrl,
  uploadStoryVoiceAudio,
} from "@/features/story-voice/services/voice-storage.service";
import { isGoogleCloudTtsConfigured } from "@/features/story-voice/lib/tts-env";
import { isGeminiTtsConfigured } from "@/features/story-voice/services/gemini-tts.service";

type Client = SupabaseClient<Database>;

export type StoryVoiceResult<T> = { data: T | null; error: string | null };

const APPROVABLE_STATUSES: StoryStatus[] = [
  "draft",
  "assigned",
  "in_progress",
  "review",
];

function normalizeScript(text: string): string {
  return text.replace(/\r\n/g, "\n").trim();
}

export async function approveStoryScript(
  client: Client,
  input: { storyId: string; userId: string },
): Promise<StoryVoiceResult<Story>> {
  const scriptResult = await getCurrentStoryScript(client, input.storyId);
  if (scriptResult.error) {
    return { data: null, error: scriptResult.error };
  }
  const plain = normalizeScript(scriptResult.script?.content_plain ?? "");
  if (!plain) {
    return {
      data: null,
      error: "Script is empty. Write the script before approving.",
    };
  }

  const { data: existing, error: loadError } = await client
    .from("stories")
    .select("*")
    .eq("id", input.storyId)
    .is("deleted_at", null)
    .maybeSingle();

  if (loadError || !existing) {
    return { data: null, error: loadError?.message ?? "Story not found." };
  }

  const previousApproved = normalizeScript(existing.approved_script ?? "");
  const scriptChanged =
    Boolean(previousApproved) && previousApproved !== plain;
  const hadVoice =
    existing.voice_status === "ready" ||
    existing.voice_status === "stale" ||
    Boolean(existing.voice_url);

  let nextVoiceStatus: StoryVoiceStatus = existing.voice_status ?? "none";
  if (scriptChanged && hadVoice) {
    nextVoiceStatus = "stale";
  } else if (nextVoiceStatus === "none") {
    nextVoiceStatus = "pending";
  }

  const patch: Database["public"]["Tables"]["stories"]["Update"] = {
    approved_script: plain,
    approved_by: input.userId,
    approved_at: new Date().toISOString(),
    updated_by: input.userId,
    voice_status: nextVoiceStatus,
    voice_error: null,
  };

  if (APPROVABLE_STATUSES.includes(existing.status)) {
    patch.status = "approved";
  }

  const { data, error } = await client
    .from("stories")
    .update(patch)
    .eq("id", input.storyId)
    .is("deleted_at", null)
    .select("*")
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? "Approve script failed." };
  }
  return { data: data as Story, error: null };
}

export async function markStoryVoiceStaleIfScriptDiverged(
  client: Client,
  input: { storyId: string; contentPlain: string; userId: string },
): Promise<void> {
  const { data: story } = await client
    .from("stories")
    .select("approved_script, voice_status, voice_url")
    .eq("id", input.storyId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!story?.approved_script) return;
  if (normalizeScript(story.approved_script) === normalizeScript(input.contentPlain)) {
    return;
  }
  if (story.voice_status === "none" || story.voice_status === "stale") return;

  await client
    .from("stories")
    .update({
      voice_status: "stale",
      updated_by: input.userId,
    })
    .eq("id", input.storyId)
    .is("deleted_at", null);
}

export type GenerateVoiceInput = {
  storyId: string;
  userId: string;
  provider?: TtsProvider;
  languageCode?: TtsLanguageCode;
  voiceName?: string;
  speakingRate?: number;
  pitch?: number;
  volumeGainDb?: number;
  stylePrompt?: string;
};

export type GenerateVoiceOutput = {
  story: Story;
  audioUrl: string;
  durationMs: number;
  voiceName: string;
  language: string;
  generationTimeMs: number;
  status: StoryVoiceStatus;
};

export async function generateStoryVoice(
  client: Client,
  input: GenerateVoiceInput,
): Promise<StoryVoiceResult<GenerateVoiceOutput>> {
  const voiceHint = input.voiceName
    ? findVoiceOption(input.voiceName)
    : undefined;
  const provider: TtsProvider =
    input.provider ?? voiceHint?.provider ?? DEFAULT_TTS_PROVIDER;

  if (provider === "gemini" && !isGeminiTtsConfigured()) {
    return {
      data: null,
      error:
        "Gemini TTS is not configured. Set GOOGLE_API_KEY (or GEMINI_API_KEY) in .env.local.",
    };
  }
  if (provider === "google-cloud" && !isGoogleCloudTtsConfigured()) {
    return {
      data: null,
      error:
        "Google Cloud TTS is not configured. Save credentials/google-cloud-tts.json and set GOOGLE_APPLICATION_CREDENTIALS.",
    };
  }

  const { data: story, error: loadError } = await client
    .from("stories")
    .select("*")
    .eq("id", input.storyId)
    .is("deleted_at", null)
    .maybeSingle();

  if (loadError || !story) {
    return { data: null, error: loadError?.message ?? "Story not found." };
  }

  const approved = normalizeScript(story.approved_script ?? "");
  if (!approved) {
    return {
      data: null,
      error: "Approve the script before generating voice.",
    };
  }

  await client
    .from("stories")
    .update({
      voice_status: "generating",
      voice_error: null,
      updated_by: input.userId,
    })
    .eq("id", input.storyId);

  try {
    const languageCode =
      input.languageCode ??
      (story.voice_language as TtsLanguageCode | null) ??
      DEFAULT_TTS_LANGUAGE;
    const voiceName =
      input.voiceName ??
      story.voice_name ??
      (provider === "gemini" ? DEFAULT_GEMINI_TTS_VOICE : DEFAULT_TTS_VOICE);
    const speakingRate =
      input.speakingRate ?? story.voice_speaking_rate ?? DEFAULT_SPEAKING_RATE;
    const pitch = input.pitch ?? story.voice_pitch ?? DEFAULT_PITCH;
    const volumeGainDb =
      input.volumeGainDb ?? story.voice_volume_gain_db ?? DEFAULT_VOLUME_GAIN_DB;

    const synthesized =
      provider === "gemini"
        ? await synthesizeGeminiSpeech({
            text: approved,
            voiceName,
            stylePrompt: input.stylePrompt,
          })
        : await synthesizeSpeech({
            text: approved,
            languageCode,
            voiceName,
            speakingRate: Number(speakingRate),
            pitch: Number(pitch),
            volumeGainDb: Number(volumeGainDb),
          });

    const uploaded = await uploadStoryVoiceAudio(client, {
      organizationId: story.organization_id,
      storyId: story.id,
      voiceName: synthesized.voiceName,
      audioBuffer: synthesized.audioBuffer,
      contentType: synthesized.mimeType,
    });

    if (uploaded.error) {
      throw new Error(uploaded.error);
    }

    const signed = uploaded.path
      ? await createStoryVoiceSignedUrl(client, uploaded.path)
      : { url: null, error: null };

    const audioUrl = signed.url ?? uploaded.publicUrl;
    if (!audioUrl) {
      throw new Error("Voice uploaded but no playable URL could be created.");
    }

    const storedLanguage =
      provider === "gemini"
        ? languageCode
        : synthesized.languageCode;

    const { data: updated, error: updateError } = await client
      .from("stories")
      .update({
        voice_status: "ready",
        voice_url: audioUrl,
        voice_storage_path: uploaded.path,
        voice_duration_ms: synthesized.durationMs,
        voice_name: synthesized.voiceName,
        voice_language: storedLanguage,
        voice_speaking_rate: Number(speakingRate),
        voice_pitch: Number(pitch),
        voice_volume_gain_db: Number(volumeGainDb),
        voice_generated_at: new Date().toISOString(),
        voice_error: null,
        updated_by: input.userId,
      })
      .eq("id", input.storyId)
      .select("*")
      .single();

    if (updateError || !updated) {
      throw new Error(updateError?.message ?? "Failed to save voice metadata.");
    }

    return {
      data: {
        story: updated as Story,
        audioUrl,
        durationMs: synthesized.durationMs,
        voiceName: synthesized.voiceName,
        language: storedLanguage,
        generationTimeMs: synthesized.generationTimeMs,
        status: "ready",
      },
      error: null,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Voice generation failed.";
    await client
      .from("stories")
      .update({
        voice_status: "failed",
        voice_error: message,
        updated_by: input.userId,
      })
      .eq("id", input.storyId);

    return { data: null, error: message };
  }
}

export async function getPlayableStoryVoiceUrl(
  client: Client,
  storyId: string,
): Promise<StoryVoiceResult<{ url: string; expiresInSeconds: number }>> {
  const { data: story, error } = await client
    .from("stories")
    .select("voice_url, voice_storage_path, voice_status")
    .eq("id", storyId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !story) {
    return { data: null, error: error?.message ?? "Story not found." };
  }

  if (story.voice_storage_path) {
    const signed = await createStoryVoiceSignedUrl(client, story.voice_storage_path);
    if (signed.url) {
      return { data: { url: signed.url, expiresInSeconds: 3600 }, error: null };
    }
  }

  if (story.voice_url) {
    return { data: { url: story.voice_url, expiresInSeconds: 3600 }, error: null };
  }

  return { data: null, error: "No voice audio is available for this story." };
}
