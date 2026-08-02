"use client";

import type { Editor } from "@tiptap/react";
import {
  Bold,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Table,
  Underline,
  Undo2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { ToolbarLayout } from "@/features/smart-editor/types/editor.types";

type ToolbarProps = {
  editor: Editor;
  layout?: ToolbarLayout;
  onFind?: () => void;
  onLink?: () => void;
};

export function Toolbar({
  editor,
  layout = "full",
  onFind,
  onLink,
}: ToolbarProps) {
  const minimal = layout === "minimal";

  return (
    <div
      className="flex flex-wrap items-center gap-0.5 border-b border-border/60 bg-muted/25 px-2 py-1.5"
      role="toolbar"
      aria-label="Formatting toolbar"
    >
      <Tool
        label="Bold (Ctrl+B)"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold />
      </Tool>
      <Tool
        label="Italic (Ctrl+I)"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic />
      </Tool>
      <Tool
        label="Underline (Ctrl+U)"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <Underline />
      </Tool>
      {!minimal ? (
        <Tool
          label="Highlight"
          active={editor.isActive("highlight")}
          onClick={() => editor.chain().focus().toggleHighlight().run()}
        >
          <Highlighter />
        </Tool>
      ) : null}

      <Separator orientation="vertical" className="mx-1 h-5" />

      {!minimal ? (
        <>
          <Tool
            label="Heading 1"
            active={editor.isActive("heading", { level: 1 })}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
          >
            <Heading1 />
          </Tool>
          <Tool
            label="Heading 2"
            active={editor.isActive("heading", { level: 2 })}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
          >
            <Heading2 />
          </Tool>
          <Tool
            label="Heading 3"
            active={editor.isActive("heading", { level: 3 })}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
          >
            <Heading3 />
          </Tool>
          <Separator orientation="vertical" className="mx-1 h-5" />
        </>
      ) : null}

      <Tool
        label="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List />
      </Tool>
      <Tool
        label="Numbered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered />
      </Tool>

      {layout === "full" ? (
        <>
          <Separator orientation="vertical" className="mx-1 h-5" />
          <Tool
            label="Block quote"
            active={editor.isActive("blockquote")}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            <Quote />
          </Tool>
          <Tool
            label="Code block"
            active={editor.isActive("codeBlock")}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          >
            <Code2 />
          </Tool>
          <Tool
            label="Insert table"
            onClick={() =>
              editor
                .chain()
                .focus()
                .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                .run()
            }
          >
            <Table />
          </Tool>
          <Tool label="Insert link (Ctrl+K)" onClick={onLink}>
            <Link2 />
          </Tool>
        </>
      ) : null}

      <Separator orientation="vertical" className="mx-1 h-5" />
      <Tool label="Undo (Ctrl+Z)" onClick={() => editor.chain().focus().undo().run()}>
        <Undo2 />
      </Tool>
      <Tool
        label="Redo (Ctrl+Shift+Z)"
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo2 />
      </Tool>

      {onFind && layout !== "minimal" ? (
        <>
          <Separator orientation="vertical" className="mx-1 h-5" />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={onFind}
          >
            Find
          </Button>
        </>
      ) : null}
    </div>
  );
}

function Tool({
  children,
  label,
  active,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <Button
      type="button"
      size="icon-sm"
      variant={active ? "secondary" : "ghost"}
      aria-label={label}
      title={label}
      className={cn(active && "bg-muted")}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
