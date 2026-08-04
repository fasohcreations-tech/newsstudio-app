import type { PromptTemplate } from "@/features/ai/types/ai";

export const discoveryExpandKeywordsPrompt: PromptTemplate = {
  id: "discovery.expand_keywords",
  version: "1.0.0",
  category: "media",
  description: "Expand Story Panel keywords for multi-provider asset search",
  variables: [
    "story_headline",
    "scene_headline",
    "category",
    "language",
    "seed_keywords",
  ],
  systemTemplates: {
    en: `You are MediaOS Asset Discovery. Return only valid JSON. No markdown fences.`,
  },
  templates: {
    en: `Expand search keywords for finding broadcast media for a news Story Panel.

Story headline: {{story_headline}}
Scene headline (on-screen): {{scene_headline}}
Category: {{category}}
Language: {{language}}
Seed keywords: {{seed_keywords}}

Return JSON:
{
  "keywords": string[],
  "expanded": string[]
}

Rules:
- Include Malayalam and English variants when useful
- Prefer concrete nouns, places, events, visual subjects
- Max 16 total unique terms across both arrays
- No commentary`,
    ml: `ന്യൂസ് സ്റ്റോറി പാനലിന് മീഡിയ തിരയാൻ കീവേഡുകൾ വിപുലീകരിക്കുക.

സ്റ്റോറി ഹെഡ്‌ലൈൻ: {{story_headline}}
സീൻ ഹെഡ്‌ലൈൻ: {{scene_headline}}
വിഭാഗം: {{category}}
ഭാഷ: {{language}}
സീഡ് കീവേഡുകൾ: {{seed_keywords}}

JSON മാത്രം തിരികെ നൽകുക:
{ "keywords": string[], "expanded": string[] }`,
  },
};

export const discoveryWebSearchQueryPrompt: PromptTemplate = {
  id: "discovery.web_search_query",
  version: "1.0.0",
  category: "media",
  description:
    "Turn a Sub Headline into a short English web search query for stock image/video",
  variables: [
    "scene_headline",
    "story_headline",
    "category",
    "language",
    "media_filter",
  ],
  systemTemplates: {
    en: `You are MediaOS Asset Discovery. Return only valid JSON. No markdown fences.`,
  },
  templates: {
    en: `Create a web stock-media search query for a news Sub Headline.

Sub Headline (on-screen): {{scene_headline}}
Story headline: {{story_headline}}
Category: {{category}}
Language: {{language}}
Wanted media: {{media_filter}}

Return JSON:
{
  "query": string,
  "alt_queries": string[]
}

Rules:
- query must be concise English (3–8 words), visual and concrete
- Prefer places, people, events, objects that photograph well
- No quotes, no site: operators
- alt_queries: up to 2 variants
- If Sub Headline is Malayalam, translate the visual intent to English`,
  },
};
