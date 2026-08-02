import type {
  EditorAIAction,
  EditorSettings,
  NewsroomFormat,
} from "@/features/smart-editor/types/editor.types";

/** Semver for editor document format / schema. */
export const MEDIAOS_EDITOR_VERSION = "1.0.0";

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  fontSize: 16,
  lineHeight: 1.7,
  theme: "system",
  toolbarLayout: "full",
  defaultLanguage: "ml",
  enableVoiceDictation: true,
  enableManglish: true,
  enableHandwriting: true,
  autoSave: true,
  autoTransliteration: true,
  newsroomFormat: "website_article",
};

export const AUTOSAVE_INTERVAL_MS = 5_000;

export const EDITOR_AI_ACTION_LABELS: Record<EditorAIAction, string> = {
  improve_writing: "Improve Writing",
  grammar_check: "Grammar Check",
  spell_check: "Spell Check",
  rewrite: "Rewrite",
  summarize: "Summarize",
  expand: "Expand",
  shorten: "Shorten",
  translate: "Translate",
  generate_headline: "Generate Headline",
  generate_summary: "Generate Summary",
  generate_seo: "Generate SEO",
  generate_social_caption: "Social Caption",
  fact_check: "Fact Check",
};

export const NEWSROOM_FORMAT_LABELS: Record<NewsroomFormat, string> = {
  tv_script: "TV Script",
  website_article: "Website Article",
  youtube_script: "YouTube Script",
  short_video_script: "Short Video Script",
  breaking_news: "Breaking News",
  ticker_text: "Ticker Text",
  anchor_notes: "Anchor Notes",
  reporter_notes: "Reporter Notes",
};

export const EDITOR_SHORTCUTS = {
  bold: "Ctrl+B",
  italic: "Ctrl+I",
  underline: "Ctrl+U",
  save: "Ctrl+S",
  undo: "Ctrl+Z",
  redo: "Ctrl+Shift+Z",
  find: "Ctrl+F",
  replace: "Ctrl+H",
  link: "Ctrl+K",
} as const;

/** Content-object metadata module tag for Smart Editor drafts. */
export const SMART_EDITOR_MODULE = "smart_editor" as const;
