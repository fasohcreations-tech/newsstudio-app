import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 py-12 text-center",
        className,
      )}
      role="status"
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon ?? <Inbox className="size-5" aria-hidden />}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        {description ? (
          <p className="max-w-sm text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

type StatusDotProps = {
  tone?: "neutral" | "success" | "warning" | "danger" | "info" | "ai";
  label: string;
  className?: string;
};

export function StatusDot({
  tone = "neutral",
  label,
  className,
}: StatusDotProps) {
  const colors: Record<NonNullable<StatusDotProps["tone"]>, string> = {
    neutral: "bg-muted-foreground",
    success: "bg-[var(--status-success)]",
    warning: "bg-[var(--status-warning)]",
    danger: "bg-destructive",
    info: "bg-[var(--status-info)]",
    ai: "bg-[var(--status-ai)]",
  };
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        className={cn("size-1.5 rounded-full", colors[tone])}
        aria-hidden
      />
      <span>{label}</span>
    </span>
  );
}

export function PageErrorState({
  title = "Something went wrong",
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      title={title}
      description={description ?? "Try again or return to the dashboard."}
      action={
        onRetry ? (
          <Button type="button" variant="outline" onClick={onRetry}>
            Retry
          </Button>
        ) : null
      }
    />
  );
}
