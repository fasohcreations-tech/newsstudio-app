import type { PromptTemplate } from "@/features/ai/types/ai";

export const voiceoverScriptPrompt: PromptTemplate = {
  id: "voice.script",
  version: "1.0.0",
  category: "voice",
  description: "Draft a voice-over script from a story summary",
  variables: ["headline", "summary", "durationSeconds"],
  templates: {
    en: `Write a spoken voice-over script (~{{durationSeconds}} seconds) for:
Headline: {{headline}}
Summary: {{summary}}
Use short sentences suitable for narration.`,
    ml: `ഏകദേശം {{durationSeconds}} സെക്കൻഡ് ദൈർഘ്യമുള്ള വോയ്സ്-ഓവർ സ്ക്രിപ്റ്റ് എഴുതുക:
തലക്കെട്ട്: {{headline}}
സംഗ്രഹം: {{summary}}
ഉച്ചാരണത്തിന് അനുയോജ്യമായ ചെറു വാക്യങ്ങൾ ഉപയോഗിക്കുക.`,
  },
};
