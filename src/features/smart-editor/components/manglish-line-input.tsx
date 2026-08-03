"use client";

import { useEffect, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

import { ManglishCandidatePopup } from "@/features/smart-editor/components/manglish-candidate-popup";
import { useManglish } from "@/features/smart-editor/hooks/use-manglish";
import { cn } from "@/lib/utils";

type ManglishLineInputProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Single-line Manglish field (Google Input Tools / manglish.app style).
 * Used for short lower-info slots such as Sub Headlines.
 */
export function ManglishLineInput({
  id,
  value,
  onChange,
  maxLength = 72,
  placeholder = "Type Manglish…",
  disabled = false,
  className,
}: ManglishLineInputProps) {
  const lastEmitted = useRef(value);
  const maxLengthRef = useRef(maxLength);
  maxLengthRef.current = maxLength;

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        horizontalRule: false,
        hardBreak: false,
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value.trim() ? `<p>${escapeHtml(value)}</p>` : "<p></p>",
    editable: !disabled,
    editorProps: {
      attributes: {
        id: id ?? "",
        class:
          "min-h-9 w-full px-3 py-2 text-sm leading-snug focus:outline-none [&_p]:m-0",
        role: "textbox",
        "aria-multiline": "false",
      },
      handleKeyDown: (_view, event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: next }) => {
      let plain = next.getText().replace(/\n+/g, " ").trim();
      if (plain.length > maxLengthRef.current) {
        plain = plain.slice(0, maxLengthRef.current);
        next.commands.setContent(`<p>${escapeHtml(plain)}</p>`);
      }
      if (plain === lastEmitted.current) return;
      lastEmitted.current = plain;
      onChange(plain);
    },
  });

  const manglish = useManglish({
    editor,
    enabled: !disabled,
    autoTransliteration: true,
  });

  const manglishKeyHandler = useRef(manglish.handleKeyDown);
  manglishKeyHandler.current = manglish.handleKeyDown;

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor) return;
    const handler = (event: KeyboardEvent) => {
      manglishKeyHandler.current(event);
    };
    const dom = editor.view.dom;
    dom.addEventListener("keydown", handler, true);
    return () => dom.removeEventListener("keydown", handler, true);
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    if (value === lastEmitted.current) return;
    const current = editor.getText().replace(/\n+/g, " ").trim();
    if (current === value.trim()) {
      lastEmitted.current = value;
      return;
    }
    lastEmitted.current = value;
    editor.commands.setContent(
      value.trim() ? `<p>${escapeHtml(value)}</p>` : "<p></p>",
    );
  }, [editor, value]);

  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-input bg-background shadow-xs transition-[color,box-shadow]",
        "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      <EditorContent editor={editor} />
      <ManglishCandidatePopup
        popup={manglish.popup}
        onSelect={(candidate) => manglish.applyCandidate(candidate)}
        onHover={(index) => manglish.setActiveIndex(index)}
      />
    </div>
  );
}
