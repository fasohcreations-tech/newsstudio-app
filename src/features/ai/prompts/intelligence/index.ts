import type { PromptTemplate } from "@/features/ai/types/ai";

export const intelligenceStoryPrompt: PromptTemplate = {
  id: "intelligence.story",
  version: "1.0.0",
  category: "intelligence",
  description: "Story Intelligence capability runner (JSON response)",
  variables: ["instruction", "target_language", "source_text"],
  systemTemplates: {
    en: `You are MediaOS Story Intelligence. Return only valid JSON matching the instruction. No markdown fences.`,
  },
  templates: {
    en: `{{instruction}}

Target language: {{target_language}}

SOURCE:
{{source_text}}`,
  },
};

export const intelligenceTimelinePrompt: PromptTemplate = {
  id: "intelligence.timeline",
  version: "1.0.0",
  category: "intelligence",
  description: "Timeline Intelligence draft beats (JSON)",
  variables: ["context_block"],
  systemTemplates: {
    en: `You are MediaOS Timeline Intelligence. Return only valid JSON. No markdown fences.`,
  },
  templates: {
    en: `{{context_block}}`,
  },
};

export const intelligenceScenePrompt: PromptTemplate = {
  id: "intelligence.scene",
  version: "1.0.0",
  category: "intelligence",
  description: "Scene Intelligence suggestions (JSON)",
  variables: ["context_block"],
  systemTemplates: {
    en: `You are MediaOS Scene Intelligence. Return only valid JSON. No markdown fences.`,
  },
  templates: {
    en: `{{context_block}}`,
  },
};

export const intelligenceVoicePrompt: PromptTemplate = {
  id: "intelligence.voice",
  version: "1.0.0",
  category: "intelligence",
  description: "Voice Intelligence analysis (JSON)",
  variables: ["instruction", "language_hint", "source_text"],
  systemTemplates: {
    en: `You are MediaOS Voice Intelligence. Return only valid JSON. No markdown fences.`,
  },
  templates: {
    en: `{{instruction}}
Language hint: {{language_hint}}

TEXT:
{{source_text}}`,
  },
};

export const intelligenceGraphicsPrompt: PromptTemplate = {
  id: "intelligence.graphics",
  version: "1.0.0",
  category: "intelligence",
  description: "Graphics Intelligence suggestions (JSON)",
  variables: ["context_block"],
  systemTemplates: {
    en: `You are MediaOS Graphics Intelligence. Return only valid JSON. No markdown fences.`,
  },
  templates: {
    en: `{{context_block}}`,
  },
};

export const intelligenceAssetPrompt: PromptTemplate = {
  id: "intelligence.asset",
  version: "1.0.0",
  category: "intelligence",
  description: "Asset Intelligence tagging (JSON)",
  variables: ["context_block"],
  systemTemplates: {
    en: `You are MediaOS Asset Intelligence. Return only valid JSON. No markdown fences.`,
  },
  templates: {
    en: `{{context_block}}`,
  },
};

export const intelligenceBroadcastPrompt: PromptTemplate = {
  id: "intelligence.broadcast",
  version: "1.0.0",
  category: "intelligence",
  description: "Broadcast Intelligence packaging (JSON)",
  variables: ["context_block"],
  systemTemplates: {
    en: `You are MediaOS Broadcast Intelligence. Return only valid JSON. No markdown fences.`,
  },
  templates: {
    en: `{{context_block}}`,
  },
};

export const voiceGeminiStylePrompt: PromptTemplate = {
  id: "voice.gemini_style",
  version: "1.0.0",
  category: "voice",
  description: "Gemini TTS delivery style instruction",
  variables: ["style_notes"],
  templates: {
    en: `{{style_notes}}`,
  },
};

export const voiceGeminiDefaultStylePrompt: PromptTemplate = {
  id: "voice.gemini_default_style",
  version: "1.0.0",
  category: "voice",
  description: "Default Gemini TTS news-anchor delivery",
  variables: [],
  templates: {
    en: `Read this as a clear, professional news anchor. Natural pacing, confident delivery.`,
  },
};

export const voiceGeminiAuditionPrompt: PromptTemplate = {
  id: "voice.gemini_audition",
  version: "1.0.0",
  category: "voice",
  description: "Short Gemini TTS voice audition sample",
  variables: [],
  templates: {
    en: `Speak clearly as a short voice audition sample.`,
  },
};
