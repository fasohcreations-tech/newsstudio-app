"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { ImageIcon, Loader2, Sparkles, Video } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  estimateProducerMediaCostAction,
  generateProducerMediaAction,
} from "@/features/ai-news-producer/actions/producer-media.actions";
import { mediaQueryKeys } from "@/features/media/queries/media-keys";

type ProducerMediaGeneratePanelProps = {
  storyId: string;
};

export function ProducerMediaGeneratePanel({
  storyId,
}: ProducerMediaGeneratePanelProps) {
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState("");
  const [pending, startTransition] = useTransition();
  const [estimate, setEstimate] = useState<{
    estimatedTokens: number;
    estimatedCost: number;
    breakdown: string;
  } | null>(null);

  useEffect(() => {
    if (prompt.trim().length < 8) {
      setEstimate(null);
      return;
    }
    const timer = window.setTimeout(() => {
      void estimateProducerMediaCostAction({
        prompt,
        kind: "image",
      }).then((result) => {
        if (result.success) {
          setEstimate({
            estimatedTokens: result.data.estimatedTokens,
            estimatedCost: result.data.estimatedCost,
            breakdown: result.data.breakdown,
          });
        }
      });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [prompt]);

  function runGenerate(kind: "image" | "video") {
    if (prompt.trim().length < 8) {
      toast.error("Enter a prompt of at least 8 characters.");
      return;
    }

    startTransition(async () => {
      const costPreview = await estimateProducerMediaCostAction({
        prompt,
        kind,
      });
      if (costPreview.success) {
        toast.message(
          kind === "image" ? "Generating AI image…" : "Requesting AI video…",
          {
            description: `Est. ${costPreview.data.estimatedTokens} tokens · $${costPreview.data.estimatedCost.toFixed(4)}`,
          },
        );
      }

      const result = await generateProducerMediaAction({
        storyId,
        prompt,
        kind,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      await queryClient.invalidateQueries({
        queryKey: mediaQueryKeys.storyAssets(storyId),
      });
      await queryClient.invalidateQueries({ queryKey: mediaQueryKeys.lists() });

      toast.success(
        `${result.data.kind === "image" ? "Image" : "Video"} attached — ${result.data.tokensUsed} tokens used ($${result.data.estimatedCost.toFixed(4)})`,
      );
    });
  }

  return (
    <section className="space-y-3 rounded-xl border border-border/60 bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="size-4" />
            AI Image / Video
          </h3>
          <p className="text-xs text-muted-foreground">
            Describe the shot. Generation uses Gemini tokens and attaches the
            result to this story.
          </p>
        </div>
        {estimate ? (
          <Badge variant="outline" className="text-[10px]">
            ~{estimate.estimatedTokens} tokens · $
            {estimate.estimatedCost.toFixed(4)}
          </Badge>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ai-media-prompt">Prompt</Label>
        <Textarea
          id="ai-media-prompt"
          rows={3}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="News still: reporter at a Kerala monsoon flood site, dusk light, broadcast framing…"
          className="text-sm"
          disabled={pending}
        />
      </div>

      {estimate ? (
        <p className="text-[11px] text-muted-foreground">{estimate.breakdown}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending || prompt.trim().length < 8}
          onClick={() => runGenerate("image")}
        >
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <ImageIcon className="size-3.5" />
          )}
          Generate Image
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending || prompt.trim().length < 8}
          onClick={() => runGenerate("video")}
        >
          <Video className="size-3.5" />
          Generate Video
        </Button>
      </div>
    </section>
  );
}
