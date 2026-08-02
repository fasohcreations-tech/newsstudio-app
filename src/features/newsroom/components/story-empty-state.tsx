import { FileText } from "lucide-react";

import { Button } from "@/components/ui/button";

type StoryEmptyStateProps = {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function StoryEmptyState({
  title = "No stories yet",
  description = "Create the first story to open the newsroom desk.",
  actionLabel = "New Story",
  onAction,
}: StoryEmptyStateProps) {
  return (
    <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <FileText className="size-5 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-medium">{title}</h3>
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      </div>
      {onAction ? (
        <Button type="button" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
