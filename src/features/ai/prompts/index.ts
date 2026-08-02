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
  translateTextPrompt,
  voiceoverScriptPrompt,
  graphicsBriefPrompt,
  publishingCaptionPrompt,
];

export const PROMPT_BY_ID: Record<string, PromptTemplate> = Object.fromEntries(
  PROMPT_CATALOG.map((p) => [p.id, p]),
);
