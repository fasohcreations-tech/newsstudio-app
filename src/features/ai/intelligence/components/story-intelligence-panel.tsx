"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  STORY_INTELLIGENCE_CAPABILITIES,
  type StoryIntelligenceCapability,
} from "@/features/ai/intelligence/constants/intelligence.constants";
import { runStoryIntelligenceAction } from "@/features/ai/intelligence/actions/intelligence.actions";
import { RecommendationList } from "@/features/ai/intelligence/components/recommendation-list";
import type { AIRecommendation } from "@/features/ai/intelligence/types/intelligence.types";

type StoryIntelligencePanelProps = {
  storyId?: string | null;
  title?: string;
  body?: string;
  language?: string;
};

/**
 * Story workspace dock for Module 6.0 Story Intelligence.
 * Suggestions only — never writes story fields on accept.
 */
export function StoryIntelligencePanel({
  storyId = null,
  title,
  body,
  language = "en",
}: StoryIntelligencePanelProps) {
  const [pending, startTransition] = useTransition();
  const [capability, setCapability] =
    useState<StoryIntelligenceCapability>("headline");
  const [latest, setLatest] = useState<AIRecommendation | null>(null);

  return (
    <div className="space-y-3 rounded-md border border-border/50 p-3">
      <div>
        <p className="text-xs font-semibold uppercase text-muted-foreground">
          Story Intelligence
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Headline, summary, SEO, Manglish, grammar, and more. Accept to keep —
          apply manually in the story editor.
        </p>
      </div>

      <Select
        value={capability}
        onValueChange={(value: string | null) => {
          if (!value) return;
          setCapability(value as StoryIntelligenceCapability);
        }}
      >
        <SelectTrigger className="h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STORY_INTELLIGENCE_CAPABILITIES.map((item) => (
            <SelectItem key={item} value={item} className="text-xs">
              {item.replaceAll("_", " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        type="button"
        size="sm"
        className="w-full"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            const result = await runStoryIntelligenceAction({
              capability,
              storyId,
              title,
              body,
              language,
              targetLanguage: language === "en" ? "ml" : "en",
            });
            if (!result.success) {
              toast.error(result.error);
              return;
            }
            setLatest(result.data);
            toast.success("Story suggestion ready");
          });
        }}
      >
        <Sparkles className="size-3.5" />
        Run {capability.replaceAll("_", " ")}
      </Button>

      <RecommendationList
        items={latest ? [latest] : []}
        emptyMessage="Choose a capability and run Story Intelligence."
      />
    </div>
  );
}
