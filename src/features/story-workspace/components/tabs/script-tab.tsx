"use client";

import { MediaOSEditor } from "@/features/smart-editor/components/mediaos-editor";
import type { ScriptSavePayload } from "@/features/story-workspace/types/workspace.types";

type ScriptTabProps = {
  initialHtml: string;
  wordCount: number;
  characterCount: number;
  disabled?: boolean;
  onChange: (payload: ScriptSavePayload) => void;
  storyId?: string;
};

/**
 * Story Script surface — uses Universal Smart Malayalam Editor (compact).
 * Workspace autosave still owns persistence via onChange → story_scripts.
 */
export function ScriptTab({
  initialHtml,
  disabled,
  onChange,
  storyId,
}: ScriptTabProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Script uses the MediaOS Smart Editor. Autosave remains on the story
        script. Open the full playground under AI Center → Smart Editor.
      </p>
      <MediaOSEditor
        variant="compact"
        storyId={storyId}
        initialHtml={initialHtml}
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
