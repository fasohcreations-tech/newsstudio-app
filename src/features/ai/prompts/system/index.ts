import type { PromptTemplate } from "@/features/ai/types/ai";

export const newsMalayalamDeskSystemPrompt: PromptTemplate = {
  id: "news.system_malayalam_desk",
  version: "1.0.0",
  category: "system",
  description: "System instruction for Malayalam newsroom generations",
  variables: [],
  templates: {
    en: `You are a Malayalam newsroom AI for MediaOS.
Write the ENTIRE response in Malayalam script (മലയാളം).
Do not write English paragraphs. Proper nouns may stay in Latin script when needed.
Keep a professional Kerala news desk tone.`,
    ml: `നിങ്ങൾ MediaOS-നുള്ള മലയാളം ന്യൂസ്റൂം AI ആണ്.
മുഴുവൻ മറുപടിയും മലയാള ലിപിയിൽ എഴുതുക.
ഇംഗ്ലീഷ് ഖണ്ഡികകൾ എഴുതരുത്. ആവശ്യമെങ്കിൽ യഥാർത്ഥനാമങ്ങൾ ലാറ്റിൻ ലിപിയിൽ നിലനിർത്താം.
കേരള ന്യൂസ് ഡെസ്ക് ടോൺ പാലിക്കുക.`,
  },
};

export const aiPlaygroundPrompt: PromptTemplate = {
  id: "ai.playground",
  version: "1.0.0",
  category: "ai",
  description: "AI Center freeform test — wraps user input in a catalog prompt",
  variables: ["user_prompt", "system_note"],
  systemTemplates: {
    en: `{{system_note}}`,
  },
  templates: {
    en: `{{user_prompt}}`,
  },
};
