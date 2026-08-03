import "server-only";

import { TextToSpeechClient } from "@google-cloud/text-to-speech";

import {
  DEFAULT_PITCH,
  DEFAULT_SPEAKING_RATE,
  DEFAULT_VOLUME_GAIN_DB,
  CLOUD_TTS_VOICES,
  type TtsLanguageCode,
} from "@/features/story-voice/constants/voice.constants";
import {
  assertTtsCredentialsFile,
  getGoogleCloudTtsEnv,
} from "@/features/story-voice/lib/tts-env";

export type SynthesizeSpeechInput = {
  text: string;
  languageCode: TtsLanguageCode;
  voiceName: string;
  speakingRate?: number;
  pitch?: number;
  volumeGainDb?: number;
};

export type SynthesizeSpeechResult = {
  audioBuffer: Buffer;
  mimeType: "audio/mpeg";
  durationMs: number;
  voiceName: string;
  languageCode: string;
  generationTimeMs: number;
};

let cachedClient: TextToSpeechClient | null = null;

function createClient(): TextToSpeechClient {
  if (cachedClient) return cachedClient;

  const env = getGoogleCloudTtsEnv();

  // Prefer file path — multiline JSON in .env.local breaks (dotenv only keeps `{`).
  if (env.credentialsPath) {
    assertTtsCredentialsFile(env.credentialsPath);
    // Ensure the Google client uses the absolute path (env may be relative).
    process.env.GOOGLE_APPLICATION_CREDENTIALS = env.credentialsPath;
    cachedClient = new TextToSpeechClient({
      keyFilename: env.credentialsPath,
      projectId: env.projectId,
    });
    return cachedClient;
  }

  if (env.credentialsJson) {
    let parsed: {
      client_email?: string;
      private_key?: string;
      project_id?: string;
    };
    try {
      parsed = JSON.parse(env.credentialsJson) as typeof parsed;
    } catch {
      throw new Error(
        "GOOGLE_CLOUD_TTS_CREDENTIALS is not valid JSON. Do not paste multiline JSON into .env — save the key file and set GOOGLE_APPLICATION_CREDENTIALS=credentials/google-cloud-tts.json instead.",
      );
    }
    cachedClient = new TextToSpeechClient({
      credentials: {
        client_email: parsed.client_email,
        private_key: parsed.private_key,
      },
      projectId: env.projectId || parsed.project_id,
    });
    return cachedClient;
  }

  throw new Error(
    "Google Cloud TTS is not configured. Set GOOGLE_CLOUD_TTS_CREDENTIALS (JSON) or GOOGLE_APPLICATION_CREDENTIALS.",
  );
}

/**
 * Estimate MP3 duration from byte length assuming Google's typical 32 kbps CBR.
 * Good enough for editorial preview metadata without an extra decoder dep.
 */
export function estimateMp3DurationMs(byteLength: number): number {
  const bitrateKbps = 32;
  if (byteLength <= 0) return 0;
  return Math.max(250, Math.round((byteLength * 8) / bitrateKbps));
}

export function resolveVoice(
  voiceName: string,
  languageCode: TtsLanguageCode,
): {
  name: string;
  languageCode: TtsLanguageCode;
  ssmlGender: "FEMALE" | "MALE" | "NEUTRAL";
} {
  const match = CLOUD_TTS_VOICES.find((voice) => voice.name === voiceName);
  if (match) {
    return {
      name: match.name,
      languageCode: match.languageCode as TtsLanguageCode,
      ssmlGender: match.gender,
    };
  }
  const fallback = CLOUD_TTS_VOICES.find(
    (voice) => voice.languageCode === languageCode,
  );
  if (fallback) {
    return {
      name: fallback.name,
      languageCode: fallback.languageCode,
      ssmlGender: fallback.gender,
    };
  }
  return { name: voiceName, languageCode, ssmlGender: "NEUTRAL" };
}

/** Short audition line that names the model so voices are easy to tell apart. */
export function buildVoiceSampleText(input: {
  voiceName: string;
  languageCode: TtsLanguageCode;
  label?: string;
}): string {
  const match = CLOUD_TTS_VOICES.find((voice) => voice.name === input.voiceName);
  const label = input.label ?? match?.label ?? input.voiceName;
  const gender = match?.gender === "MALE" ? "male" : match?.gender === "FEMALE" ? "female" : "neural";

  if (input.languageCode === "ml-IN") {
    return `ഇത് ${label} എന്ന ${gender === "male" ? "പുരുഷ" : "സ്ത്രീ"} ശബ്ദമാണ്. മീഡിയോഎസ് വാർത്താ സാമ്പിൾ. നമസ്കാരം.`;
  }
  if (input.languageCode === "en-IN") {
    return `This is ${label}, a ${gender} Indian English voice. MediaOS news sample. Namaste.`;
  }
  return `This is ${label}, a ${gender} voice. MediaOS news sample. Hello, and welcome.`;
}

export async function synthesizeSpeech(
  input: SynthesizeSpeechInput,
): Promise<SynthesizeSpeechResult> {
  const text = input.text.trim();
  if (!text) {
    throw new Error("Cannot synthesize an empty script.");
  }
  if (text.length > 4500) {
    throw new Error(
      "Approved script exceeds the 4,500 character TTS limit. Shorten the script and approve again.",
    );
  }

  const voice = resolveVoice(input.voiceName, input.languageCode);
  const speakingRate = clamp(
    input.speakingRate ?? DEFAULT_SPEAKING_RATE,
    0.25,
    4,
  );
  const pitch = clamp(input.pitch ?? DEFAULT_PITCH, -20, 20);
  const volumeGainDb = clamp(
    input.volumeGainDb ?? DEFAULT_VOLUME_GAIN_DB,
    -96,
    16,
  );

  const client = createClient();
  const started = Date.now();

  const [response] = await client.synthesizeSpeech({
    input: { text },
    voice: {
      languageCode: voice.languageCode,
      name: voice.name,
      ssmlGender: voice.ssmlGender,
    },
    audioConfig: {
      audioEncoding: "MP3",
      speakingRate,
      pitch,
      volumeGainDb,
    },
  });
  const audioContent = response.audioContent;
  if (!audioContent) {
    throw new Error("Google Cloud TTS returned empty audio.");
  }

  const audioBuffer = Buffer.isBuffer(audioContent)
    ? audioContent
    : Buffer.from(audioContent as Uint8Array);

  return {
    audioBuffer,
    mimeType: "audio/mpeg",
    durationMs: estimateMp3DurationMs(audioBuffer.length),
    voiceName: voice.name,
    languageCode: voice.languageCode,
    generationTimeMs: Date.now() - started,
  };
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}
