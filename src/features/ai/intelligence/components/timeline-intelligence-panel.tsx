"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Layers, Sparkles } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  generateTimelineDraftAction,
  recommendScenesAction,
} from "@/features/ai/intelligence/actions/intelligence.actions";
import { RecommendationList } from "@/features/ai/intelligence/components/recommendation-list";
import type { AIRecommendation } from "@/features/ai/intelligence/types/intelligence.types";
import type {
  CreativeTimeline,
  CreativeTimelineClip,
  CreativeTimelineTrack,
} from "@/features/creative-studio/types/creative-studio.types";

type TimelineIntelligencePanelProps = {
  projectId?: string | null;
  timelineId?: string | null;
  storyTitle?: string;
  storyType?: string;
  language?: string;
  onTimelineApplied?: (input: {
    clips: CreativeTimelineClip[];
    trackId: string;
    track: CreativeTimelineTrack;
    timeline: CreativeTimeline;
    projectId: string | null;
  }) => void;
};

/**
 * Creative Studio AI dock — Scene recommendations + editable timeline drafts.
 */
export function TimelineIntelligencePanel({
  projectId = null,
  timelineId = null,
  storyTitle,
  storyType = "news",
  language = "en",
  onTimelineApplied,
}: TimelineIntelligencePanelProps) {
  const [pending, startTransition] = useTransition();
  const [timelineDraft, setTimelineDraft] = useState<AIRecommendation | null>(
    null,
  );
  const [sceneRecs, setSceneRecs] = useState<AIRecommendation | null>(null);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border/50 px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Creative Studio AI
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Scene Intelligence recommends templates. Timeline Intelligence builds
          editable drafts — never rendered video. Accept places beats on the
          project timeline.
        </p>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-3">
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold">Scene Intelligence</p>
                <p className="text-[11px] text-muted-foreground">
                  Rank Scene Library templates for this package.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    const result = await recommendScenesAction({
                      storyType,
                      language,
                    });
                    if (!result.success) {
                      toast.error(result.error);
                      return;
                    }
                    setSceneRecs(result.data);
                    toast.success("Scene recommendations ready");
                  });
                }}
              >
                <Layers className="size-3.5" />
                Recommend
              </Button>
            </div>
            <RecommendationList
              items={sceneRecs ? [sceneRecs] : []}
              emptyMessage="Recommend scenes to see template matches."
            />
            <Link
              href="/creative-studio/scenes"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "h-7 px-0 text-[11px]",
              )}
            >
              Open Scene Library →
            </Link>
          </section>

          <Separator />

          <section className="space-y-2">
            <div>
              <p className="text-xs font-semibold">Timeline Intelligence</p>
              <p className="text-[11px] text-muted-foreground">
                Assemble an editable draft from Scene Library templates. Accept
                places those beats on this project timeline.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    const result = await generateTimelineDraftAction({
                      projectId,
                      timelineId,
                      storyTitle,
                      storyType,
                    });
                    if (!result.success) {
                      toast.error(result.error);
                      return;
                    }
                    setTimelineDraft(result.data);
                    toast.success("Timeline draft ready for review");
                  });
                }}
              >
                <Sparkles className="size-3.5" />
                Draft timeline
              </Button>
              {timelineDraft ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => {
                    startTransition(async () => {
                      const result = await generateTimelineDraftAction({
                        projectId,
                        timelineId,
                        storyTitle,
                        storyType,
                        sourceRecommendationId: timelineDraft.id,
                        regenerateAll: true,
                      });
                      if (!result.success) {
                        toast.error(result.error);
                        return;
                      }
                      setTimelineDraft(result.data);
                      toast.success("Timeline regenerated");
                    });
                  }}
                >
                  Regenerate all
                </Button>
              ) : null}
            </div>
            <RecommendationList
              items={timelineDraft ? [timelineDraft] : []}
              emptyMessage="Generate a draft to review AI scene decisions."
              timelineApplyContext={{ projectId, timelineId }}
              onTimelineApplied={(applied) => {
                setTimelineDraft((prev) =>
                  prev ? { ...prev, status: "accepted" } : prev,
                );
                onTimelineApplied?.(applied);
              }}
            />
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}
