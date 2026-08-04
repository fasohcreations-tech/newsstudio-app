import {
  newsHeadlinePrompt,
  newsSummaryPrompt,
  newsResearchPrompt,
  newsKeywordsPrompt,
  newsTagsPrompt,
  newsTvScriptPrompt,
  newsWebsiteArticlePrompt,
  newsYoutubeDescriptionPrompt,
  newsSocialCaptionsPrompt,
  newsSeoMetadataPrompt,
} from "@/features/ai/prompts/news";
import { translateTextPrompt } from "@/features/ai/prompts/translation";
import { voiceoverScriptPrompt } from "@/features/ai/prompts/voice";
import { graphicsBriefPrompt } from "@/features/ai/prompts/graphics";
import { publishingCaptionPrompt } from "@/features/ai/prompts/publishing";
import { editorTransformPrompt } from "@/features/ai/prompts/editor";
import {
  mediaImageGeneratePrompt,
  mediaSubHeadlineImagePrompt,
} from "@/features/ai/prompts/media";
import { discoveryExpandKeywordsPrompt, discoveryWebSearchQueryPrompt } from "@/features/ai/prompts/discovery";
import {
  intelligenceAssetPrompt,
  intelligenceBroadcastPrompt,
  intelligenceGraphicsPrompt,
  intelligenceScenePrompt,
  intelligenceStoryPrompt,
  intelligenceTimelinePrompt,
  intelligenceVoicePrompt,
  voiceGeminiAuditionPrompt,
  voiceGeminiDefaultStylePrompt,
  voiceGeminiStylePrompt,
} from "@/features/ai/prompts/intelligence";
import {
  visionAnalyzeVideoPrompt,
  visionRecommendClipPrompt,
} from "@/features/ai/prompts/vision";
import {
  aiPlaygroundPrompt,
  newsMalayalamDeskSystemPrompt,
} from "@/features/ai/prompts/system";
import type { PromptTemplate } from "@/features/ai/types/ai";

export const PROMPT_CATALOG: PromptTemplate[] = [
  newsResearchPrompt,
  newsHeadlinePrompt,
  newsSummaryPrompt,
  newsKeywordsPrompt,
  newsTagsPrompt,
  newsTvScriptPrompt,
  newsWebsiteArticlePrompt,
  newsYoutubeDescriptionPrompt,
  newsSocialCaptionsPrompt,
  newsSeoMetadataPrompt,
  newsMalayalamDeskSystemPrompt,
  translateTextPrompt,
  voiceoverScriptPrompt,
  voiceGeminiStylePrompt,
  voiceGeminiDefaultStylePrompt,
  voiceGeminiAuditionPrompt,
  graphicsBriefPrompt,
  publishingCaptionPrompt,
  editorTransformPrompt,
  mediaImageGeneratePrompt,
  mediaSubHeadlineImagePrompt,
  discoveryExpandKeywordsPrompt,
  discoveryWebSearchQueryPrompt,
  visionAnalyzeVideoPrompt,
  visionRecommendClipPrompt,
  intelligenceStoryPrompt,
  intelligenceTimelinePrompt,
  intelligenceScenePrompt,
  intelligenceVoicePrompt,
  intelligenceGraphicsPrompt,
  intelligenceAssetPrompt,
  intelligenceBroadcastPrompt,
  aiPlaygroundPrompt,
];

export const PROMPT_BY_ID: Record<string, PromptTemplate> = Object.fromEntries(
  PROMPT_CATALOG.map((p) => [p.id, p]),
);
