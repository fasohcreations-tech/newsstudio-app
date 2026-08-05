"use client";

import {
  Download,
  ExternalLink,
  Loader2,
  RefreshCw,
  RotateCcw,
  Square,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { VideoRenderRow } from "@/features/video-render-export/types/render.types";
import { cn } from "@/lib/utils";

function formatElapsed(ms: number | null | undefined): string {
  if (ms == null || ms < 0) return "—";
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return m > 0 ? `${m}m ${rem}s` : `${rem}s`;
}

function statusVariant(
  status: VideoRenderRow["status"],
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "succeeded") return "default";
  if (status === "failed" || status === "cancelled") return "destructive";
  if (status === "queued") return "outline";
  return "secondary";
}

type VideoRenderQueueProps = {
  renders: VideoRenderRow[];
  activeRenderId: string | null;
  pending: boolean;
  /** Render IDs that still have a local download ready */
  localReadyIds?: string[];
  onRefresh: () => void;
  onClearQueue?: () => void;
  onCancel: (renderId: string) => void;
  onRetry: (render: VideoRenderRow) => void;
  onDownloadLocal?: (renderId: string) => void;
};

export function VideoRenderQueue({
  renders,
  activeRenderId,
  pending,
  localReadyIds = [],
  onRefresh,
  onClearQueue,
  onCancel,
  onRetry,
  onDownloadLocal,
}: VideoRenderQueueProps) {
  // Allow clearing finished + stuck jobs; keep the in-flight job if any.
  const clearable = renders.some((r) => r.id !== activeRenderId);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Render Queue</h3>
        <div className="flex flex-wrap gap-1">
          {onClearQueue ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7"
              disabled={pending || !clearable}
              onClick={onClearQueue}
            >
              <Trash2 className="size-3.5" />
              Clear queue
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7"
            disabled={pending}
            onClick={onRefresh}
          >
            <RefreshCw className={cn("size-3.5", pending && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {renders.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/60 p-4 text-xs text-muted-foreground">
          No renders yet. Use Export to enqueue a Timeline render job.
        </p>
      ) : (
        <ul className="space-y-2">
          {renders.map((job) => {
            const active = job.id === activeRenderId;
            const running = [
              "queued",
              "preparing",
              "rendering",
              "encoding",
              "uploading",
            ].includes(job.status);
            const localReady =
              localReadyIds.includes(job.id) ||
              (job.status === "succeeded" &&
                (!job.output_url ||
                  Boolean(job.error?.includes("Cloud upload skipped"))));
            return (
              <li
                key={job.id}
                className={cn(
                  "rounded-lg border border-border/60 p-3",
                  active && "ring-1 ring-rose-500/40",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={statusVariant(job.status)}
                        className="capitalize"
                      >
                        {job.status}
                      </Badge>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {job.format.toUpperCase()} · {job.resolution_width}×
                        {job.resolution_height} · {job.frame_rate}fps
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Job {job.id.slice(0, 8)} · elapsed{" "}
                      {formatElapsed(job.elapsed_ms)}
                      {job.eta_ms != null && running
                        ? ` · ETA ${formatElapsed(job.eta_ms)}`
                        : ""}
                    </p>
                    {job.error ? (
                      <p className="mt-1 text-[11px] text-destructive">
                        {job.error}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {running ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => onCancel(job.id)}
                      >
                        {active ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Square className="size-3.5" />
                        )}
                        Cancel
                      </Button>
                    ) : null}
                    {job.status === "failed" || job.status === "cancelled" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => onRetry(job)}
                      >
                        <RotateCcw className="size-3.5" />
                        Retry
                      </Button>
                    ) : null}
                    {job.status === "succeeded" && job.output_url ? (
                      <>
                        <a
                          href={job.output_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-7 items-center gap-1 rounded-md border border-border/60 px-2 text-xs hover:bg-muted"
                        >
                          <ExternalLink className="size-3.5" />
                          Open
                        </a>
                        <a
                          href={job.output_url}
                          download
                          className="inline-flex h-7 items-center gap-1 rounded-md bg-secondary px-2 text-xs hover:bg-secondary/80"
                        >
                          <Download className="size-3.5" />
                          Download
                        </a>
                      </>
                    ) : null}
                    {localReady && onDownloadLocal ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="default"
                        className="h-7 text-xs"
                        onClick={() => onDownloadLocal(job.id)}
                      >
                        <Download className="size-3.5" />
                        Local file
                      </Button>
                    ) : null}
                  </div>
                </div>
                {running || job.progress > 0 ? (
                  <div className="mt-2 space-y-1">
                    <Progress value={Number(job.progress) || 0} className="h-1.5" />
                    <p className="text-right font-mono text-[10px] text-muted-foreground">
                      {Math.round(Number(job.progress) || 0)}%
                    </p>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
