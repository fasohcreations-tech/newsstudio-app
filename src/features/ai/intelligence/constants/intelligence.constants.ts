import type { AIIntelligenceDomain } from "@/features/ai/intelligence/types/intelligence.types";

export const AI_INTELLIGENCE_DOMAIN_LABELS: Record<
  AIIntelligenceDomain,
  string
> = {
  story: "Story Intelligence",
  scene: "Scene Intelligence",
  timeline: "Timeline Intelligence",
  asset: "Asset Intelligence",
  graphics: "Graphics Intelligence",
  voice: "Voice Intelligence",
  broadcast: "Broadcast Intelligence",
};

export const AI_RECOMMENDATION_STATUS_LABELS = {
  pending: "Pending review",
  accepted: "Accepted",
  rejected: "Rejected",
  superseded: "Superseded",
  expired: "Expired",
} as const;

/** job_type prefixes written to ai_jobs via the orchestrator */
export const INTELLIGENCE_JOB_TYPES = {
  storyHeadline: "intelligence.story.headline",
  storySubheadline: "intelligence.story.subheadline",
  storySummary: "intelligence.story.summary",
  storyTranslate: "intelligence.story.translate",
  storyManglish: "intelligence.story.manglish",
  storySeo: "intelligence.story.seo",
  storyReadability: "intelligence.story.readability",
  storyGrammar: "intelligence.story.grammar",
  sceneRecommend: "intelligence.scene.recommend",
  timelineDraft: "intelligence.timeline.draft",
  timelineRegenerate: "intelligence.timeline.regenerate",
  assetAnalyze: "intelligence.asset.analyze",
  graphicsRecommend: "intelligence.graphics.recommend",
  voiceStt: "intelligence.voice.stt",
  voiceTts: "intelligence.voice.tts",
  voicePronounce: "intelligence.voice.pronounce",
  voiceLanguage: "intelligence.voice.language",
  voiceSubtitles: "intelligence.voice.subtitles",
  broadcastHealth: "intelligence.broadcast.health",
} as const;

export const STORY_INTELLIGENCE_CAPABILITIES = [
  "headline",
  "subheadline",
  "summary",
  "translate",
  "manglish",
  "voice_to_text",
  "handwriting_to_text",
  "seo",
  "readability",
  "grammar",
] as const;

export type StoryIntelligenceCapability =
  (typeof STORY_INTELLIGENCE_CAPABILITIES)[number];
