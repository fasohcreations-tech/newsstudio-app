"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";

import { getEditorProviders } from "@/features/smart-editor/services/providers/registry";
import type { ManglishCandidate } from "@/features/smart-editor/services/interfaces/editor-services";

export type ManglishPopupState = {
  open: boolean;
  query: string;
  candidates: ManglishCandidate[];
  activeIndex: number;
  /** Document positions of the Latin token being composed. */
  from: number;
  to: number;
};

type UseManglishOptions = {
  editor: Editor | null;
  enabled: boolean;
  autoTransliteration: boolean;
};

const EMPTY_POPUP: ManglishPopupState = {
  open: false,
  query: "",
  candidates: [],
  activeIndex: 0,
  from: 0,
  to: 0,
};

function getComposingWord(editor: Editor): {
  word: string;
  from: number;
  to: number;
} | null {
  const { $from } = editor.state.selection;
  if (!$from.parent.isTextblock) return null;
  const textBefore = $from.parent.textBetween(0, $from.parentOffset, "");
  const match = textBefore.match(/([A-Za-z]+)$/);
  if (!match) return null;
  const word = match[1]!;
  const to = editor.state.selection.from;
  const from = to - word.length;
  return { word, from, to };
}

/**
 * Manglish typing helper with live candidate picker.
 * ArrowUp/Down or 1–9 to choose · Tab/Enter to commit · Space commits top match.
 */
export function useManglish({
  editor,
  enabled,
  autoTransliteration,
}: UseManglishOptions) {
  const [active, setActive] = useState(enabled);
  const [popup, setPopup] = useState<ManglishPopupState>(EMPTY_POPUP);
  const popupRef = useRef(popup);
  popupRef.current = popup;
  const suggestTimer = useRef<number | null>(null);

  const closePopup = useCallback(() => {
    setPopup(EMPTY_POPUP);
  }, []);

  const refreshSuggestions = useCallback(
    async (word: string, from: number, to: number) => {
      if (!word || word.length < 1) {
        closePopup();
        return;
      }
      const { manglish } = getEditorProviders();
      const candidates = await manglish.suggest(word);
      if (candidates.length === 0) {
        closePopup();
        return;
      }
      setPopup({
        open: true,
        query: word,
        candidates: candidates.slice(0, 8),
        activeIndex: 0,
        from,
        to,
      });
    },
    [closePopup],
  );

  const scheduleSuggest = useCallback(() => {
    if (!editor || !active) return;
    if (suggestTimer.current) window.clearTimeout(suggestTimer.current);
    suggestTimer.current = window.setTimeout(() => {
      const composing = getComposingWord(editor);
      if (!composing) {
        closePopup();
        return;
      }
      void refreshSuggestions(composing.word, composing.from, composing.to);
    }, 160);
  }, [active, closePopup, editor, refreshSuggestions]);

  const applyCandidate = useCallback(
    (candidate: ManglishCandidate, appendSpace = false) => {
      if (!editor) return;
      const current = popupRef.current;
      const composing = getComposingWord(editor);
      const from = composing?.from ?? current.from;
      const to = composing?.to ?? current.to;
      if (to <= from) return;

      editor
        .chain()
        .focus()
        .deleteRange({ from, to })
        .insertContent(candidate.text + (appendSpace ? " " : ""))
        .run();
      closePopup();
    },
    [closePopup, editor],
  );

  const convertText = useCallback(async (latin: string) => {
    const { manglish } = getEditorProviders();
    return manglish.convert(latin);
  }, []);

  const convertSelection = useCallback(async () => {
    if (!editor || !active) return;
    const { from, to } = editor.state.selection;
    const selected = editor.state.doc.textBetween(from, to, " ");
    if (!selected.trim()) return;
    const result = await convertText(selected);
    editor.chain().focus().insertContent(result.output).run();
  }, [active, convertText, editor]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!editor || !active) return;
      const current = popupRef.current;

      if (current.open && current.candidates.length > 0) {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setPopup((p) => ({
            ...p,
            activeIndex: (p.activeIndex + 1) % p.candidates.length,
          }));
          return;
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          setPopup((p) => ({
            ...p,
            activeIndex:
              (p.activeIndex - 1 + p.candidates.length) % p.candidates.length,
          }));
          return;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          closePopup();
          return;
        }
        if (/^[1-9]$/.test(event.key)) {
          const idx = Number(event.key) - 1;
          if (idx < current.candidates.length) {
            event.preventDefault();
            applyCandidate(current.candidates[idx]!);
            return;
          }
        }
        if (event.key === "Tab") {
          event.preventDefault();
          applyCandidate(current.candidates[current.activeIndex]!);
          return;
        }
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          applyCandidate(current.candidates[current.activeIndex]!);
          return;
        }
        if (event.key === " " && autoTransliteration) {
          event.preventDefault();
          applyCandidate(current.candidates[current.activeIndex]!, true);
          return;
        }
      }

      if (
        autoTransliteration &&
        (event.key === " " || event.key === "Enter") &&
        !current.open
      ) {
        const composing = getComposingWord(editor);
        if (!composing) return;
        void (async () => {
          const result = await convertText(composing.word);
          if (!result.changed) return;
          editor
            .chain()
            .focus()
            .deleteRange({ from: composing.from, to: composing.to })
            .insertContent(result.output)
            .run();
        })();
      }
    },
    [
      active,
      applyCandidate,
      autoTransliteration,
      closePopup,
      convertText,
      editor,
    ],
  );

  useEffect(() => {
    if (!editor || !active) {
      closePopup();
      return;
    }

    const onUpdate = () => scheduleSuggest();
    editor.on("selectionUpdate", onUpdate);
    editor.on("update", onUpdate);
    return () => {
      editor.off("selectionUpdate", onUpdate);
      editor.off("update", onUpdate);
      if (suggestTimer.current) window.clearTimeout(suggestTimer.current);
    };
  }, [active, closePopup, editor, scheduleSuggest]);

  return {
    active,
    setActive,
    popup,
    convertText,
    convertSelection,
    handleKeyDown,
    applyCandidate,
    closePopup,
    setActiveIndex: (index: number) =>
      setPopup((p) => ({ ...p, activeIndex: index })),
  };
}
