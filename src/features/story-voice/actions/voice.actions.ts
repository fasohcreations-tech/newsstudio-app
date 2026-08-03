"use server";

import { revalidatePath } from "next/cache";
import { connection } from "next/server";
import { z } from "zod";

import { requireAuth } from "@/features/auth/guards/require-auth";
import { createClient } from "@/shared/lib/supabase/server";
import { getCurrentProfile } from "@/features/profile/services/profile.service";
import { resolveActiveMembership } from "@/features/organization/services/resolve-active-membership";
import { renderPrompt } from "@/features/ai/services/prompt-manager";
import {
  approveStoryScript,
  generateStoryVoice,
  getPlayableStoryVoiceUrl,
} from "@/features/story-voice/services/editorial-voice.service";
import type { Story } from "@/features/newsroom/types/story.types";
import type { GenerateVoiceOutput } from "@/features/story-voice/services/editorial-voice.service";
import {
  findVoiceOption,
  TTS_VOICES,
  type TtsProvider,
} from "@/features/story-voice/constants/voice.constants";
import {
  buildVoiceSampleText,
  synthesizeSpeech,
} from "@/features/story-voice/services/google-cloud-tts.service";
import {
  buildGeminiSampleText,
  synthesizeGeminiSpeech,
} from "@/features/story-voice/services/gemini-tts.service";
import { isGoogleCloudTtsConfigured } from "@/features/story-voice/lib/tts-env";
import { isGeminiTtsConfigured } from "@/features/story-voice/services/gemini-tts.service";

export type StoryVoiceActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

async function requireStoryVoiceContext(storyId: string) {
  const user = await requireAuth(`/newsroom/stories/${storyId}`);
  const supabase = await createClient();
  const { profile } = await getCurrentProfile(supabase, user.id);
  const { membership, error } = await resolveActiveMembership(
    supabase,
    user.id,
    profile?.email ?? user.email ?? "",
    profile?.full_name,
  );

  if (!membership) {
    return {
      user,
      supabase,
      membership: null as null,
      error: error ?? "Organization required",
    };
  }

  const { data: story, error: storyError } = await supabase
    .from("stories")
    .select("id, organization_id")
    .eq("id", storyId)
    .is("deleted_at", null)
    .maybeSingle();

  if (storyError || !story) {
    return {
      user,
      supabase,
      membership: null as null,
      error: storyError?.message ?? "Story not found",
    };
  }

  if (story.organization_id !== membership.organization.id) {
    return {
      user,
      supabase,
      membership: null as null,
      error: "Story belongs to another organization",
    };
  }

  return { user, supabase, membership, error: null as string | null };
}

function revalidateStory(storyId: string) {
  revalidatePath(`/newsroom/stories/${storyId}`);
  revalidatePath(`/newsroom/${storyId}/edit`);
  revalidatePath("/newsroom");
}

export async function approveScriptAction(
  storyId: string,
): Promise<StoryVoiceActionResult<Story>> {
  const parsed = z.string().uuid().safeParse(storyId);
  if (!parsed.success) return { success: false, error: "Invalid story id" };

  const ctx = await requireStoryVoiceContext(parsed.data);
  if (!ctx.membership) {
    return { success: false, error: ctx.error ?? "Unauthorized" };
  }

  const result = await approveStoryScript(ctx.supabase, {
    storyId: parsed.data,
    userId: ctx.user.id,
  });

  if (!result.data) {
    return { success: false, error: result.error ?? "Approve failed" };
  }

  revalidateStory(parsed.data);
  return { success: true, data: result.data };
}

const languageCodes = ["ml-IN", "en-US", "en-IN"] as const;
const providers = ["gemini", "google-cloud"] as const;

const generateSchema = z.object({
  storyId: z.string().uuid(),
  provider: z.enum(providers).optional(),
  languageCode: z.enum(languageCodes).optional(),
  voiceName: z.string().min(1).max(120).optional(),
  speakingRate: z.number().min(0.25).max(4).optional(),
  pitch: z.number().min(-20).max(20).optional(),
  volumeGainDb: z.number().min(-96).max(16).optional(),
  stylePrompt: z.string().max(500).optional(),
});

export async function generateStoryVoiceAction(
  raw: z.infer<typeof generateSchema>,
): Promise<StoryVoiceActionResult<GenerateVoiceOutput>> {
  const parsed = generateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  if (
    parsed.data.voiceName &&
    !TTS_VOICES.some((voice) => voice.name === parsed.data.voiceName)
  ) {
    return { success: false, error: "Unsupported voice selection." };
  }

  const ctx = await requireStoryVoiceContext(parsed.data.storyId);
  if (!ctx.membership) {
    return { success: false, error: ctx.error ?? "Unauthorized" };
  }

  const result = await generateStoryVoice(ctx.supabase, {
    storyId: parsed.data.storyId,
    userId: ctx.user.id,
    provider: parsed.data.provider,
    languageCode: parsed.data.languageCode,
    voiceName: parsed.data.voiceName,
    speakingRate: parsed.data.speakingRate,
    pitch: parsed.data.pitch,
    volumeGainDb: parsed.data.volumeGainDb,
    stylePrompt: parsed.data.stylePrompt,
  });

  if (!result.data) {
    return { success: false, error: result.error ?? "Voice generation failed" };
  }

  revalidateStory(parsed.data.storyId);
  return { success: true, data: result.data };
}

export async function regenerateStoryVoiceAction(
  raw: z.infer<typeof generateSchema>,
): Promise<StoryVoiceActionResult<GenerateVoiceOutput>> {
  return generateStoryVoiceAction(raw);
}

export async function getStoryVoiceSignedUrlAction(
  storyId: string,
): Promise<StoryVoiceActionResult<{ url: string; expiresInSeconds: number }>> {
  const parsed = z.string().uuid().safeParse(storyId);
  if (!parsed.success) return { success: false, error: "Invalid story id" };

  const ctx = await requireStoryVoiceContext(parsed.data);
  if (!ctx.membership) {
    return { success: false, error: ctx.error ?? "Unauthorized" };
  }

  const result = await getPlayableStoryVoiceUrl(ctx.supabase, parsed.data);
  if (!result.data) {
    return { success: false, error: result.error ?? "No voice URL" };
  }
  return { success: true, data: result.data };
}

const sampleSchema = z.object({
  provider: z.enum(providers).optional(),
  languageCode: z.enum(languageCodes).optional(),
  voiceName: z.string().min(1).max(120),
  speakingRate: z.number().min(0.25).max(4).optional(),
  pitch: z.number().min(-20).max(20).optional(),
  volumeGainDb: z.number().min(-96).max(16).optional(),
  sampleText: z.string().max(280).optional(),
});

/**
 * Audition a TTS voice with a short sample. Does not write to the story.
 */
export async function previewVoiceSampleAction(
  raw: z.infer<typeof sampleSchema>,
): Promise<
  StoryVoiceActionResult<{
    audioDataUrl: string;
    voiceName: string;
    languageCode: string;
    durationMs: number;
    provider: TtsProvider;
  }>
> {
  const parsed = sampleSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid sample input",
    };
  }

  const catalogVoice = findVoiceOption(parsed.data.voiceName);
  if (!catalogVoice) {
    return { success: false, error: "Unsupported voice selection." };
  }

  const provider: TtsProvider =
    parsed.data.provider ?? catalogVoice.provider;

  if (provider === "gemini" && !isGeminiTtsConfigured()) {
    return {
      success: false,
      error:
        "Gemini TTS is not configured. Set GOOGLE_API_KEY (or GEMINI_API_KEY) in .env.local.",
    };
  }
  if (provider === "google-cloud" && !isGoogleCloudTtsConfigured()) {
    return {
      success: false,
      error:
        "Google Cloud TTS is not configured. Save credentials/google-cloud-tts.json and restart the server.",
    };
  }

  await requireAuth("/newsroom");
  await connection();

  try {
    if (provider === "gemini") {
      const text =
        parsed.data.sampleText?.trim() ||
        buildGeminiSampleText(parsed.data.voiceName, catalogVoice.label);
      const synthesized = await synthesizeGeminiSpeech({
        text,
        voiceName: parsed.data.voiceName,
        stylePrompt: renderPrompt("voice.gemini_audition", {}).text,
      });
      const audioDataUrl = `data:audio/wav;base64,${synthesized.audioBuffer.toString("base64")}`;
      return {
        success: true,
        data: {
          audioDataUrl,
          voiceName: synthesized.voiceName,
          languageCode: synthesized.languageCode,
          durationMs: synthesized.durationMs,
          provider,
        },
      };
    }

    const languageCode =
      parsed.data.languageCode ??
      (catalogVoice.languageCode === "auto"
        ? "en-US"
        : catalogVoice.languageCode);
    const text =
      parsed.data.sampleText?.trim() ||
      buildVoiceSampleText({
        voiceName: parsed.data.voiceName,
        languageCode,
        label: catalogVoice.label,
      });

    const synthesized = await synthesizeSpeech({
      text,
      languageCode,
      voiceName: parsed.data.voiceName,
      speakingRate: 1,
      pitch: 0,
      volumeGainDb: 0,
    });

    if (synthesized.voiceName !== parsed.data.voiceName) {
      return {
        success: false,
        error: `Requested ${parsed.data.voiceName} but Google returned ${synthesized.voiceName}.`,
      };
    }

    const audioDataUrl = `data:audio/mpeg;base64,${synthesized.audioBuffer.toString("base64")}`;
    return {
      success: true,
      data: {
        audioDataUrl,
        voiceName: synthesized.voiceName,
        languageCode: synthesized.languageCode,
        durationMs: synthesized.durationMs,
        provider,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Voice sample preview failed.",
    };
  }
}
