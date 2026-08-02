"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";
import {
  Bold,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Redo2,
  Undo2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  countWords,
  htmlToPlainText,
} from "@/features/story-workspace/lib/script-utils";

type ScriptEditorProps = {
  initialHtml: string;
  disabled?: boolean;
  onChange: (payload: {
    contentHtml: string;
    contentPlain: string;
    wordCount: number;
    characterCount: number;
  }) => void;
};

export function ScriptEditor({
  initialHtml,
  disabled,
  onChange,
}: ScriptEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Write the story script…",
      }),
    ],
    content: initialHtml || "<p></p>",
    editable: !disabled,
    editorProps: {
      attributes: {
        class:
          "min-h-[28rem] px-4 py-3 text-sm leading-7 focus:outline-none [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5",
      },
    },
    onUpdate: ({ editor: current }) => {
      const contentHtml = current.getHTML();
      const contentPlain = htmlToPlainText(contentHtml);
      onChange({
        contentHtml,
        contentPlain,
        wordCount: countWords(contentPlain),
        characterCount: contentPlain.length,
      });
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  if (!editor) {
    return (
      <div className="min-h-[28rem] rounded-xl border border-border/60 bg-muted/20" />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-background">
      <div className="flex flex-wrap items-center gap-1 border-b border-border/60 bg-muted/20 px-2 py-1.5">
        <ToolbarButton
          label="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic />
        </ToolbarButton>
        <ToolbarButton
          label="Heading"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 />
        </ToolbarButton>
        <Separator orientation="vertical" className="mx-1 h-5" />
        <ToolbarButton
          label="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List />
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered />
        </ToolbarButton>
        <Separator orientation="vertical" className="mx-1 h-5" />
        <ToolbarButton
          label="Undo"
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 />
        </ToolbarButton>
        <ToolbarButton
          label="Redo"
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarButton({
  children,
  label,
  active,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="icon-sm"
      variant={active ? "secondary" : "ghost"}
      aria-label={label}
      className={cn(active && "bg-muted")}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
