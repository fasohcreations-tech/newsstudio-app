"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import {
  Check,
  Loader2,
  RefreshCw,
  Sparkles,
  ThumbsDown,
  Wand2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  acceptClipSuggestionAction,
  analyzeVideoAssetAction,
  getVideoAnalysisAction,
  recommendClipForPanelAction,
  rejectClipSuggestionAction,
  requestAnotherClipSuggestionAction,
} from "@/features/ai-visual-understanding/actions/visual.actions";
import type {
  AnalysisBundle,
  ClipRecommendation,
} from "@/features/ai-visual-understanding/types/visual.types";
import { formatTimecode } from "@/features/asset-clip-editor/lib/timecode";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type ClipAiRecommendationRailProps = {
  mediaAssetId: string | null;
  durationMs: number;
  /** Optional Story Panel deep-link context. */
  storyId?: string | null;
  panelIndex?: number | null;
  /** Current editor IN/OUT (used on Accept after manual adjust). */
  currentInMs?: number;
  currentOutMs?: number;
  /** Apply suggested range into the Clip Editor timeline (manual still owns edits). */
  onApplySuggestion: (inMs: number, outMs: number) => void;
  className?: string;
};

/**
 * AI Visual Understanding rail — sits beside the Clip Editor.
 * Does not replace preview/timeline; only proposes IN/OUT for editor review.
 */
export function ClipAiRecommendationRail({
  mediaAssetId,
  durationMs,
  storyId = null,
  panelIndex = null,
  currentInMs,
  currentOutMs,
  onApplySuggestion,
  className,
}: ClipAiRecommendationRailProps) {
  const [pending, startTransition] = useTransition();
  const [bundle, setBundle] = useState<AnalysisBundle | null>(null);
  const [recommendation, setRecommendation] =
    useState<ClipRecommendation | null>(null);

  useEffect(() => {
    setBundle(null);
    setRecommendation(null);
    if (!mediaAssetId) return;
    startTransition(async () => {
      const result = await getVideoAnalysisAction(mediaAssetId);
      if (result.success) setBundle(result.data);
    });
  }, [mediaAssetId]);

  function runAnalyze(force = false) {
    if (!mediaAssetId) {
      toast.error("Select a video source first.");
      return;
    }
    startTransition(async () => {
      const result = await analyzeVideoAssetAction({
        mediaAssetId,
        force,
        durationMs,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setBundle(result.data);
      toast.success(
        result.data.analysis.status === "ready"
          ? "Visual analysis ready"
          : `Analysis ${result.data.analysis.status}`,
      );
    });
  }

  function runRecommend(excludeId?: string) {
    if (!mediaAssetId || !storyId || panelIndex == null) {
      toast.error("Link a Story Panel (story + panel) to recommend a clip.");
      return;
    }
    startTransition(async () => {
      const action = excludeId
        ? requestAnotherClipSuggestionAction
        : recommendClipForPanelAction;
      const result = await action({
        storyId,
        panelIndex,
        mediaAssetId,
        excludeSuggestionId: excludeId,
        targetDurationMs: undefined,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setRecommendation(result.data);
      setBundle((prev) =>
        prev
          ? prev
          : {
              analysis: {
                id: result.data.analysisId,
                organization_id: "",
                media_asset_id: mediaAssetId,
                status: "ready",
                source_provider: null,
                source_url: null,
                duration_ms: durationMs,
                frame_rate: 30,
                transcript: null,
                keywords: [],
                summary: null,
                semantic_payload: {},
                model_version: null,
                ai_job_id: null,
                error: null,
                analyzed_at: null,
                created_by: "",
                updated_by: null,
                created_at: "",
                updated_at: "",
                deleted_at: null,
              },
              events: [],
              embeddings: [],
            },
      );
      onApplySuggestion(result.data.inMs, result.data.outMs);
      toast.success("Suggestion loaded into timeline — review before accepting.");
    });
  }

  function accept() {
    if (!recommendation) return;
    const inPointMs = currentInMs ?? recommendation.inMs;
    const outPointMs = currentOutMs ?? recommendation.outMs;
    startTransition(async () => {
      const result = await acceptClipSuggestionAction({
        suggestionId: recommendation.suggestion.id,
        inPointMs,
        outPointMs,
        attachToStoryPanel: Boolean(storyId),
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setRecommendation({
        ...recommendation,
        inMs: inPointMs,
        outMs: outPointMs,
        suggestion: result.data.suggestion,
      });
      toast.success(
        storyId
          ? "Clip saved and attached to Story Panel"
          : "Clip saved to library",
      );
    });
  }

  function reject() {
    if (!recommendation) return;
    startTransition(async () => {
      const result = await rejectClipSuggestionAction(
        recommendation.suggestion.id,
      );
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setRecommendation(null);
      toast.message("Suggestion rejected");
    });
  }

  const analysisReady = bundle?.analysis.status === "ready";
  const eventCount = bundle?.events.length ?? 0;
  const keywords = Array.isArray(bundle?.analysis.keywords)
    ? (bundle!.analysis.keywords as unknown[]).map(String).slice(0, 8)
    : [];

  return (
    <aside
      className={cn(
        "flex min-h-0 flex-col gap-3 border-l border-border/60 bg-muted/10 p-3",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <Sparkles className="size-3.5 text-amber-600" />
          AI Visual Understanding
        </div>
        {bundle?.analysis.status ? (
          <Badge variant="secondary" className="text-[10px]">
            {bundle.analysis.status}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px]">
            idle
          </Badge>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Analyzes the selected video once, then recommends IN/OUT for the Story
        Panel. You always review in the Clip Editor before saving.
      </p>

      <div className="flex flex-wrap gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          disabled={!mediaAssetId || pending}
          onClick={() => runAnalyze(false)}
        >
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Wand2 className="size-3.5" />
          )}
          {analysisReady ? "Re-use analysis" : "Analyze video"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
          disabled={!mediaAssetId || pending}
          onClick={() => runAnalyze(true)}
          title="Force reprocess"
        >
          <RefreshCw className="size-3.5" />
          Reprocess
        </Button>
      </div>

      {analysisReady ? (
        <div className="space-y-1.5 rounded-md border border-border/50 bg-background/60 p-2 text-[11px]">
          <p className="line-clamp-3 text-muted-foreground">
            {bundle?.analysis.summary ?? "Analysis ready."}
          </p>
          <p>
            <span className="text-muted-foreground">Events</span>{" "}
            <span className="font-mono">{eventCount}</span>
            {" · "}
            <span className="text-muted-foreground">Segments</span>{" "}
            <span className="font-mono">
              {bundle?.embeddings.length ?? 0}
            </span>
          </p>
          {keywords.length ? (
            <div className="flex flex-wrap gap-1">
              {keywords.map((k) => (
                <Badge key={k} variant="outline" className="text-[9px]">
                  {k}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-1.5 border-t border-border/40 pt-2">
        <Label className="text-[11px]">Story Panel recommend</Label>
        {!storyId || panelIndex == null ? (
          <p className="text-[11px] text-muted-foreground">
            Open from a Story Sub Headline with{" "}
            <code className="rounded bg-muted px-1">storyId</code> +{" "}
            <code className="rounded bg-muted px-1">panel</code> query params,
            or use Suggest clip on the Story form.
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            Story panel {panelIndex + 1}
            {storyId ? (
              <>
                {" · "}
                <Link
                  href={`/newsroom/stories/${storyId}`}
                  className="underline underline-offset-2"
                >
                  Open story
                </Link>
              </>
            ) : null}
          </p>
        )}

        <Button
          type="button"
          size="sm"
          className="h-7 w-full text-xs"
          disabled={!mediaAssetId || !storyId || panelIndex == null || pending}
          onClick={() => runRecommend()}
        >
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Sparkles className="size-3.5" />
          )}
          Suggest best clip
        </Button>
      </div>

      {recommendation ? (
        <div className="space-y-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium">Suggestion</span>
            <Badge variant="secondary" className="font-mono text-[10px]">
              {(recommendation.confidence * 100).toFixed(0)}%
            </Badge>
          </div>
          <p className="font-mono text-[11px]">
            {formatTimecode(recommendation.inMs)} →{" "}
            {formatTimecode(recommendation.outMs)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {recommendation.reason}
          </p>
          <div className="flex flex-wrap gap-1">
            <Button
              type="button"
              size="sm"
              className="h-7 text-xs"
              disabled={pending || recommendation.suggestion.decision === "accepted"}
              onClick={() =>
                onApplySuggestion(recommendation.inMs, recommendation.outMs)
              }
            >
              Preview
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-7 text-xs"
              disabled={pending || recommendation.suggestion.decision === "accepted"}
              onClick={accept}
            >
              <Check className="size-3.5" />
              Accept &amp; save
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={pending}
              onClick={() => runRecommend(recommendation.suggestion.id)}
            >
              <RefreshCw className="size-3.5" />
              Another
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              disabled={pending || recommendation.suggestion.decision !== "pending"}
              onClick={reject}
            >
              <ThumbsDown className="size-3.5" />
              Reject
            </Button>
          </div>
          {recommendation.suggestion.decision === "accepted" &&
          recommendation.suggestion.accepted_clip_id ? (
            <p className="text-[10px] text-muted-foreground">
              Saved as{" "}
              <code className="rounded bg-muted px-1">
                clip://{recommendation.suggestion.accepted_clip_id}
              </code>
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-auto space-y-1 border-t border-border/40 pt-2">
        <Label className="text-[10px] text-muted-foreground">
          Deep-link helper
        </Label>
        <Input
          readOnly
          className="h-7 font-mono text-[10px]"
          value={
            mediaAssetId
              ? `/media-library/clip-editor?asset=${mediaAssetId}${
                  storyId ? `&storyId=${storyId}` : ""
                }${panelIndex != null ? `&panel=${panelIndex}` : ""}`
              : ""
          }
        />
        <p className="flex items-start gap-1 text-[10px] text-muted-foreground">
          <X className="mt-0.5 size-3 shrink-0 opacity-50" />
          AI never auto-clips — Accept writes an Asset Clip only after review.
        </p>
      </div>
    </aside>
  );
}
