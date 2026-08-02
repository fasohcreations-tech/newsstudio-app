"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type FindReplaceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editor: Editor | null;
  mode?: "find" | "replace";
};

export function FindReplaceDialog({
  open,
  onOpenChange,
  editor,
  mode = "find",
}: FindReplaceDialogProps) {
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [message, setMessage] = useState("");

  const findNext = () => {
    if (!editor || !query) return;
    const html = editor.getHTML();
    const plain = editor.getText();
    const idx = plain.toLowerCase().indexOf(query.toLowerCase());
    if (idx < 0) {
      setMessage("No matches");
      return;
    }
    // Approximate selection by walking text nodes via ProseMirror positions
    let pos = 1;
    let found = false;
    editor.state.doc.descendants((node, nodePos) => {
      if (found || !node.isText || !node.text) return;
      const lower = node.text.toLowerCase();
      const local = lower.indexOf(query.toLowerCase());
      if (local >= 0) {
        editor
          .chain()
          .focus()
          .setTextSelection({
            from: nodePos + local,
            to: nodePos + local + query.length,
          })
          .run();
        found = true;
      }
      pos = nodePos;
      void pos;
      void html;
    });
    setMessage(found ? "Found" : "No matches");
  };

  const replaceOne = () => {
    if (!editor || !query) return;
    const { from, to } = editor.state.selection;
    const selected = editor.state.doc.textBetween(from, to, "");
    if (selected.toLowerCase() === query.toLowerCase()) {
      editor.chain().focus().insertContent(replacement).run();
      setMessage("Replaced");
      return;
    }
    findNext();
  };

  const replaceAll = () => {
    if (!editor || !query) return;
    const plain = editor.getText();
    const re = new RegExp(escapeRegExp(query), "gi");
    const count = (plain.match(re) || []).length;
    if (count === 0) {
      setMessage("No matches");
      return;
    }
    const next = plain.replace(re, replacement);
    editor.commands.setContent(`<p>${escapeHtml(next).replace(/\n/g, "</p><p>")}</p>`);
    setMessage(`Replaced ${count}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "replace" ? "Find and replace" : "Find"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find…"
            aria-label="Find text"
            onKeyDown={(e) => {
              if (e.key === "Enter") findNext();
            }}
          />
          {mode === "replace" ? (
            <Input
              value={replacement}
              onChange={(e) => setReplacement(e.target.value)}
              placeholder="Replace with…"
              aria-label="Replacement text"
            />
          ) : null}
          {message ? (
            <p className="text-xs text-muted-foreground">{message}</p>
          ) : null}
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" size="sm" onClick={findNext}>
            Find next
          </Button>
          {mode === "replace" ? (
            <>
              <Button type="button" variant="secondary" size="sm" onClick={replaceOne}>
                Replace
              </Button>
              <Button type="button" size="sm" onClick={replaceAll}>
                Replace all
              </Button>
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
