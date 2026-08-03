"use client";

import { TimelineIntelligencePanel } from "@/features/ai/intelligence/components/timeline-intelligence-panel";
import type {
  CreativeTimeline,
  CreativeTimelineClip,
  CreativeTimelineTrack,
} from "@/features/creative-studio/types/creative-studio.types";

type AiAssistantPanelProps = {
  projectId?: string | null;
  timelineId?: string | null;
  storyTitle?: string;
  onTimelineApplied?: (input: {
    clips: CreativeTimelineClip[];
    trackId: string;
    track: CreativeTimelineTrack;
    timeline: CreativeTimeline;
    projectId: string | null;
  }) => void;
};

/**
 * Creative Studio AI dock — Module 6.0 Timeline Intelligence.
 * Accept applies editable draft beats to the project timeline.
 */
export function AiAssistantPanel({
  projectId = null,
  timelineId = null,
  storyTitle,
  onTimelineApplied,
}: AiAssistantPanelProps) {
  return (
    <TimelineIntelligencePanel
      projectId={projectId}
      timelineId={timelineId}
      storyTitle={storyTitle}
      onTimelineApplied={onTimelineApplied}
    />
  );
}
