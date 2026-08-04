"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Film, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  cancelVideoRenderAction,
  createVideoRenderAction,
  listVideoRendersAction,
  updateVideoRenderProgressAction,
} from "@/features/video-render-export/actions/render.actions";
import { VideoExportDialog } from "@/features/video-render-export/components/video-export-dialog";
import { VideoRenderQueue } from "@/features/video-render-export/components/video-render-queue";
import { DEFAULT_EXPORT_SETTINGS } from "@/features/video-render-export/constants/render.constants";
import { uploadRenderOutputFromBrowser } from "@/features/video-render-export/lib/upload-render-output";
import { runBrowserTimelineRender } from "@/features/video-render-export/services/browser-render-worker";
import type {
  VideoExportSettings,
  VideoRenderRow,
} from "@/features/video-render-export/types/render.types";

type VideoRenderExportPanelProps = {
  storyId: string;
  storyTitle: string;
  organizationId: string;
};

/**
 * Module 3.1 Export UI — Export Dialog + Render Queue.
 * Mounted beside Timeline Assembly; does not modify pipeline modules.
 */
export function VideoRenderExportPanel({
  storyId,
  storyTitle,
  organizationId,
}: VideoRenderExportPanelProps) {
  const [pending, startTransition] = useTransition();
  const [renders, setRenders] = useState<VideoRenderRow[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeRenderId, setActiveRenderId] = useState<string | null>(null);
  const cancelRef = useRef(false);

  const refresh = useCallback(() => {
    startTransition(async () => {
      const result = await listVideoRendersAction(storyId);
      if (!result.success) {
        if (!/relation|does not exist|schema cache/i.test(result.error)) {
          toast.error(result.error);
        }
        return;
      }
      setRenders(result.data);
    });
  }, [storyId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function runJob(job: VideoRenderRow) {
    cancelRef.current = false;
    setActiveRenderId(job.id);
    const wallStart = performance.now();

    try {
      await updateVideoRenderProgressAction({
        renderId: job.id,
        status: "preparing",
        progress: 1,
        elapsedMs: 0,
      });

      const result = await runBrowserTimelineRender(job.render_plan, {
        shouldCancel: () => cancelRef.current,
        onStatus: (status, progress, etaMs) => {
          void updateVideoRenderProgressAction({
            renderId: job.id,
            status,
            progress,
            elapsedMs: Math.round(performance.now() - wallStart),
            etaMs: etaMs ?? null,
            videoCodec: job.video_codec,
          });
          setRenders((prev) =>
            prev.map((r) =>
              r.id === job.id
                ? {
                    ...r,
                    status,
                    progress,
                    elapsed_ms: Math.round(performance.now() - wallStart),
                    eta_ms: etaMs ?? null,
                  }
                : r,
            ),
          );
        },
      });

      if (cancelRef.current) {
        await cancelVideoRenderAction({ renderId: job.id });
        toast.message("Render cancelled");
        refresh();
        return;
      }

      const uploaded = await uploadRenderOutputFromBrowser({
        organizationId,
        storyId,
        renderId: job.id,
        format: result.extension,
        mimeType: result.mimeType,
        blob: result.blob,
        durationMs: result.durationMs,
        thumbnailBlob: result.thumbnailBlob,
        videoCodec: result.codec,
      });

      if (!uploaded.success) {
        toast.error(uploaded.error);
        refresh();
        return;
      }

      toast.success("Render complete — video ready to download");
      refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Render failed";
      if (/cancel/i.test(message)) {
        await cancelVideoRenderAction({ renderId: job.id });
        toast.message("Render cancelled");
      } else {
        await updateVideoRenderProgressAction({
          renderId: job.id,
          status: "failed",
          error: message,
          finished: true,
          elapsedMs: Math.round(performance.now() - wallStart),
        });
        toast.error(message);
      }
      refresh();
    } finally {
      setActiveRenderId(null);
    }
  }

  async function enqueueAndRun(
    settings: VideoExportSettings,
  ): Promise<VideoRenderRow | null> {
    const created = await createVideoRenderAction({ storyId, settings });
    if (!created.success) {
      toast.error(created.error);
      return null;
    }
    setRenders((prev) => [created.data, ...prev]);
    toast.message("Render queued — starting in background");
    void runJob(created.data);
    return created.data;
  }

  return (
    <Card className="border-border/60">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Film className="size-5" />
              Video Rendering & Export
            </CardTitle>
            <CardDescription>
              Module 3.1 — render the production Timeline for{" "}
              <strong>{storyTitle}</strong> into MP4 / WebM / MOV. Non-destructive
              to Story, Panels, Scenes, and Timeline.
            </CardDescription>
          </div>
          <Button
            type="button"
            size="sm"
            className="h-8"
            disabled={pending || Boolean(activeRenderId)}
            onClick={() => setDialogOpen(true)}
          >
            {activeRenderId ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Film className="size-3.5" />
            )}
            Export…
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTitle>Background render</AlertTitle>
          <AlertDescription className="text-xs">
            Encoding runs in this browser session using the Timeline plan
            snapshot. Keep this tab open until the job finishes. HEVC / ProRes
            adapters can plug into the same queue later.
          </AlertDescription>
        </Alert>

        <VideoRenderQueue
          renders={renders}
          activeRenderId={activeRenderId}
          pending={pending}
          onRefresh={refresh}
          onCancel={(id) => {
            cancelRef.current = true;
            startTransition(async () => {
              const result = await cancelVideoRenderAction({ renderId: id });
              if (!result.success) toast.error(result.error);
              else toast.message("Cancel requested");
              refresh();
            });
          }}
          onRetry={(job) => {
            void enqueueAndRun({
              format: job.format,
              resolution:
                job.resolution_width === 1280
                  ? "1280x720"
                  : job.resolution_width === 3840
                    ? "3840x2160"
                    : "1920x1080",
              frameRate: Number(job.frame_rate) || 30,
              bitrateKbps: job.bitrate_kbps || DEFAULT_EXPORT_SETTINGS.bitrateKbps,
              includeVoice: Boolean(job.render_plan?.voiceUrl),
              includeMusic: Boolean(job.render_plan?.musicUrl),
            });
          }}
        />
      </CardContent>

      <VideoExportDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        pending={pending || Boolean(activeRenderId)}
        onSubmit={enqueueAndRun}
      />
    </Card>
  );
}
