export const STORY_VOICE_STATUSES = [
  "none",
  "pending",
  "generating",
  "ready",
  "failed",
  "stale",
] as const;

export const STORY_VOICE_STATUS_LABELS: Record<
  (typeof STORY_VOICE_STATUSES)[number],
  string
> = {
  none: "No voice",
  pending: "Pending",
  generating: "Generating",
  ready: "Ready",
  failed: "Failed",
  stale: "Stale (script changed)",
};

export const TTS_LANGUAGES = [
  { code: "ml-IN", label: "Malayalam (India)" },
  { code: "en-US", label: "English (US)" },
  { code: "en-IN", label: "English (India)" },
] as const;

export type TtsProvider = "google-cloud" | "gemini";

export type TtsLanguageCode = (typeof TTS_LANGUAGES)[number]["code"];

export type TtsVoiceOption = {
  name: string;
  languageCode: TtsLanguageCode | "auto";
  gender: "FEMALE" | "MALE" | "NEUTRAL";
  label: string;
  family:
    | "WaveNet"
    | "Neural2"
    | "Studio"
    | "Standard"
    | "Chirp3"
    | "Gemini";
  provider: TtsProvider;
  neural: boolean;
  description: string;
};

/** Short lines used when auditioning a voice in the Voice panel. */
export const TTS_SAMPLE_LINES: Record<TtsLanguageCode, string> = {
  "ml-IN":
    "നമസ്കാരം. ഇതാണ് മീഡിയോഎസ് വോയിസ് സാമ്പിൾ. വാർത്താ അവതരണത്തിന് അനുയോജ്യമായ ശബ്ദം.",
  "en-US":
    "Hello. This is a MediaOS voice sample for broadcast news delivery.",
  "en-IN":
    "Namaste. This is a MediaOS voice sample for Indian English news delivery.",
};

/** Neural / WaveNet / Studio voices for Malayalam + English (Google Cloud TTS). */
export const CLOUD_TTS_VOICES: TtsVoiceOption[] = (
  [
  // Malayalam
  {
    name: "ml-IN-Wavenet-A",
    languageCode: "ml-IN",
    gender: "FEMALE",
    label: "Malayalam WaveNet A",
    family: "WaveNet",
    neural: true,
    description: "Clear female news read",
  },
  {
    name: "ml-IN-Wavenet-B",
    languageCode: "ml-IN",
    gender: "MALE",
    label: "Malayalam WaveNet B",
    family: "WaveNet",
    neural: true,
    description: "Warm male anchor tone",
  },
  {
    name: "ml-IN-Wavenet-C",
    languageCode: "ml-IN",
    gender: "FEMALE",
    label: "Malayalam WaveNet C",
    family: "WaveNet",
    neural: true,
    description: "Bright female delivery",
  },
  {
    name: "ml-IN-Wavenet-D",
    languageCode: "ml-IN",
    gender: "MALE",
    label: "Malayalam WaveNet D",
    family: "WaveNet",
    neural: true,
    description: "Deep male bulletin style",
  },
  {
    name: "ml-IN-Standard-A",
    languageCode: "ml-IN",
    gender: "FEMALE",
    label: "Malayalam Standard A",
    family: "Standard",
    neural: false,
    description: "Fast, lighter female voice",
  },
  {
    name: "ml-IN-Standard-B",
    languageCode: "ml-IN",
    gender: "MALE",
    label: "Malayalam Standard B",
    family: "Standard",
    neural: false,
    description: "Fast, lighter male voice",
  },
  {
    name: "ml-IN-Standard-C",
    languageCode: "ml-IN",
    gender: "FEMALE",
    label: "Malayalam Standard C",
    family: "Standard",
    neural: false,
    description: "Alternate female standard",
  },
  {
    name: "ml-IN-Standard-D",
    languageCode: "ml-IN",
    gender: "MALE",
    label: "Malayalam Standard D",
    family: "Standard",
    neural: false,
    description: "Alternate male standard",
  },

  // English US — Neural2
  {
    name: "en-US-Neural2-A",
    languageCode: "en-US",
    gender: "MALE",
    label: "US Neural2 A",
    family: "Neural2",
    neural: true,
    description: "Male, measured pace",
  },
  {
    name: "en-US-Neural2-C",
    languageCode: "en-US",
    gender: "FEMALE",
    label: "US Neural2 C",
    family: "Neural2",
    neural: true,
    description: "Female, clear news tone",
  },
  {
    name: "en-US-Neural2-D",
    languageCode: "en-US",
    gender: "MALE",
    label: "US Neural2 D",
    family: "Neural2",
    neural: true,
    description: "Male, deeper register",
  },
  {
    name: "en-US-Neural2-E",
    languageCode: "en-US",
    gender: "FEMALE",
    label: "US Neural2 E",
    family: "Neural2",
    neural: true,
    description: "Female, conversational",
  },
  {
    name: "en-US-Neural2-F",
    languageCode: "en-US",
    gender: "FEMALE",
    label: "US Neural2 F",
    family: "Neural2",
    neural: true,
    description: "Female, bright and crisp",
  },
  {
    name: "en-US-Neural2-G",
    languageCode: "en-US",
    gender: "FEMALE",
    label: "US Neural2 G",
    family: "Neural2",
    neural: true,
    description: "Female, soft presentation",
  },
  {
    name: "en-US-Neural2-H",
    languageCode: "en-US",
    gender: "FEMALE",
    label: "US Neural2 H",
    family: "Neural2",
    neural: true,
    description: "Female, expressive",
  },
  {
    name: "en-US-Neural2-I",
    languageCode: "en-US",
    gender: "MALE",
    label: "US Neural2 I",
    family: "Neural2",
    neural: true,
    description: "Male, youthful tone",
  },
  {
    name: "en-US-Neural2-J",
    languageCode: "en-US",
    gender: "MALE",
    label: "US Neural2 J",
    family: "Neural2",
    neural: true,
    description: "Male, authoritative",
  },
  {
    name: "en-US-Studio-O",
    languageCode: "en-US",
    gender: "FEMALE",
    label: "US Studio O",
    family: "Studio",
    neural: true,
    description: "Studio-quality female",
  },
  {
    name: "en-US-Studio-Q",
    languageCode: "en-US",
    gender: "MALE",
    label: "US Studio Q",
    family: "Studio",
    neural: true,
    description: "Studio-quality male",
  },
  {
    name: "en-US-Chirp3-HD-Aoede",
    languageCode: "en-US",
    gender: "FEMALE",
    label: "US Chirp3 Aoede",
    family: "Chirp3",
    neural: true,
    description: "HD female (Chirp3)",
  },
  {
    name: "en-US-Chirp3-HD-Puck",
    languageCode: "en-US",
    gender: "MALE",
    label: "US Chirp3 Puck",
    family: "Chirp3",
    neural: true,
    description: "HD male (Chirp3)",
  },
  {
    name: "en-US-Chirp3-HD-Charon",
    languageCode: "en-US",
    gender: "MALE",
    label: "US Chirp3 Charon",
    family: "Chirp3",
    neural: true,
    description: "HD deep male (Chirp3)",
  },
  {
    name: "en-US-Chirp3-HD-Kore",
    languageCode: "en-US",
    gender: "FEMALE",
    label: "US Chirp3 Kore",
    family: "Chirp3",
    neural: true,
    description: "HD female (Chirp3)",
  },

  // English India
  {
    name: "en-IN-Neural2-A",
    languageCode: "en-IN",
    gender: "FEMALE",
    label: "India Neural2 A",
    family: "Neural2",
    neural: true,
    description: "Female Indian English",
  },
  {
    name: "en-IN-Neural2-B",
    languageCode: "en-IN",
    gender: "MALE",
    label: "India Neural2 B",
    family: "Neural2",
    neural: true,
    description: "Male Indian English",
  },
  {
    name: "en-IN-Neural2-C",
    languageCode: "en-IN",
    gender: "MALE",
    label: "India Neural2 C",
    family: "Neural2",
    neural: true,
    description: "Male, formal bulletin",
  },
  {
    name: "en-IN-Neural2-D",
    languageCode: "en-IN",
    gender: "FEMALE",
    label: "India Neural2 D",
    family: "Neural2",
    neural: true,
    description: "Female, formal bulletin",
  },
  {
    name: "en-IN-Wavenet-A",
    languageCode: "en-IN",
    gender: "FEMALE",
    label: "India WaveNet A",
    family: "WaveNet",
    neural: true,
    description: "Female WaveNet",
  },
  {
    name: "en-IN-Wavenet-B",
    languageCode: "en-IN",
    gender: "MALE",
    label: "India WaveNet B",
    family: "WaveNet",
    neural: true,
    description: "Male WaveNet",
  },
  {
    name: "en-IN-Wavenet-C",
    languageCode: "en-IN",
    gender: "MALE",
    label: "India WaveNet C",
    family: "WaveNet",
    neural: true,
    description: "Male WaveNet alternate",
  },
  {
    name: "en-IN-Wavenet-D",
    languageCode: "en-IN",
    gender: "FEMALE",
    label: "India WaveNet D",
    family: "WaveNet",
    neural: true,
    description: "Female WaveNet alternate",
  },
  {
    name: "en-IN-Standard-A",
    languageCode: "en-IN",
    gender: "FEMALE",
    label: "India Standard A",
    family: "Standard",
    neural: false,
    description: "Lightweight female",
  },
  {
    name: "en-IN-Standard-B",
    languageCode: "en-IN",
    gender: "MALE",
    label: "India Standard B",
    family: "Standard",
    neural: false,
    description: "Lightweight male",
  },
  {
    name: "en-IN-Standard-C",
    languageCode: "en-IN",
    gender: "MALE",
    label: "India Standard C",
    family: "Standard",
    neural: false,
    description: "Lightweight male alternate",
  },
  {
    name: "en-IN-Standard-D",
    languageCode: "en-IN",
    gender: "FEMALE",
    label: "India Standard D",
    family: "Standard",
    neural: false,
    description: "Lightweight female alternate",
  },
] as Array<Omit<TtsVoiceOption, "provider">>
).map((voice) => ({ ...voice, provider: "google-cloud" as const }));

/** Gemini prebuilt TTS voices (30). Language is auto-detected from script text. */
export const GEMINI_TTS_VOICES: TtsVoiceOption[] = (
  [
    { name: "Zephyr", gender: "FEMALE", label: "Zephyr", description: "Bright" },
    { name: "Puck", gender: "MALE", label: "Puck", description: "Upbeat" },
    { name: "Charon", gender: "MALE", label: "Charon", description: "Informative" },
    { name: "Kore", gender: "FEMALE", label: "Kore", description: "Firm" },
    { name: "Fenrir", gender: "MALE", label: "Fenrir", description: "Excitable" },
    { name: "Leda", gender: "FEMALE", label: "Leda", description: "Youthful" },
    { name: "Orus", gender: "MALE", label: "Orus", description: "Firm" },
    { name: "Aoede", gender: "FEMALE", label: "Aoede", description: "Breezy" },
    { name: "Callirrhoe", gender: "FEMALE", label: "Callirrhoe", description: "Easy-going" },
    { name: "Autonoe", gender: "FEMALE", label: "Autonoe", description: "Bright" },
    { name: "Enceladus", gender: "MALE", label: "Enceladus", description: "Breathy" },
    { name: "Iapetus", gender: "MALE", label: "Iapetus", description: "Clear" },
    { name: "Umbriel", gender: "MALE", label: "Umbriel", description: "Easy-going" },
    { name: "Algieba", gender: "MALE", label: "Algieba", description: "Smooth" },
    { name: "Despina", gender: "FEMALE", label: "Despina", description: "Smooth" },
    { name: "Erinome", gender: "FEMALE", label: "Erinome", description: "Clear" },
    { name: "Algenib", gender: "MALE", label: "Algenib", description: "Gravelly" },
    { name: "Rasalgethi", gender: "MALE", label: "Rasalgethi", description: "Informative" },
    { name: "Laomedeia", gender: "FEMALE", label: "Laomedeia", description: "Upbeat" },
    { name: "Achernar", gender: "FEMALE", label: "Achernar", description: "Soft" },
    { name: "Alnilam", gender: "MALE", label: "Alnilam", description: "Firm" },
    { name: "Schedar", gender: "MALE", label: "Schedar", description: "Even" },
    { name: "Gacrux", gender: "FEMALE", label: "Gacrux", description: "Mature" },
    { name: "Pulcherrima", gender: "FEMALE", label: "Pulcherrima", description: "Forward" },
    { name: "Achird", gender: "MALE", label: "Achird", description: "Friendly" },
    { name: "Zubenelgenubi", gender: "MALE", label: "Zubenelgenubi", description: "Casual" },
    { name: "Vindemiatrix", gender: "FEMALE", label: "Vindemiatrix", description: "Gentle" },
    { name: "Sadachbia", gender: "MALE", label: "Sadachbia", description: "Lively" },
    { name: "Sadaltager", gender: "MALE", label: "Sadaltager", description: "Knowledgeable" },
    { name: "Sulafat", gender: "FEMALE", label: "Sulafat", description: "Warm" },
  ] as Array<{
    name: string;
    gender: TtsVoiceOption["gender"];
    label: string;
    description: string;
  }>
).map((voice) => ({
  ...voice,
  languageCode: "auto" as const,
  family: "Gemini" as const,
  provider: "gemini" as const,
  neural: true,
}));

/** All catalog voices (Cloud + Gemini). */
export const TTS_VOICES: TtsVoiceOption[] = [
  ...GEMINI_TTS_VOICES,
  ...CLOUD_TTS_VOICES,
];

export const DEFAULT_TTS_PROVIDER: TtsProvider = "gemini";
export const DEFAULT_GEMINI_TTS_VOICE = "Kore";
export const DEFAULT_TTS_VOICE = DEFAULT_GEMINI_TTS_VOICE;
export const DEFAULT_TTS_LANGUAGE: TtsLanguageCode = "ml-IN";
export const DEFAULT_SPEAKING_RATE = 1;
export const DEFAULT_PITCH = 0;
export const DEFAULT_VOLUME_GAIN_DB = 0;

export const TTS_AUDIO_BUCKET = "stories" as const;

export const TTS_PROVIDER_LABELS: Record<TtsProvider, string> = {
  gemini: "Gemini TTS",
  "google-cloud": "Google Cloud TTS",
};

export function voicesForProvider(provider: TtsProvider): TtsVoiceOption[] {
  return TTS_VOICES.filter((voice) => voice.provider === provider);
}

export function findVoiceOption(voiceName: string): TtsVoiceOption | undefined {
  return TTS_VOICES.find((voice) => voice.name === voiceName);
}
