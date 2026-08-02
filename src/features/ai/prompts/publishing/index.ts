import type { PromptTemplate } from "@/features/ai/types/ai";

export const publishingCaptionPrompt: PromptTemplate = {
  id: "publishing.caption",
  version: "1.0.0",
  category: "publishing",
  description: "Draft a social / OTT caption from story metadata",
  variables: ["platform", "headline", "summary", "hashtagCount"],
  templates: {
    en: `Write a {{platform}} caption.
Headline: {{headline}}
Summary: {{summary}}
Include up to {{hashtagCount}} relevant hashtags.`,
    ml: `{{platform}} ക്യാപ്ഷൻ എഴുതുക.
തലക്കെട്ട്: {{headline}}
സംഗ്രഹം: {{summary}}
{{hashtagCount}} വരെ ബന്ധപ്പെട്ട ഹാഷ്‌ടാഗുകൾ ഉൾപ്പെടുത്തുക.`,
  },
};
