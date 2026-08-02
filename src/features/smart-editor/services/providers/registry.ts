import type {
  AIEditorService,
  HandwritingRecognitionService,
  ManglishService,
  SpeechToTextService,
  SpellCheckService,
  TranslationService,
} from "@/features/smart-editor/services/interfaces/editor-services";
import { ruleBasedManglishService } from "@/features/smart-editor/services/providers/manglish/rule-based-manglish";
import { googleInputToolsManglishService } from "@/features/smart-editor/services/providers/manglish/google-input-tools-manglish";
import { mockHandwritingRecognitionService } from "@/features/smart-editor/services/providers/handwriting/mock-handwriting";
import { mockSpeechToTextService } from "@/features/smart-editor/services/providers/speech/mock-speech-to-text";
import {
  mockSpellCheckService,
  mockTranslationService,
} from "@/features/smart-editor/services/providers/mock-language-services";

/**
 * Central registry — swap providers without touching editor UI.
 * Manglish defaults to Google Input Tools (manglish.app format).
 */
export type EditorProviderRegistry = {
  speechToText: SpeechToTextService;
  handwriting: HandwritingRecognitionService;
  manglish: ManglishService;
  spellCheck: SpellCheckService;
  translation: TranslationService;
  /** Optional client-side AI facade; server actions preferred. */
  aiEditor?: AIEditorService;
};

let registry: EditorProviderRegistry = {
  speechToText: mockSpeechToTextService,
  handwriting: mockHandwritingRecognitionService,
  manglish: googleInputToolsManglishService,
  spellCheck: mockSpellCheckService,
  translation: mockTranslationService,
};

export function getEditorProviders(): EditorProviderRegistry {
  return registry;
}

export function configureEditorProviders(
  patch: Partial<EditorProviderRegistry>,
): void {
  registry = { ...registry, ...patch };
}

/** Offline / test helper — force local Mozhi lexicon engine. */
export function useRuleBasedManglish(): void {
  configureEditorProviders({ manglish: ruleBasedManglishService });
}

/** manglish.app-compatible Google Input Tools engine (default). */
export function useGoogleInputToolsManglish(): void {
  configureEditorProviders({ manglish: googleInputToolsManglishService });
}
