import type { PromptTemplate } from "@/features/ai/types/ai";

export const mediaImageGeneratePrompt: PromptTemplate = {
  id: "media.image_generate",
  version: "1.0.0",
  category: "media",
  description: "Broadcast-ready still image from a creative brief",
  variables: ["user_brief"],
  templates: {
    en: `Create a broadcast-ready news still image for a television news package.
Creative brief:
{{user_brief}}

Requirements:
- Clean composition suitable for on-air graphics or lower-info panels
- No watermarks, no UI chrome, no unreadable micro-text
- Professional news lighting and framing`,
    ml: `ടെലിവിഷൻ ന്യൂസ് പാക്കേജിനായി ബ്രോഡ്കാസ്റ്റ്-റെഡി സ്റ്റിൽ ഇമേജ് ഉണ്ടാക്കുക.
ക്രിയേറ്റീവ് ബ്രീഫ്:
{{user_brief}}

ആവശ്യകതകൾ:
- ഓൺ-എയർ ഗ്രാഫിക്സ് / ലോവർ-ഇൻഫോ പാനലിന് അനുയോജ്യം
- വാട്ടർമാർക്ക് / UI chrome / വായിക്കാനാവാത്ത മൈക്രോ-ടെക്സ്റ്റ് ഒഴിവാക്കുക
- പ്രൊഫഷണൽ ന്യൂസ് ലൈറ്റിംഗും ഫ്രെയിമിംഗും`,
  },
};

export const mediaSubHeadlineImagePrompt: PromptTemplate = {
  id: "media.sub_headline_image",
  version: "1.0.0",
  category: "media",
  description: "Lower-information-panel still for a Sub Headline slot",
  variables: ["slot", "line"],
  templates: {
    en: `News graphic for the lower information panel of a Malayalam news package.
Sub Headline slot: {{slot}}
On-air line: {{line}}

Create a clear, broadcast-safe still suitable for pairing with that lower-third line.
No watermarks. Prefer simple documentary or illustrative news imagery.`,
    ml: `മലയാളം ന്യൂസ് പാക്കേജിന്റെ ലോവർ ഇൻഫർമേഷൻ പാനലിനുള്ള ന്യൂസ് ഗ്രാഫിക്.
സബ് ഹെഡ്‌ലൈൻ സ്ലോട്ട്: {{slot}}
ഓൺ-എയർ വരി: {{line}}

ആ ലോവർ-തേർഡ് വരിയോട് ചേരുന്ന ബ്രോഡ്കാസ്റ്റ്-സേഫ് സ്റ്റിൽ ഉണ്ടാക്കുക.
വാട്ടർമാർക്ക് ഒഴിവാക്കുക. ഡോക്യുമെന്ററി / ഇലസ്ട്രേറ്റീവ് ന്യൂസ് ഇമേജറി മുൻഗണന.`,
  },
};
