"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Clapperboard, Sparkles } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { generateTimelineDraftAction } from "@/features/ai/intelligence/actions/intelligence.actions";
import { RecommendationList } from "@/features/ai/intelligence/components/recommendation-list";
import type { AIRecommendation } from "@/features/ai/intelligence/types/intelligence.types";
import type { CreativeProject } from "@/features/creative-studio/types/creative-studio.types";

type TimelineIntelligenceHomeCardProps = {
  projects: CreativeProject[];
  onOpenCreate: () => void;
};

/**
 * Creative Studio home entry for Timeline Intelligence.
 * Drafts are editable plans — open a project to place scenes on the timeline.
 */
export function TimelineIntelligenceHomeCard({
  projects,
  onOpenCreate,
}: TimelineIntelligenceHomeCardProps) {
  const [pending, startTransition] = useTransition();
  const [latest, setLatest] = useState<AIRecommendation | null>(null);
  const primary = projects[0] ?? null;

  return (
    <div className="space-y-3 rounded-md border border-border/50 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Timeline Intelligence
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Build an editable draft timeline from Scene Library templates. Never
            renders a final video. Accept places beats on your project timeline.
            Also available inside a project → right panel →{" "}
            <strong>AI Assistant</strong>.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={pending || !primary}
            onClick={() => {
              if (!primary) return;
              startTransition(async () => {
                const result = await generateTimelineDraftAction({
                  projectId: primary.id,
                  storyTitle: primary.title,
                  storyType: "news",
                });
                if (!result.success) {
                  toast.error(result.error);
                  return;
                }
                setLatest(result.data);
                toast.success("Timeline draft ready");
              });
            }}
          >
            <Sparkles className="size-3.5" />
            Draft timeline
          </Button>
          {primary ? (
            <Link
              href={`/creative-studio/projects/${primary.id}?panel=ai`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <Clapperboard className="size-3.5" />
              Open project AI
            </Link>
          ) : (
            <Button type="button" size="sm" variant="outline" onClick={onOpenCreate}>
              Create a project first
            </Button>
          )}
        </div>
      </div>
      {!primary ? (
        <p className="text-xs text-muted-foreground">
          Create or open a Creative Studio project to use Timeline Intelligence.
          Scene Composer (Motion Scenes) does not include this panel.
        </p>
      ) : null}
      <RecommendationList
        items={latest ? [latest] : []}
        emptyMessage={
          primary
            ? "Draft a timeline to see editable scene beats."
            : "No project available yet."
        }
        timelineApplyContext={
          primary ? { projectId: primary.id } : undefined
        }
        onTimelineApplied={() => {
          setLatest((prev) =>
            prev ? { ...prev, status: "accepted" } : prev,
          );
        }}
      />
      {latest?.status === "accepted" && primary ? (
        <Link
          href={`/creative-studio/projects/${primary.id}?panel=ai`}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "w-full justify-center",
          )}
        >
          Open project timeline to edit beats →
        </Link>
      ) : null}
    </div>
  );
}
