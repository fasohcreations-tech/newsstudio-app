import type { PromptTemplate } from "@/features/ai/types/ai";

/**
 * AI News Producer prompts (Module 3).
 * Versioned; English + Malayalam. Registered in PROMPT_CATALOG.
 */

export const newsResearchPrompt: PromptTemplate = {
  id: "news.research",
  version: "1.0.0",
  category: "news",
  description: "Research brief for a news story",
  variables: ["title", "summary", "body", "language"],
  templates: {
    en: `You are a senior news researcher for a professional newsroom.
Language for the response: {{language}}

Story title: {{title}}
Existing summary: {{summary}}
Story / script body:
{{body}}

Produce an editorial research brief with:
1. Key facts to verify
2. Likely sources / stakeholders
3. Context and background
4. Risks, sensitivity, or legal flags
5. Recommended follow-up questions

Write clearly for editors. Do not invent quotes.`,
    ml: `നിങ്ങൾ ഒരു പ്രൊഫഷണൽ ന്യൂസ്റൂമിലെ സീനിയർ ന്യൂസ് റിസർച്ചറാണ്.
മറുപടി ഭാഷ: {{language}}

വാർത്താ തലക്കെട്ട്: {{title}}
നിലവിലുള്ള സംഗ്രഹം: {{summary}}
ഉള്ളടക്കം / സ്ക്രിപ്റ്റ്:
{{body}}

എഡിറ്റോറിയൽ റിസർച്ച് ബ്രീഫ് തയ്യാറാക്കുക:
1. പരിശോധിക്കേണ്ട പ്രധാന വസ്തുതകൾ
2. സാധ്യമായ ഉറവിടങ്ങൾ / പങ്കാളികൾ
3. പശ്ചാത്തലം
4. റിസ്ക് / സെൻസിറ്റിവിറ്റി / നിയമപരമായ മുന്നറിയിപ്പുകൾ
5. തുടർചോദ്യങ്ങൾ

എഡിറ്റർമാർക്ക് വ്യക്തമായി എഴുതുക. കൃത്രിമ ക്വോട്ടുകൾ ഉണ്ടാക്കരുത്.`,
  },
};

export const newsHeadlinePrompt: PromptTemplate = {
  id: "news.headline",
  version: "1.1.0",
  category: "news",
  description: "Generate multiple news headline options",
  variables: ["title", "summary", "body", "tone"],
  templates: {
    en: `You are a news desk editor.
Write 5 distinct headline options for this story.
Tone: {{tone}}

Working title: {{title}}
Summary: {{summary}}
Body:
{{body}}

Rules:
- One headline per line
- No numbering prefixes required (you may use 1-5.)
- No hashtags
- Keep each headline under 90 characters when possible`,
    ml: `നിങ്ങൾ ഒരു ന്യൂസ് ഡെസ്ക് എഡിറ്ററാണ്.
ഈ വാർത്തയ്ക്ക് 5 വ്യത്യസ്ത തലക്കെട്ടുകൾ എഴുതുക.
ശൈലി: {{tone}}

പ്രവർത്തന തലക്കെട്ട്: {{title}}
സംഗ്രഹം: {{summary}}
ഉള്ളടക്കം:
{{body}}

നിയമങ്ങൾ:
- ഓരോ വരിയിലും ഒരു തലക്കെട്ട്
- ഹാഷ്‌ടാഗുകൾ വേണ്ട
- സാധ്യമായിടത്തോളം 90 അക്ഷരത്തിനുള്ളിൽ`,
  },
};

export const newsSummaryPrompt: PromptTemplate = {
  id: "news.summary",
  version: "2.0.0",
  category: "news",
  description: "Short lower-info sub-headlines for broadcast lower third",
  variables: ["title", "summary", "body"],
  templates: {
    en: `Write exactly 4 very short sub-headlines for a TV lower-information panel (lower third).
Headline: {{title}}
Existing lines: {{summary}}
Body:
{{body}}

Rules:
- Exactly 4 lines
- One sub-headline per line
- Each line under 72 characters
- No numbering, bullets, or hashtags
- Punchy, scannable, on-air friendly
- Return only the 4 lines`,
    ml: `ടിവി ലോവർ-ഇൻഫോ പാനലിനായി കൃത്യം 4 വളരെ ചെറിയ സബ് ഹെഡ്‌ലൈനുകൾ എഴുതുക.
തലക്കെട്ട്: {{title}}
നിലവിലുള്ള വരികൾ: {{summary}}
ഉള്ളടക്കം:
{{body}}

നിയമങ്ങൾ:
- കൃത്യം 4 വരികൾ
- ഓരോ വരിയിലും ഒരു സബ് ഹെഡ്‌ലൈൻ
- ഓരോ വരിയും 72 അക്ഷരത്തിനുള്ളിൽ
- നമ്പറിംഗ് / ബുള്ളറ്റ് / ഹാഷ്‌ടാഗ് വേണ്ട
- ഓൺ-എയർ ലോവർ തേർഡിന് പറ്റിയ ചെറിയ വരികൾ
- 4 വരികൾ മാത്രം നൽകുക`,
  },
};

export const newsKeywordsPrompt: PromptTemplate = {
  id: "news.keywords",
  version: "1.0.0",
  category: "news",
  description: "SEO / editorial keywords",
  variables: ["title", "summary", "body"],
  templates: {
    en: `Extract 8-15 editorial/SEO keywords for this story.
Title: {{title}}
Summary: {{summary}}
Body:
{{body}}

Return a comma-separated list only.`,
    ml: `ഈ വാർത്തയ്ക്ക് 8-15 എഡിറ്റോറിയൽ/SEO കീവേഡുകൾ കണ്ടെത്തുക.
തലക്കെട്ട്: {{title}}
സംഗ്രഹം: {{summary}}
ഉള്ളടക്കം:
{{body}}

കോമയാൽ വേർതിരിച്ച ലിസ്റ്റ് മാത്രം നൽകുക.`,
  },
};

export const newsTagsPrompt: PromptTemplate = {
  id: "news.tags",
  version: "1.0.0",
  category: "news",
  description: "Newsroom taxonomy tags",
  variables: ["title", "summary", "category"],
  templates: {
    en: `Suggest 5-10 newsroom taxonomy tags for this story.
Title: {{title}}
Summary: {{summary}}
Category hint: {{category}}

Return a comma-separated list of short tags only.`,
    ml: `ഈ വാർത്തയ്ക്ക് 5-10 ന്യൂസ്റൂം ടാഗുകൾ നിർദ്ദേശിക്കുക.
തലക്കെട്ട്: {{title}}
സംഗ്രഹം: {{summary}}
വിഭാഗ സൂചന: {{category}}

ചെറിയ ടാഗുകളുടെ കോമ വേർതിരിച്ച ലിസ്റ്റ് മാത്രം.`,
  },
};

export const newsTvScriptPrompt: PromptTemplate = {
  id: "news.tv_script",
  version: "1.0.0",
  category: "news",
  description: "TV / broadcast news script",
  variables: ["title", "summary", "body", "language"],
  templates: {
    en: `Write a TV news script in {{language}} for a 60-90 second package.
Title: {{title}}
Summary: {{summary}}
Source material:
{{body}}

Format:
- ANCHOR INTRO
- VO / SOT suggestions (as text notes)
- ANCHOR OUTRO

Keep it factual. Mark uncertain claims clearly.`,
    ml: `60-90 സെക്കൻഡ് പാക്കേജിന് {{language}} ഭാഷയിൽ ടിവി ന്യൂസ് സ്ക്രിപ്റ്റ് എഴുതുക.
തലക്കെട്ട്: {{title}}
സംഗ്രഹം: {{summary}}
ഉറവിടം:
{{body}}

ഫോർമാറ്റ്:
- ANCHOR INTRO
- VO / SOT നിർദ്ദേശങ്ങൾ
- ANCHOR OUTRO

വസ്തുതാപരമായി നിലനിർത്തുക.`,
  },
};

export const newsWebsiteArticlePrompt: PromptTemplate = {
  id: "news.website_article",
  version: "1.0.0",
  category: "news",
  description: "Website news article draft",
  variables: ["title", "summary", "body", "language"],
  templates: {
    en: `Write a clean website news article draft in {{language}}.
Working title: {{title}}
Summary: {{summary}}
Notes / body:
{{body}}

Include:
- Headline
- Deck / subhead
- 4-8 short paragraphs
- Neutral news voice

Do not invent unnamed official quotes.`,
    ml: `{{language}} ഭാഷയിൽ വെബ്‌സൈറ്റ് വാർത്താ ലേഖന ഡ്രാഫ്റ്റ് എഴുതുക.
പ്രവർത്തന തലക്കെട്ട്: {{title}}
സംഗ്രഹം: {{summary}}
കുറിപ്പുകൾ / ഉള്ളടക്കം:
{{body}}

ഉൾപ്പെടുത്തുക:
- തലക്കെട്ട്
- സബ്‌ഹെഡ്
- 4-8 ചെറിയ ഖണ്ഡികകൾ
- നിഷ്പക്ഷ ന്യൂസ് ശൈലി

കൃത്രിമ ഔദ്യോഗിക ക്വോട്ടുകൾ ഉണ്ടാക്കരുത്.`,
  },
};

export const newsYoutubeDescriptionPrompt: PromptTemplate = {
  id: "news.youtube_description",
  version: "1.0.0",
  category: "news",
  description: "YouTube description for a news package",
  variables: ["title", "summary", "body"],
  templates: {
    en: `Write a YouTube description for this news package.
Title: {{title}}
Summary: {{summary}}
Body:
{{body}}

Include a short synopsis, 3-5 bullet key points, and a short disclaimer that details may update.`,
    ml: `ഈ ന്യൂസ് പാക്കേജിന് YouTube വിവരണം എഴുതുക.
തലക്കെട്ട്: {{title}}
സംഗ്രഹം: {{summary}}
ഉള്ളടക്കം:
{{body}}

ചെറിയ സംഗ്രഹം, 3-5 കീ പോയിന്റുകൾ, വിവരങ്ങൾ അപ്‌ഡേറ്റ് ആകാമെന്ന ഡിസ്ക്ലെയിമർ ഉൾപ്പെടുത്തുക.`,
  },
};

export const newsSocialCaptionsPrompt: PromptTemplate = {
  id: "news.social_captions",
  version: "1.0.0",
  category: "news",
  description: "Multi-platform social captions",
  variables: ["title", "summary", "body"],
  templates: {
    en: `Create a social media package for this story.
Title: {{title}}
Summary: {{summary}}
Body:
{{body}}

Provide labeled sections:
## Facebook
## Instagram
## X / Twitter
## WhatsApp / Telegram status

Keep each platform-appropriate. Add 3-6 relevant hashtags where useful.`,
    ml: `ഈ വാർത്തയ്ക്ക് സോഷ്യൽ മീഡിയ പാക്കേജ് തയ്യാറാക്കുക.
തലക്കെട്ട്: {{title}}
സംഗ്രഹം: {{summary}}
ഉള്ളടക്കം:
{{body}}

ലേബൽ ചെയ്ത സെക്ഷനുകൾ:
## Facebook
## Instagram
## X / Twitter
## WhatsApp / Telegram status

പ്ലാറ്റ്‌ഫോമിന് അനുയോജ്യമായി എഴുതുക. ആവശ്യമെങ്കിൽ 3-6 ഹാഷ്‌ടാഗുകൾ ചേർക്കുക.`,
  },
};

export const newsSeoMetadataPrompt: PromptTemplate = {
  id: "news.seo_metadata",
  version: "1.0.0",
  category: "news",
  description: "SEO title, description, and meta fields",
  variables: ["title", "summary", "body"],
  templates: {
    en: `Generate SEO metadata for this news story.
Title: {{title}}
Summary: {{summary}}
Body:
{{body}}

Return:
SEO Title:
Meta Description:
Slug suggestion:
Primary keyword:
Secondary keywords:`,
    ml: `ഈ വാർത്തയ്ക്ക് SEO മെറ്റാഡാറ്റ നിർമ്മിക്കുക.
തലക്കെട്ട്: {{title}}
സംഗ്രഹം: {{summary}}
ഉള്ളടക്കം:
{{body}}

തിരിച്ച് നൽകുക:
SEO Title:
Meta Description:
Slug suggestion:
Primary keyword:
Secondary keywords:`,
  },
};
