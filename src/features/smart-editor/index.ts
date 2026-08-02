/**
 * Public API for MediaOS Universal Smart Malayalam Editor.
 */

export { ManglishCandidatePopup } from "@/features/smart-editor/components/manglish-candidate-popup";
export { MediaOSEditor } from "@/features/smart-editor/components/mediaos-editor";
export { Toolbar } from "@/features/smart-editor/components/toolbar";
export { VoiceToolbar } from "@/features/smart-editor/components/voice-toolbar";
export { LanguageToolbar } from "@/features/smart-editor/components/language-toolbar";
export { HandwritingPanel } from "@/features/smart-editor/components/handwriting-panel";
export { SuggestionPanel } from "@/features/smart-editor/components/suggestion-panel";
export { AIActionPanel } from "@/features/smart-editor/components/ai-action-panel";
export { StatusBar } from "@/features/smart-editor/components/status-bar";
export { VersionIndicator } from "@/features/smart-editor/components/version-indicator";

export { useEditor, useMediaOSEditor } from "@/features/smart-editor/hooks/use-editor";
export { useVoiceInput } from "@/features/smart-editor/hooks/use-voice-input";
export { useManglish } from "@/features/smart-editor/hooks/use-manglish";
export { useHandwriting } from "@/features/smart-editor/hooks/use-handwriting";
export { useAutoSave } from "@/features/smart-editor/hooks/use-auto-save";
export { useEditorHistory } from "@/features/smart-editor/hooks/use-editor-history";

export {
  getEditorProviders,
  configureEditorProviders,
} from "@/features/smart-editor/services/providers/registry";

export type * from "@/features/smart-editor/types/editor.types";
export type * from "@/features/smart-editor/services/interfaces/editor-services";

export {
  MEDIAOS_EDITOR_VERSION,
  DEFAULT_EDITOR_SETTINGS,
  AUTOSAVE_INTERVAL_MS,
  EDITOR_AI_ACTION_LABELS,
  NEWSROOM_FORMAT_LABELS,
} from "@/features/smart-editor/constants/editor.constants";
