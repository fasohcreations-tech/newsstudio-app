"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  INTAKE_EXTRACTION_STATUS_LABELS,
  INTAKE_SOURCE_LABELS,
  type IntakeSourceCode,
} from "@/features/intake/constants/intake.constants";
import { enqueueSourceAction } from "@/features/intake/actions/intake.actions";
import type { SourceItemWithType, SourceType } from "@/features/intake/types/intake.types";
import { cn } from "@/lib/utils";
import { RelativeTime } from "@/features/newsroom/components/relative-time";

type ImportQueueProps = {
  items: SourceItemWithType[];
  sourceTypes: SourceType[];
  selectedId: string | null;
  activeSourceCode: IntakeSourceCode | "all";
  onSelect: (id: string) => void;
  onEnqueued: () => void;
};

export function ImportQueue({
  items,
  sourceTypes,
  selectedId,
  activeSourceCode,
  onSelect,
  onEnqueued,
}: ImportQueueProps) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();

  const formSourceCode: IntakeSourceCode =
    activeSourceCode === "all" ? "url_import" : activeSourceCode;

  const activeType = useMemo(
    () => sourceTypes.find((t) => t.code === formSourceCode),
    [sourceTypes, formSourceCode],
  );

  const needsUrl = ![
    "manual_story",
    "pdf",
    "docx",
    "txt",
    "image_upload",
    "audio_upload",
  ].includes(formSourceCode);

  function onEnqueue(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await enqueueSourceAction({
        sourceTypeCode: formSourceCode,
        originalUrl: url,
        title,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Added to intake queue");
      setUrl("");
      setTitle("");
      onEnqueued();
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border/60 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">Import queue</h2>
            <p className="text-xs text-muted-foreground">
              {activeType?.name ?? "All sources"} · architecture enqueue only
            </p>
          </div>
          <Badge variant="secondary">{items.length}</Badge>
        </div>

        <form onSubmit={onEnqueue} className="space-y-3">
          {needsUrl ? (
            <div className="space-y-1.5">
              <Label htmlFor="intake-url">Source URL</Label>
              <Input
                id="intake-url"
                placeholder="https://"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="intake-title">
              {formSourceCode === "manual_story" ? "Story title" : "Title (optional)"}
            </Label>
            <Input
              id="intake-title"
              placeholder={
                formSourceCode === "manual_story"
                  ? "Enter headline"
                  : "Optional label"
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          {(formSourceCode === "pdf" ||
            formSourceCode === "docx" ||
            formSourceCode === "txt" ||
            formSourceCode === "image_upload" ||
            formSourceCode === "audio_upload") && (
            <p className="text-xs text-muted-foreground">
              File upload adapters are reserved. Enqueue a titled placeholder for
              now.
            </p>
          )}
          <Button type="submit" disabled={pending} className="w-full sm:w-auto">
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Queuing…
              </>
            ) : (
              <>
                <Plus className="size-4" />
                Add to queue
              </>
            )}
          </Button>
        </form>
      </div>

      <ScrollArea className="flex-1">
        <ul className="divide-y divide-border/60">
          {items.length === 0 ? (
            <li className="p-6 text-sm text-muted-foreground">
              Queue is empty. Add a source to begin the intake workflow.
            </li>
          ) : (
            items.map((item) => {
              const active = item.id === selectedId;
              const code = item.source_type.code as IntakeSourceCode;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(item.id)}
                    className={cn(
                      "flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-muted/50",
                      active && "bg-muted/70",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-2 text-sm font-medium">
                        {item.title ?? "Untitled source"}
                      </p>
                      <Badge variant="outline" className="shrink-0">
                        {INTAKE_EXTRACTION_STATUS_LABELS[item.extraction_status]}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {INTAKE_SOURCE_LABELS[code] ?? item.source_type.name}
                      {item.original_url ? ` · ${item.original_url}` : ""}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      <RelativeTime value={item.imported_at} />
                    </p>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </ScrollArea>
    </div>
  );
}
