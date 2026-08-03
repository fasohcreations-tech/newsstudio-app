"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AI_INTELLIGENCE_DOMAIN_LABELS,
  AI_RECOMMENDATION_STATUS_LABELS,
} from "@/features/ai/intelligence/constants/intelligence.constants";
import {
  acceptIntelligenceRecommendationAction,
  applyTimelineDraftAction,
  rejectIntelligenceRecommendationAction,
} from "@/features/ai/intelligence/actions/intelligence.actions";
import type { AIRecommendation } from "@/features/ai/intelligence/types/intelligence.types";
import type {
  SceneRecommendationItem,
  TimelineDraftPayload,
} from "@/features/ai/intelligence/types/intelligence.types";
import type {
  CreativeTimeline,
  CreativeTimelineClip,
  CreativeTimelineTrack,
} from "@/features/creative-studio/types/creative-studio.types";

type RecommendationListProps = {
  items: AIRecommendation[];
  emptyMessage?: string;
  onChanged?: () => void;
  /** When set, timeline Accept places draft beats on this project timeline. */
  timelineApplyContext?: {
    projectId?: string | null;
    timelineId?: string | null;
  };
  onTimelineApplied?: (input: {
    clips: CreativeTimelineClip[];
    trackId: string;
    track: CreativeTimelineTrack;
    timeline: CreativeTimeline;
    projectId: string | null;
  }) => void;
};

function ScenePayloadDetails({ payload }: { payload: Record<string, unknown> }) {
  const recommendations = Array.isArray(payload.recommendations)
    ? (payload.recommendations as SceneRecommendationItem[])
    : [];
  const offline = payload.liveModel === false || Boolean(payload.orchestratorError);

  if (recommendations.length === 0) {
    return (
      <p className="mt-2 text-xs text-muted-foreground">
        No ranked templates in this result.
      </p>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      {offline ? (
        <p className="text-[11px] text-amber-700 dark:text-amber-400">
          Offline ranking (Gemini key not configured). Results still work — add{" "}
          <code className="text-[10px]">GEMINI_API_KEY</code> or{" "}
          <code className="text-[10px]">GOOGLE_API_KEY</code> in{" "}
          <code className="text-[10px]">.env.local</code> for live AI.
        </p>
      ) : null}
      <ul className="space-y-1.5">
        {recommendations.slice(0, 6).map((scene, index) => (
          <li
            key={`${scene.sceneId ?? scene.sceneName}-${index}`}
            className="flex items-start justify-between gap-2 rounded border border-border/40 px-2 py-1.5"
          >
            <div className="min-w-0">
              <p className="text-xs font-medium">
                {index + 1}. {scene.sceneName}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {scene.sceneType}
                {typeof scene.score === "number"
                  ? ` · ${Math.round(scene.score * 100)}% match`
                  : ""}
              </p>
              {scene.reasons?.[0] ? (
                <p className="text-[10px] text-muted-foreground line-clamp-1">
                  {scene.reasons[0]}
                </p>
              ) : null}
            </div>
            {scene.sceneId ? (
              <Link
                href={`/creative-studio/scenes/${scene.sceneId}`}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "h-7 shrink-0 text-[10px]",
                )}
              >
                Open
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TimelinePayloadDetails({
  payload,
}: {
  payload: Record<string, unknown>;
}) {
  const draft = payload as Partial<TimelineDraftPayload> & {
    liveModel?: boolean;
    orchestratorError?: string | null;
  };
  const scenes = Array.isArray(draft.scenes) ? draft.scenes : [];
  const offline = draft.liveModel === false || Boolean(draft.orchestratorError);

  return (
    <div className="mt-2 space-y-2">
      {offline ? (
        <p className="text-[11px] text-amber-700 dark:text-amber-400">
          Offline draft (Gemini key not configured). Still an editable plan —
          configure AI keys for richer drafts.
        </p>
      ) : null}
      <p className="text-[10px] text-muted-foreground">
        Duration ~{Math.round((draft.durationMs ?? 0) / 1000)}s ·{" "}
        {scenes.length} beats · never a rendered video
      </p>
      <ul className="space-y-1">
        {scenes.map((scene, index) => (
          <li
            key={`${scene.sceneId ?? scene.sceneName}-${index}`}
            className="flex items-center justify-between gap-2 rounded border border-border/40 px-2 py-1 text-xs"
          >
            <span className="min-w-0 truncate">
              {index + 1}. {scene.sceneName}
              <span className="text-muted-foreground">
                {" "}
                ({Math.round(scene.durationMs / 1000)}s)
              </span>
            </span>
            {scene.sceneId ? (
              <Link
                href={`/creative-studio/scenes/${scene.sceneId}`}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "h-6 shrink-0 text-[10px]",
                )}
              >
                Scene
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RecommendationList({
  items,
  emptyMessage = "No recommendations yet.",
  onChanged,
  timelineApplyContext,
  onTimelineApplied,
}: RecommendationListProps) {
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [localItems, setLocalItems] = useState(items);

  // Keep in sync when parent replaces the latest recommendation.
  if (
    items.length !== localItems.length ||
    items[0]?.id !== localItems[0]?.id ||
    items[0]?.status !== localItems[0]?.status
  ) {
    if (items !== localItems) {
      setLocalItems(items);
    }
  }

  if (localItems.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <ul className="space-y-3">
      {localItems.map((item) => (
        <li
          key={item.id}
          className="rounded-md border border-border/50 px-3 py-2"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{item.title}</p>
              {item.summary ? (
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                  {item.summary}
                </p>
              ) : null}
              <div className="mt-1.5 flex flex-wrap gap-1">
                <Badge variant="outline" className="text-[10px]">
                  {AI_INTELLIGENCE_DOMAIN_LABELS[item.domain]}
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  {AI_RECOMMENDATION_STATUS_LABELS[item.status]}
                </Badge>
                {item.confidence != null ? (
                  <Badge variant="outline" className="text-[10px]">
                    {Math.round(item.confidence * 100)}% confidence
                  </Badge>
                ) : null}
              </div>

              {item.domain === "scene" ? (
                <ScenePayloadDetails payload={item.payload} />
              ) : null}
              {item.domain === "timeline" ? (
                <TimelinePayloadDetails payload={item.payload} />
              ) : null}
            </div>
            {item.status === "pending" ? (
              <div className="flex shrink-0 flex-col gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  disabled={pending && busyId === item.id}
                  onClick={() => {
                    setBusyId(item.id);
                    startTransition(async () => {
                      if (item.domain === "timeline") {
                        const result = await applyTimelineDraftAction({
                          recommendationId: item.id,
                          projectId: timelineApplyContext?.projectId,
                          timelineId: timelineApplyContext?.timelineId,
                        });
                        if (!result.success) {
                          toast.error(
                            result.error.includes("ai_recommendations") ||
                              result.error.includes("schema")
                              ? "Apply migration 20260324000019_ai_center_intelligence in Supabase, then retry."
                              : result.error,
                          );
                          setBusyId(null);
                          return;
                        }
                        setLocalItems((prev) =>
                          prev.map((row) =>
                            row.id === item.id
                              ? result.data.recommendation
                              : row,
                          ),
                        );
                        onTimelineApplied?.({
                          clips: result.data.clips,
                          trackId: result.data.trackId,
                          track: result.data.track,
                          timeline: result.data.timeline,
                          projectId: result.data.projectId,
                        });
                        toast.success(
                          `Accepted — ${result.data.clips.length} editable beats placed on the timeline. Trim, reorder, or preview next.`,
                        );
                        onChanged?.();
                        setBusyId(null);
                        return;
                      }

                      const result =
                        await acceptIntelligenceRecommendationAction(item.id);
                      if (!result.success) {
                        toast.error(
                          result.error.includes("ai_recommendations") ||
                            result.error.includes("schema")
                            ? "Apply migration 20260324000019_ai_center_intelligence in Supabase, then retry."
                            : result.error,
                        );
                      } else {
                        setLocalItems((prev) =>
                          prev.map((row) =>
                            row.id === item.id ? result.data : row,
                          ),
                        );
                        toast.success(
                          item.domain === "scene"
                            ? "Accepted — use Open on a ranked template below."
                            : "Accepted.",
                        );
                        onChanged?.();
                      }
                      setBusyId(null);
                    });
                  }}
                >
                  Accept
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending && busyId === item.id}
                  onClick={() => {
                    setBusyId(item.id);
                    startTransition(async () => {
                      const result =
                        await rejectIntelligenceRecommendationAction(item.id);
                      if (!result.success) {
                        toast.error(result.error);
                      } else {
                        setLocalItems((prev) =>
                          prev.map((row) =>
                            row.id === item.id ? result.data : row,
                          ),
                        );
                        toast.message("Recommendation rejected");
                        onChanged?.();
                      }
                      setBusyId(null);
                    });
                  }}
                >
                  Reject
                </Button>
              </div>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
