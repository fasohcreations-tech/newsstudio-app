import { Badge } from "@/components/ui/badge";
import { STORY_STATUS_LABELS } from "@/features/newsroom/constants/story.constants";
import type { StoryStatus } from "@/shared/types/database.types";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<StoryStatus, string> = {
  draft: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  assigned: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  in_progress: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  review: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  published: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  archived: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300",
};

type StoryStatusBadgeProps = {
  status: StoryStatus;
  className?: string;
};

export function StoryStatusBadge({ status, className }: StoryStatusBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn("border-0 font-medium", STATUS_STYLES[status], className)}
    >
      {STORY_STATUS_LABELS[status]}
    </Badge>
  );
}
