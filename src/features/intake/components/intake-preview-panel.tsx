"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  INTAKE_EXTRACTION_STATUS_LABELS,
  INTAKE_SOURCE_LABELS,
  type IntakeSourceCode,
} from "@/features/intake/constants/intake.constants";
import { createStoryFromSourceAction } from "@/features/intake/actions/intake.actions";
import type { SourceItemWithType } from "@/features/intake/types/intake.types";
import { RelativeTime } from "@/features/newsroom/components/relative-time";

type IntakePreviewPanelProps = {
  item: SourceItemWithType | null;
  onStoryCreated: () => void;
};

export function IntakePreviewPanel({
  item,
  onStoryCreated,
}: IntakePreviewPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (!item) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <FileText className="size-10 text-muted-foreground/50" />
        <div>
          <p className="text-sm font-medium">Preview</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Select a queue item to review metadata and create a Story.
          </p>
        </div>
      </div>
    );
  }

  const code = item.source_type.code as IntakeSourceCode;
  const canCreate = item.extraction_status !== "story_created";

  function onCreateStory() {
    startTransition(async () => {
      const result = await createStoryFromSourceAction({
        sourceItemId: item!.id,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Story created from source");
      onStoryCreated();
      router.push(`/newsroom/stories/${result.data.storyId}`);
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border/60 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Preview
        </p>
        <h2 className="mt-1 text-base font-semibold leading-snug">
          {item.title ?? "Untitled source"}
        </h2>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge variant="secondary">
            {INTAKE_SOURCE_LABELS[code] ?? item.source_type.name}
          </Badge>
          <Badge variant="outline">
            {INTAKE_EXTRACTION_STATUS_LABELS[item.extraction_status]}
          </Badge>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-auto p-4 text-sm">
        <section className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Original URL</p>
          {item.original_url ? (
            <a
              href={item.original_url}
              target="_blank"
              rel="noreferrer"
              className="break-all text-primary underline-offset-2 hover:underline"
            >
              {item.original_url}
            </a>
          ) : (
            <p className="text-muted-foreground">—</p>
          )}
        </section>

        <section className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Reporter</p>
          <p>
            {item.reporter?.full_name?.trim() ||
              item.reporter?.email ||
              "Unassigned"}
          </p>
        </section>

        <section className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Imported</p>
          <p>
            <RelativeTime value={item.imported_at} />
          </p>
        </section>

        <Separator />

        <section className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Metadata</p>
          <pre className="max-h-40 overflow-auto rounded-md border border-border/60 bg-muted/30 p-3 text-[11px] leading-relaxed">
            {JSON.stringify(item.metadata ?? {}, null, 2)}
          </pre>
        </section>

        <section className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Extracted content
          </p>
          <p className="rounded-md border border-dashed border-border/60 p-3 text-xs text-muted-foreground">
            {item.extracted_content?.trim() ||
              "Extraction reserved — content will appear here after adapters land."}
          </p>
        </section>

        {item.error ? (
          <section className="space-y-1">
            <p className="text-xs font-medium text-destructive">Error</p>
            <p className="text-xs text-destructive">{item.error}</p>
          </section>
        ) : null}
      </div>

      <div className="border-t border-border/60 p-4">
        <Button
          type="button"
          className="w-full"
          disabled={!canCreate || pending}
          onClick={onCreateStory}
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Creating…
            </>
          ) : canCreate ? (
            "Create Story"
          ) : (
            "Story already created"
          )}
        </Button>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Creates a draft Story and stores provenance in{" "}
          <code>story_sources</code>.
        </p>
      </div>
    </div>
  );
}
