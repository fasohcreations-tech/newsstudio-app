"use client";

import { StatusDot } from "@/features/platform/components/empty-state";

type JobStatusBarProps = {
  email?: string | null;
};

/**
 * Bottom job status bar — realtime placeholders for upload / render / publish / AI.
 */
export function JobStatusBar({ email }: JobStatusBarProps) {
  return (
    <footer
      className="flex h-9 shrink-0 items-center justify-between gap-3 border-t border-border/60 bg-muted/30 px-3 text-xs text-muted-foreground md:px-4"
      role="status"
      aria-label="System and job status"
    >
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        <StatusDot tone="success" label="System ready" />
        <span className="hidden h-3 w-px bg-border sm:block" aria-hidden />
        <StatusDot tone="neutral" label="Uploads idle" />
        <StatusDot tone="neutral" label="Rendering idle" />
        <StatusDot tone="neutral" label="Publishing idle" />
        <StatusDot tone="ai" label="AI jobs idle" />
      </div>
      <div className="hidden truncate sm:block">
        MediaOS v1.0 · {email ?? "Signed in"}
      </div>
      <div className="truncate sm:hidden">{email ?? "Signed in"}</div>
    </footer>
  );
}
