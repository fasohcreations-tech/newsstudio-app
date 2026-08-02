"use client";

import { Languages } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  NEWSROOM_FORMAT_LABELS,
} from "@/features/smart-editor/constants/editor.constants";
import {
  EDITOR_LANGUAGES,
  NEWSROOM_FORMATS,
  type EditorLanguage,
  type NewsroomFormat,
} from "@/features/smart-editor/types/editor.types";

type LanguageToolbarProps = {
  language: EditorLanguage;
  onLanguageChange: (lang: EditorLanguage) => void;
  manglishOn: boolean;
  onToggleManglish: () => void;
  autoTransliteration: boolean;
  onConvertSelection: () => void;
  newsroomFormat: NewsroomFormat;
  onFormatChange: (format: NewsroomFormat) => void;
};

const LANG_LABELS: Record<EditorLanguage, string> = {
  ml: "Malayalam",
  en: "English",
  manglish: "Manglish",
};

export function LanguageToolbar({
  language,
  onLanguageChange,
  manglishOn,
  onToggleManglish,
  autoTransliteration,
  onConvertSelection,
  newsroomFormat,
  onFormatChange,
}: LanguageToolbarProps) {
  return (
    <div
      className="flex flex-wrap items-center gap-2 border-b border-border/50 bg-background/80 px-2 py-1.5"
      role="toolbar"
      aria-label="Language tools"
    >
      <Languages className="size-3.5 text-muted-foreground" aria-hidden />
      <Select
        value={language}
        onValueChange={(v) => onLanguageChange((v as EditorLanguage) ?? "ml")}
      >
        <SelectTrigger className="h-7 w-[8.5rem] text-xs" aria-label="Editor language">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {EDITOR_LANGUAGES.map((id) => (
            <SelectItem key={id} value={id}>
              {LANG_LABELS[id]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        type="button"
        size="sm"
        variant={manglishOn ? "secondary" : "ghost"}
        className="h-7 text-xs"
        aria-pressed={manglishOn}
        onClick={onToggleManglish}
        title="Manglish → Malayalam (Google Input Tools / manglish.app format)"
      >
        Manglish {manglishOn ? "ON" : "OFF"}
      </Button>

      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7 text-xs"
        disabled={!manglishOn}
        onClick={onConvertSelection}
        title={
          autoTransliteration
            ? "Convert selection (auto converts on Space/Enter)"
            : "Convert selection"
        }
      >
        Convert
      </Button>

      <Select
        value={newsroomFormat}
        onValueChange={(v) =>
          onFormatChange((v as NewsroomFormat) ?? "website_article")
        }
      >
        <SelectTrigger className="h-7 w-[11rem] text-xs" aria-label="Newsroom format">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {NEWSROOM_FORMATS.map((id) => (
            <SelectItem key={id} value={id}>
              {NEWSROOM_FORMAT_LABELS[id]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
