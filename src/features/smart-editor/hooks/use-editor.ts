"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useEditor as useTiptapEditor, type Editor } from "@tiptap/react";

import { createEditorExtensions } from "@/features/smart-editor/lib/editor-extensions";
import {
  countWords,
  estimateReadingTimeMinutes,
  htmlToPlainText,
} from "@/features/smart-editor/lib/text-metrics";
import {
  DEFAULT_EDITOR_SETTINGS,
  MEDIAOS_EDITOR_VERSION,
} from "@/features/smart-editor/constants/editor.constants";
import type {
  EditorLanguage,
  EditorSettings,
  MediaOSEditorChangePayload,
} from "@/features/smart-editor/types/editor.types";

type UseMediaOSEditorOptions = {
  initialHtml?: string;
  placeholder?: string;
  disabled?: boolean;
  language?: EditorLanguage;
  settings?: Partial<EditorSettings>;
  onChange?: (payload: MediaOSEditorChangePayload) => void;
};

export function useMediaOSEditor({
  initialHtml = "<p></p>",
  placeholder = "Write in Malayalam, English, or Manglish…",
  disabled = false,
  language = "ml",
  settings: settingsPatch,
  onChange,
}: UseMediaOSEditorOptions) {
  const settings = useMemo(
    () => ({ ...DEFAULT_EDITOR_SETTINGS, ...settingsPatch }),
    [settingsPatch],
  );
  const [lang, setLanguage] = useState<EditorLanguage>(
    language ?? settings.defaultLanguage,
  );
  const [revision, setRevision] = useState(1);
  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const emitChange = useCallback(
    (editor: Editor, nextDirty = true) => {
      const contentHtml = editor.getHTML();
      const contentPlain = htmlToPlainText(contentHtml);
      const wordCount = countWords(contentPlain);
      const payload: MediaOSEditorChangePayload = {
        contentHtml,
        contentPlain,
        wordCount,
        characterCount: contentPlain.length,
        readingTimeMinutes: estimateReadingTimeMinutes(wordCount),
        language: lang,
        revision,
        dirty: nextDirty,
      };
      onChange?.(payload);
      return payload;
    },
    [lang, onChange, revision],
  );

  const editor = useTiptapEditor({
    immediatelyRender: false,
    extensions: createEditorExtensions(placeholder),
    content: initialHtml || "<p></p>",
    editable: !disabled,
    editorProps: {
      attributes: {
        class:
          "mediaos-editor-prose min-h-[22rem] flex-1 px-5 py-4 focus:outline-none",
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": "MediaOS Smart Editor document",
      },
    },
    onUpdate: ({ editor: current }) => {
      setDirty(true);
      emitChange(current, true);
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor) return;
    const el = editor.view.dom as HTMLElement;
    el.style.fontSize = `${settings.fontSize}px`;
    el.style.lineHeight = String(settings.lineHeight);
  }, [editor, settings.fontSize, settings.lineHeight]);

  const getPayload = useCallback((): MediaOSEditorChangePayload | null => {
    if (!editor) return null;
    return emitChange(editor, dirty);
  }, [dirty, editor, emitChange]);

  const markSaved = useCallback(() => {
    setDirty(false);
    setLastSavedAt(new Date().toISOString());
    setRevision((r) => r + 1);
  }, []);

  const insertTextAtCursor = useCallback(
    (text: string) => {
      if (!editor || !text) return;
      editor.chain().focus().insertContent(text).run();
    },
    [editor],
  );

  const replaceSelection = useCallback(
    (text: string) => {
      if (!editor) return;
      editor.chain().focus().insertContent(text).run();
    },
    [editor],
  );

  const getSelectedText = useCallback(() => {
    if (!editor) return "";
    const { from, to } = editor.state.selection;
    return editor.state.doc.textBetween(from, to, " ");
  }, [editor]);

  const getDocumentText = useCallback(() => {
    if (!editor) return "";
    return htmlToPlainText(editor.getHTML());
  }, [editor]);

  return {
    editor,
    settings,
    language: lang,
    setLanguage,
    revision,
    dirty,
    lastSavedAt,
    editorVersion: MEDIAOS_EDITOR_VERSION,
    getPayload,
    markSaved,
    insertTextAtCursor,
    replaceSelection,
    getSelectedText,
    getDocumentText,
  };
}

/** Alias matching the module spec name. */
export const useEditor = useMediaOSEditor;
