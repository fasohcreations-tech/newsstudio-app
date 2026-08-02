/**
 * Universal Smart Malayalam Editor — shared types.
 */

export const EDITOR_LANGUAGES = ["ml", "en", "manglish"] as const;
export type EditorLanguage = (typeof EDITOR_LANGUAGES)[number];

export const EDITOR_THEMES = ["system", "light", "dark", "high-contrast"] as const;
export type EditorTheme = (typeof EDITOR_THEMES)[number];

export const TOOLBAR_LAYOUTS = ["full", "compact", "minimal"] as const;
export type ToolbarLayout = (typeof TOOLBAR_LAYOUTS)[number];

export const NEWSROOM_FORMATS = [
  "tv_script",
  "website_article",
  "youtube_script",
  "short_video_script",
  "breaking_news",
  "ticker_text",
  "anchor_notes",
  "reporter_notes",
] as const;
export type NewsroomFormat = (typeof NEWSROOM_FORMATS)[number];

export const EDITOR_AI_ACTIONS = [
  "improve_writing",
  "grammar_check",
  "spell_check",
  "rewrite",
  "summarize",
  "expand",
  "shorten",
  "translate",
  "generate_headline",
  "generate_summary",
  "generate_seo",
  "generate_social_caption",
  "fact_check",
] as const;
export type EditorAIAction = (typeof EDITOR_AI_ACTIONS)[number];

export const VOICE_STATES = [
  "idle",
  "recording",
  "paused",
  "processing",
  "error",
] as const;
export type VoiceState = (typeof VOICE_STATES)[number];

export type EditorSettings = {
  fontSize: number;
  lineHeight: number;
  theme: EditorTheme;
  toolbarLayout: ToolbarLayout;
  defaultLanguage: EditorLanguage;
  enableVoiceDictation: boolean;
  enableManglish: boolean;
  enableHandwriting: boolean;
  autoSave: boolean;
  autoTransliteration: boolean;
  newsroomFormat: NewsroomFormat;
};

export type EditorDocumentState = {
  html: string;
  plain: string;
  wordCount: number;
  characterCount: number;
  readingTimeMinutes: number;
  language: EditorLanguage;
  revision: number;
  editorVersion: string;
  cursorPosition: number | null;
  dirty: boolean;
  lastSavedAt: string | null;
};

export type EditorSuggestion = {
  id: string;
  kind: "completion" | "phrase" | "synonym" | "dictionary" | "spelling";
  text: string;
  replacement?: string;
  score?: number;
};

export type EditorDraftMetadata = {
  module: "smart_editor";
  editorVersion: string;
  bodyHtml: string;
  bodyPlain: string;
  language: EditorLanguage;
  revision: number;
  lastCursorPosition: number | null;
  newsroomFormat: NewsroomFormat;
  wordCount: number;
  characterCount: number;
  autosavedAt: string;
};

export type MediaOSEditorChangePayload = {
  contentHtml: string;
  contentPlain: string;
  wordCount: number;
  characterCount: number;
  readingTimeMinutes: number;
  language: EditorLanguage;
  revision: number;
  dirty: boolean;
};

export type MediaOSEditorProps = {
  documentId?: string;
  storyId?: string;
  contentObjectId?: string;
  initialHtml?: string;
  initialLanguage?: EditorLanguage;
  placeholder?: string;
  disabled?: boolean;
  /** compact = toolbar only (embed in Script tab); full = desktop shell */
  variant?: "full" | "compact" | "embedded";
  settings?: Partial<EditorSettings>;
  onChange?: (payload: MediaOSEditorChangePayload) => void;
  onSave?: (payload: MediaOSEditorChangePayload) => void | Promise<void>;
  className?: string;
};
