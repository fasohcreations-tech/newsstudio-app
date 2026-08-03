"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { assessBroadcastHealthAction } from "@/features/ai/intelligence/actions/intelligence.actions";
import { RecommendationList } from "@/features/ai/intelligence/components/recommendation-list";
import type { AIRecommendation } from "@/features/ai/intelligence/types/intelligence.types";

export function BroadcastIntelligencePanel() {
  const [pending, startTransition] = useTransition();
  const [latest, setLatest] = useState<AIRecommendation | null>(null);

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-base">Broadcast Intelligence</CardTitle>
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              const result = await assessBroadcastHealthAction({
                targetBitrateKbps: 4500,
                hasSubtitles: false,
                resolution: "1920x1080",
              });
              if (!result.success) {
                toast.error(result.error);
                return;
              }
              setLatest(result.data);
              toast.success("Broadcast health check ready");
            });
          }}
        >
          <Sparkles className="size-3.5" />
          Run health check
        </Button>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-sm text-muted-foreground">
          Bitrate, audio levels, safe-title, subtitle readability, and stream
          quality — recommendations only.
        </p>
        <RecommendationList
          items={latest ? [latest] : []}
          emptyMessage="Run a health check to review BroadcastOS guidance."
        />
      </CardContent>
    </Card>
  );
}
