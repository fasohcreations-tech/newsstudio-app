import type { PromptTemplate } from "@/features/ai/types/ai";

export const graphicsBriefPrompt: PromptTemplate = {
  id: "graphics.brief",
  version: "1.0.0",
  category: "graphics",
  description: "Create a lower-third / poster creative brief",
  variables: ["headline", "brand", "format"],
  templates: {
    en: `Create a {{format}} graphics brief for brand {{brand}}.
Headline: {{headline}}
Include: primary text, secondary text, color mood, layout notes.`,
    ml: `{{brand}} ബ്രാൻഡിനായി {{format}} ഗ്രാഫിക്സ് ബ്രീഫ് ഉണ്ടാക്കുക.
തലക്കെട്ട്: {{headline}}
ഉൾപ്പെടുത്തുക: പ്രധാന വാചകം, ദ്വിതീയ വാചകം, നിറ മാനസികാവസ്ഥ, ലേഔട്ട് കുറിപ്പുകൾ.`,
  },
};
