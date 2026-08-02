"use client";

import { Badge } from "@/components/ui/badge";
import { VersionIndicator } from "@/features/smart-editor/components/version-indicator";
import type {
  EditorLanguage,
  NewsroomFormat,
} from "@/features/smart-editor/types/editor.types";
import { NEWSROOM_FORMAT_LABELS } from "@/features/smart-editor/constants/editor.constants";

type StatusBarProps = {
  wordCount: number;
  characterCount: number;
  readingTimeMinutes: number;
  language: EditorLanguage;
  dirty: boolean;
  saveStatus: "idle" | "saving" | "saved" | "error";
  revision: number;
  editorVersion: string;
  newsroomFormat: NewsroomFormat;
  lastSavedAt: string | null;
};

const LANG_BADGE: Record<EditorLanguage, string> = {
  ml: "മലയാളം",
  en: "English",
  manglish: "Manglish",
};

export function StatusBar({
  wordCount,
  characterCount,
  readingTimeMinutes,
  language,
  dirty,
  saveStatus,
  revision,
  editorVersion,
  newsroomFormat,
  lastSavedAt,
}: StatusBarProps) {
  const saveLabel =
    saveStatus === "saving"
      ? "Saving…"
      : saveStatus === "error"
        ? "Save error"
        : dirty
          ? "Unsaved changes"
          : saveStatus === "saved"
            ? "Saved"
            : "Ready";

  return (
    <div
      className="flex flex-wrap items-center gap-2 border-t border-border/60 bg-muted/30 px-3 py-1.5 text-[11px] text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <span>
        {wordCount} words · {characterCount} chars · ~{readingTimeMinutes} min
        read
      </span>
      <Badge variant="outline" className="h-5 text-[10px]">
        {LANG_BADGE[language]}
      </Badge>
      <Badge variant="outline" className="h-5 text-[10px]">
        {NEWSROOM_FORMAT_LABELS[newsroomFormat]}
      </Badge>
      <span
        className={
          dirty || saveStatus === "error"
            ? "font-medium text-amber-700 dark:text-amber-300"
            : ""
        }
      >
        {saveLabel}
      </span>
      <VersionIndicator
        revision={revision}
        editorVersion={editorVersion}
        lastSavedAt={lastSavedAt}
      />
    </div>
  );
}
