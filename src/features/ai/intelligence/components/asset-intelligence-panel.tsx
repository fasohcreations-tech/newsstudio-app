"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { analyzeAssetAction } from "@/features/ai/intelligence/actions/intelligence.actions";
import { RecommendationList } from "@/features/ai/intelligence/components/recommendation-list";
import type { AIRecommendation } from "@/features/ai/intelligence/types/intelligence.types";
import type { MediaAsset } from "@/features/media/types/media.types";

type AssetIntelligencePanelProps = {
  asset: Pick<
    MediaAsset,
    "id" | "name" | "file_type" | "mime_type"
  >;
};

export function AssetIntelligencePanel({ asset }: AssetIntelligencePanelProps) {
  const [pending, startTransition] = useTransition();
  const [latest, setLatest] = useState<AIRecommendation | null>(null);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Analyze tags, categories, OCR text, faces, duplicates, and searchable
        descriptions. Results are recommendations until you accept them.
      </p>
      <Button
        type="button"
        size="sm"
        className="w-full"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            const result = await analyzeAssetAction({
              mediaAssetId: asset.id,
              name: asset.name,
              fileType: asset.file_type,
              mimeType: asset.mime_type,
            });
            if (!result.success) {
              toast.error(result.error);
              return;
            }
            setLatest(result.data);
            toast.success("Asset analysis ready");
          });
        }}
      >
        <Sparkles className="size-3.5" />
        Analyze asset
      </Button>
      <RecommendationList
        items={latest ? [latest] : []}
        emptyMessage="Run analysis to populate AI metadata suggestions."
      />
    </div>
  );
}
