"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";

type TextLayerContentProps = {
  text: string;
  editing: boolean;
  style: CSSProperties;
  className?: string;
  placeholder?: string;
  onCommit: (next: string) => void;
  onCancel: () => void;
};

/**
 * Shared Text Layer content node for StoryLivePreview + Design Workspace.
 * Double-click is handled by the parent shell; this owns the editable surface.
 */
export function TextLayerContent({
  text,
  editing,
  style,
  className,
  placeholder = "Text",
  onCommit,
  onCancel,
}: TextLayerContentProps) {
  const ref = useRef<HTMLDivElement>(null);
  const draftRef = useRef(text);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!editing) return;
    cancelledRef.current = false;
    const el = ref.current;
    if (!el) return;
    draftRef.current = text;
    el.textContent = text;
    el.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(el);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, [editing, text]);

  if (!editing) {
    return (
      <div
        data-text-layer
        className={className}
        style={{
          ...style,
          minWidth: 0,
          minHeight: 0,
        }}
      >
        {text || (
          <span style={{ opacity: 0.45 }}>{placeholder}</span>
        )}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      data-text-layer
      data-text-editing
      contentEditable
      suppressContentEditableWarning
      spellCheck
      lang="ml"
      className={className}
      style={{
        ...style,
        minWidth: 0,
        minHeight: 0,
        outline: "1px solid rgba(56,189,248,0.85)",
        outlineOffset: 2,
        cursor: "text",
        userSelect: "text",
        caretColor: "#38BDF8",
      }}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onInput={() => {
        draftRef.current = ref.current?.innerText ?? "";
      }}
      onBlur={() => {
        if (cancelledRef.current) {
          cancelledRef.current = false;
          return;
        }
        onCommit(draftRef.current);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          cancelledRef.current = true;
          onCancel();
          (event.currentTarget as HTMLDivElement).blur();
          return;
        }
        // Keep Enter as newline for paragraph/rich text; Ctrl+Enter commits.
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          (event.currentTarget as HTMLDivElement).blur();
        }
      }}
    />
  );
}
