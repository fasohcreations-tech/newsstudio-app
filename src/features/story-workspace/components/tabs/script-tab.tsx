"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MediaOSEditor } from "@/features/smart-editor/components/mediaos-editor";
import { approveScriptAction } from "@/features/story-voice/actions/voice.actions";
import { STORY_VOICE_STATUS_LABELS } from "@/features/story-voice/constants/voice.constants";
import type { ScriptSavePayload } from "@/features/story-workspace/types/workspace.types";
import type { StoryWithRelations } from "@/features/newsroom/types/story.types";
import type { StoryVoiceStatus } from "@/shared/types/database.types";

type ScriptTabProps = {
  story: StoryWithRelations;
  initialHtml: string;
  wordCount: number;
  characterCount: number;
  disabled?: boolean;
  onChange: (payload: ScriptSavePayload) => void;
  onStoryUpdated?: (story: StoryWithRelations) => void;
};

/**
 * Story Script surface — Smart Editor + Editorial Approval.
 */
export function ScriptTab({
  story,
  initialHtml,
  disabled,
  onChange,
  onStoryUpdated,
}: ScriptTabProps) {
  const [pending, startTransition] = useTransition();
  const [localStory, setLocalStory] = useState(story);
  const [editorKey, setEditorKey] = useState(0);
  const [editorHtml, setEditorHtml] = useState(initialHtml);

  useEffect(() => {
    setLocalStory(story);
  }, [story]);

  useEffect(() => {
    setEditorHtml(initialHtml);
    setEditorKey((value) => value + 1);
  }, [initialHtml]);

  const approved = Boolean(localStory.approved_script && localStory.approved_at);
  const voiceStatus = (localStory.voice_status ?? "none") as StoryVoiceStatus;

  const approvalLabel = useMemo(() => {
    if (!approved) return "Script not approved";
    if (voiceStatus === "stale") return "Approved — voice is stale";
    return "Script approved";
  }, [approved, voiceStatus]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/50 bg-muted/20 px-3 py-2">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-semibold">Editorial approval</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={approved ? "default" : "outline"} className="text-[10px]">
              {approvalLabel}
            </Badge>
            {approved ? (
              <Badge variant="secondary" className="text-[10px]">
                Voice: {STORY_VOICE_STATUS_LABELS[voiceStatus]}
              </Badge>
            ) : null}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Approve locks a plain-text snapshot for TTS. AI Producer Script
            approval also writes this document.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={disabled || pending}
          onClick={() => {
            startTransition(async () => {
              const result = await approveScriptAction(localStory.id);
              if (!result.success) {
                toast.error(result.error);
                return;
              }
              const next = { ...localStory, ...result.data };
              setLocalStory(next);
              onStoryUpdated?.(next);
              toast.success("Script approved — ready for voice generation");
            });
          }}
        >
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="size-3.5" />
          )}
          Approve Script
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Script uses the MediaOS Smart Editor. Autosave remains on the story
        script. Open the full playground under AI Center → Smart Editor.
      </p>
      <MediaOSEditor
        key={`${localStory.id}-${editorKey}`}
        variant="compact"
        storyId={localStory.id}
        initialHtml={editorHtml}
        initialLanguage="ml"
        disabled={disabled}
        placeholder="Write the story script in Malayalam, English, or Manglish…"
        settings={{
          toolbarLayout: "compact",
          enableManglish: true,
          enableVoiceDictation: true,
          enableHandwriting: true,
          autoSave: false,
          autoTransliteration: true,
          newsroomFormat: "tv_script",
        }}
        onChange={(payload) => {
          onChange({
            contentHtml: payload.contentHtml,
            contentPlain: payload.contentPlain,
            wordCount: payload.wordCount,
            characterCount: payload.characterCount,
          });
        }}
      />
    </div>
  );
}
