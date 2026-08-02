"use client";

import Link from "next/link";
import { Layers, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type StoryGraphicsTabProps = {
  storyId: string;
  storyTitle: string;
};

export function StoryGraphicsTab({
  storyId,
  storyTitle,
}: StoryGraphicsTabProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
          <Layers className="size-6 text-primary" />
        </div>
        <div className="max-w-md space-y-1">
          <p className="font-medium">Motion Scene Engine</p>
          <p className="text-sm text-muted-foreground">
            Build reusable motion scenes for{" "}
            <span className="font-medium text-foreground">{storyTitle}</span>.
            Placeholders bind to story variables like {"{{headline}}"} and brand
            kit colors.
          </p>
        </div>
        <Button
          type="button"
          nativeButton={false}
          render={<Link href="/creative-studio/scenes" />}
        >
          Open Scene Library
          <ArrowRight className="size-4" />
        </Button>
        <p className="text-[11px] text-muted-foreground">
          Story ID: {storyId.slice(0, 8)}… · Place scenes on timeline from a
          Creative Studio project
        </p>
      </CardContent>
    </Card>
  );
}
