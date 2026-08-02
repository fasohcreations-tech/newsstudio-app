import type { PromptTemplate } from "@/features/ai/types/ai";

export const translateTextPrompt: PromptTemplate = {
  id: "translation.text",
  version: "1.0.0",
  category: "translation",
  description: "Translate editorial text between locales",
  variables: ["sourceLocale", "targetLocale", "text"],
  templates: {
    en: `Translate the following text from {{sourceLocale}} to {{targetLocale}}.
Preserve meaning and journalistic tone. Return only the translation.

{{text}}`,
    ml: `താഴെ കൊടുത്ത പാഠം {{sourceLocale}} ൽ നിന്ന് {{targetLocale}} ലേക്ക് വിവർത്തനം ചെയ്യുക.
അർത്ഥവും പത്രപ്രവർത്തന ശൈലിയും സൂക്ഷിക്കുക. വിവർത്തനം മാത്രം നൽകുക.

{{text}}`,
  },
};
