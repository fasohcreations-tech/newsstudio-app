import type { EditorAIAction, EditorLanguage } from "@/features/smart-editor/types/editor.types";
import { EDITOR_AI_ACTION_LABELS } from "@/features/smart-editor/constants/editor.constants";

/**
 * Maps Smart Editor actions → Prompt Manager variables for `editor.transform`.
 * Action guides live here as constants (not freeform model prompts).
 */
const ACTION_GUIDES: Record<EditorAIAction, string> = {
  improve_writing: "Improve clarity, flow, and newsroom quality. Keep meaning.",
  grammar_check: "Fix grammar and return the corrected full text only.",
  spell_check: "Fix spelling errors and return the corrected full text only.",
  rewrite: "Rewrite with stronger newsroom voice while keeping facts.",
  summarize: "Write a concise news summary.",
  expand: "Expand with relevant context suitable for a news package.",
  shorten: "Shorten tightly for broadcast or web teaser use.",
  translate: "Translate appropriately for the newsroom.",
  generate_headline: "Generate 3 strong headline options, one per line.",
  generate_summary: "Generate a 2–3 sentence editorial summary.",
  generate_seo: "Generate SEO title, meta description, and 5 keywords.",
  generate_social_caption: "Generate a social caption with light CTA.",
  fact_check: "List potential factual risks and questions to verify. Be cautious.",
};

export function buildEditorAIPromptVariables(input: {
  action: EditorAIAction;
  text: string;
  language: EditorLanguage;
  targetLanguage?: "ml" | "en";
}): Record<string, string> {
  const languageInstruction =
    input.language === "en"
      ? "Respond in clear professional English."
      : "Respond in professional Malayalam Unicode (മലയാളം). Preserve newsroom tone.";

  let actionGuide = ACTION_GUIDES[input.action];
  if (input.action === "translate") {
    actionGuide =
      input.targetLanguage === "en"
        ? "Translate into English."
        : input.targetLanguage === "ml"
          ? "Translate into Malayalam Unicode."
          : actionGuide;
  }

  return {
    action_label: EDITOR_AI_ACTION_LABELS[input.action],
    action_guide: actionGuide,
    source_text: input.text,
    language_instruction: languageInstruction,
  };
}

/** @deprecated Use buildEditorAIPromptVariables + promptId editor.transform */
export function buildEditorAIPrompt(input: {
  action: EditorAIAction;
  text: string;
  language: EditorLanguage;
  targetLanguage?: "ml" | "en";
}) {
  const vars = buildEditorAIPromptVariables(input);
  return {
    systemPrompt: [
      "You are the MediaOS Smart Malayalam Editor AI assistant.",
      "You help professional newsrooms. Return usable editorial text.",
      "Do not wrap the entire answer in markdown fences unless asked.",
      vars.language_instruction,
    ].join(" "),
    prompt: [
      `Action: ${vars.action_label}`,
      vars.action_guide,
      "",
      "Source text:",
      vars.source_text,
    ].join("\n"),
  };
}
