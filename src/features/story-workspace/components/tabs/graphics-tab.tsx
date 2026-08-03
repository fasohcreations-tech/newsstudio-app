"use client";

import { StorySceneLibraryTab } from "@/features/story-scene-builder/components/story-scene-library-tab";
import type { StoryWithRelations } from "@/features/newsroom/types/story.types";

type StoryGraphicsTabProps = {
  story: StoryWithRelations;
  disabled?: boolean;
  onOpenVoice?: () => void;
  onOpenScript?: () => void;
  /** @deprecated kept for older call sites */
  storyId?: string;
  storyTitle?: string;
};

/**
 * Graphics tab hosts the Story Scene Library (Production Pipeline Step 2).
 */
export function StoryGraphicsTab({
  story,
  disabled,
  onOpenVoice,
  onOpenScript,
}: StoryGraphicsTabProps) {
  return (
    <StorySceneLibraryTab
      story={story}
      disabled={disabled}
      onOpenVoice={onOpenVoice}
      onOpenScript={onOpenScript}
    />
  );
}
