"use client";

import { StoryAssetDiscoveryTab } from "@/features/ai-asset-discovery/components/story-asset-discovery-tab";
import type { StoryWithRelations } from "@/features/newsroom/types/story.types";

type StoryAssetsTabProps = {
  story: StoryWithRelations;
  disabled?: boolean;
};

/**
 * Assets tab — AI Asset Discovery Engine (Pipeline Step 2A).
 */
export function StoryAssetsTab({ story, disabled }: StoryAssetsTabProps) {
  return <StoryAssetDiscoveryTab story={story} disabled={disabled} />;
}
