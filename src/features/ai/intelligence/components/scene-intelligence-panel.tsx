"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { recommendScenesAction } from "@/features/ai/intelligence/actions/intelligence.actions";
import { RecommendationList } from "@/features/ai/intelligence/components/recommendation-list";
import type { AIRecommendation } from "@/features/ai/intelligence/types/intelligence.types";

type SceneIntelligencePanelProps = {
  storyType?: string;
  language?: string;
};

export function SceneIntelligencePanel({
  storyType = "news",
  language = "en",
}: SceneIntelligencePanelProps) {
  const [pending, startTransition] = useTransition();
  const [latest, setLatest] = useState<AIRecommendation | null>(null);

  return (
    <div className="space-y-3 rounded-md border border-border/50 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Scene Intelligence
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Recommend Scene Library templates for this organization.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
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
              setLatest(result.data);
              const offline = Boolean(result.data.payload?.orchestratorError);
              toast.success(
                offline
                  ? "Scene ranking ready (offline mode — no Gemini key)"
                  : "Scene recommendations ready",
              );
            });
          }}
        >
          <Sparkles className="size-3.5" />
          Recommend
        </Button>
      </div>
      <RecommendationList
        items={latest ? [latest] : []}
        emptyMessage="Request recommendations to rank templates."
      />
    </div>
  );
}
