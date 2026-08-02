import { STORY_PRIORITY_LABELS } from "@/features/newsroom/constants/story.constants";
import type { StoryPriority } from "@/shared/types/database.types";
import { cn } from "@/lib/utils";

const PRIORITY_DOT: Record<StoryPriority, string> = {
  low: "bg-slate-400",
  normal: "bg-sky-500",
  high: "bg-orange-500",
  urgent: "bg-red-500",
};

type StoryPriorityIndicatorProps = {
  priority: StoryPriority;
  showLabel?: boolean;
  className?: string;
};

export function StoryPriorityIndicator({
  priority,
  showLabel = true,
  className,
}: StoryPriorityIndicatorProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-xs", className)}
      title={STORY_PRIORITY_LABELS[priority]}
    >
      <span
        className={cn("size-2 rounded-full", PRIORITY_DOT[priority])}
        aria-hidden="true"
      />
      {showLabel ? (
        <span className="text-muted-foreground">
          {STORY_PRIORITY_LABELS[priority]}
        </span>
      ) : (
        <span className="sr-only">{STORY_PRIORITY_LABELS[priority]}</span>
      )}
    </span>
  );
}
