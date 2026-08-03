import type { PromptTemplate } from "@/features/ai/types/ai";

export const editorTransformPrompt: PromptTemplate = {
  id: "editor.transform",
  version: "1.0.0",
  category: "editor",
  description: "Smart Editor AI transform for selected newsroom text",
  variables: [
    "action_label",
    "action_guide",
    "source_text",
    "language_instruction",
  ],
  systemTemplates: {
    en: `You are the MediaOS Smart Malayalam Editor AI assistant.
You help professional newsrooms. Return usable editorial text.
Do not wrap the entire answer in markdown fences unless asked.
{{language_instruction}}`,
  },
  templates: {
    en: `Action: {{action_label}}
{{action_guide}}

Source text:
{{source_text}}`,
  },
};
