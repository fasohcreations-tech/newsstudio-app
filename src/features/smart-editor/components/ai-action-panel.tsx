"use client";

import { useState, useTransition } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { runEditorAIAction } from "@/features/smart-editor/actions/editor-ai.actions";
import {
  EDITOR_AI_ACTION_LABELS,
} from "@/features/smart-editor/constants/editor.constants";
import {
  EDITOR_AI_ACTIONS,
  type EditorAIAction,
  type EditorLanguage,
} from "@/features/smart-editor/types/editor.types";

type AIActionPanelProps = {
  language: EditorLanguage;
  storyId?: string;
  contentObjectId?: string;
  getSourceText: () => string;
  onApply: (text: string) => void;
};

export function AIActionPanel({
  language,
  storyId,
  contentObjectId,
  getSourceText,
  onApply,
}: AIActionPanelProps) {
  const [pending, startTransition] = useTransition();
  const [active, setActive] = useState<EditorAIAction | null>(null);
  const [preview, setPreview] = useState("");

  const run = (action: EditorAIAction) => {
    const text = getSourceText().trim();
    if (!text) {
      toast.error("Select text or write something first.");
      return;
    }
    setActive(action);
    startTransition(async () => {
      const result = await runEditorAIAction({
        action,
        text,
        language,
        storyId,
        contentObjectId,
        targetLanguage: action === "translate" ? (language === "en" ? "ml" : "en") : undefined,
      });
      setActive(null);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setPreview(result.data.text);
      toast.success(`${EDITOR_AI_ACTION_LABELS[action]} ready`);
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex items-center gap-1.5 px-0.5">
        <Sparkles className="size-3.5 text-muted-foreground" />
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          AI tools
        </p>
      </div>
      <ScrollArea className="max-h-52">
        <div className="grid grid-cols-1 gap-1.5 pr-2">
          {EDITOR_AI_ACTIONS.map((action) => (
            <Button
              key={action}
              type="button"
              size="sm"
              variant="outline"
              className="h-8 justify-start text-[11px]"
              disabled={pending}
              onClick={() => run(action)}
            >
              {pending && active === action ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : null}
              {EDITOR_AI_ACTION_LABELS[action]}
            </Button>
          ))}
        </div>
      </ScrollArea>

      {preview ? (
        <div className="space-y-2 rounded-lg border border-border/60 bg-background/70 p-2">
          <p className="text-[10px] font-medium text-muted-foreground uppercase">
            Preview
          </p>
          <p className="max-h-40 overflow-auto whitespace-pre-wrap text-xs leading-relaxed">
            {preview}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                onApply(preview);
                setPreview("");
              }}
            >
              Insert / Replace
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => setPreview("")}
            >
              Dismiss
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
