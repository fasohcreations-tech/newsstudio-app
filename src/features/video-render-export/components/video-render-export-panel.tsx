"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Cloud, Film, HardDrive, Loader2, Trash2 } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  cancelVideoRenderAction,
  clearVideoRendersAction,
  createVideoRenderAction,
  executeProviderRenderAction,
  getActiveRenderProviderAction,
  getVideoRenderAction,
  listVideoRendersAction,
  updateVideoRenderProgressAction,
} from "@/features/video-render-export/actions/render.actions";
import {
  ComposedSceneCaptureHost,
  COMPOSED_CAPTURE_ENGINE,
  type ComposedSceneCaptureApi,
} from "@/features/video-render-export/components/composed-scene-capture-host";
import { VideoExportDialog } from "@/features/video-render-export/components/video-export-dialog";
import { VideoRenderQueue } from "@/features/video-render-export/components/video-render-queue";
import { DEFAULT_EXPORT_SETTINGS } from "@/features/video-render-export/constants/render.constants";
import { logVerify } from "@/features/video-render-export/lib/render-verification";
import { runBrowserTimelineRender } from "@/features/video-render-export/services/browser-render-worker";
import type { RenderProviderId } from "@/features/video-render-export/types/render-provider.types";
import type {
  VideoExportSettings,
  VideoRenderRow,
} from "@/features/video-render-export/types/render.types";
import { cn } from "@/lib/utils";

type VideoRenderExportPanelProps = {
  storyId: string;
  storyTitle: string;
  organizationId: string;
};

type LocalFileEntry = {
  downloadPath: string;
  filename: string;
};

type EncodeLogLine = {
  id: string;
  at: string;
  message: string;
};

const PROVIDER_STORAGE_KEY = "mediaos.renderProvider";
const MAX_LOG_LINES = 400;

/**
 * Module 3.1 Export UI.
 * Local: capture assembled Motion Scenes in-browser → FFmpeg finalize + voice.
 * Cloud: submit RenderPlan to RenderOS.
 */
export function VideoRenderExportPanel({
  storyId,
  storyTitle,
  organizationId: _organizationId,
}: VideoRenderExportPanelProps) {
  const [pending, startTransition] = useTransition();
  const [renders, setRenders] = useState<VideoRenderRow[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeRenderId, setActiveRenderId] = useState<string | null>(null);
  const [localReadyIds, setLocalReadyIds] = useState<string[]>([]);
  const [provider, setProvider] = useState<RenderProviderId>("local");
  const [envDefault, setEnvDefault] = useState<RenderProviderId | null>(null);
  const [panelTab, setPanelTab] = useState<"queue" | "log">("queue");
  const [encodeLogs, setEncodeLogs] = useState<EncodeLogLine[]>([]);
  const localFilesRef = useRef<Record<string, LocalFileEntry>>({});
  const cancelRef = useRef(false);
  const captureRef = useRef<ComposedSceneCaptureApi | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  const appendLog = useCallback((message: string) => {
    const line: EncodeLogLine = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      at: new Date().toLocaleTimeString(),
      message,
    };
    setEncodeLogs((prev) => {
      const next = [...prev, line];
      return next.length > MAX_LOG_LINES ? next.slice(-MAX_LOG_LINES) : next;
    });
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ block: "end" });
  }, [encodeLogs.length]);

  const refresh = useCallback(() => {
    startTransition(async () => {
      const result = await listVideoRendersAction(storyId);
      if (!result.success) {
        if (!/relation|does not exist|schema cache/i.test(result.error)) {
          toast.error(result.error);
          appendLog(`List renders error: ${result.error}`);
        }
        return;
      }
      setRenders(result.data);
    });
  }, [storyId, appendLog]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    void getActiveRenderProviderAction().then((result) => {
      if (!result.success) return;
      setEnvDefault(result.data.id);
      try {
        const saved = window.localStorage.getItem(PROVIDER_STORAGE_KEY);
        if (saved === "local" || saved === "cloud") {
          setProvider(saved);
          return;
        }
      } catch {
        /* ignore */
      }
      setProvider(result.data.id);
    });
  }, []);

  function chooseProvider(next: RenderProviderId) {
    setProvider(next);
    appendLog(`Render engine set to ${next}`);
    try {
      window.localStorage.setItem(PROVIDER_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  function patchLocal(renderId: string, patch: Partial<VideoRenderRow>) {
    setRenders((prev) =>
      prev.map((r) => (r.id === renderId ? { ...r, ...patch } : r)),
    );
  }

  function rememberLocalFile(renderId: string, entry: LocalFileEntry) {
    localFilesRef.current[renderId] = { ...entry };
    setLocalReadyIds((prev) =>
      prev.includes(renderId) ? prev : [...prev, renderId],
    );
  }

  function handleDownloadLocal(renderId: string) {
    const entry = localFilesRef.current[renderId];
    if (!entry) {
      window.location.href = `/api/video-renders/${renderId}/local-download`;
      return;
    }
    const a = document.createElement("a");
    a.href = entry.downloadPath;
    a.download = entry.filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success("Local download started");
    appendLog(`Local download: ${entry.filename}`);
  }

  async function stageComposedCapture(job: VideoRenderRow) {
    if (!captureRef.current) {
      throw new Error("Composed scene capture host is not ready");
    }

    setPanelTab("log");
    appendLog(
      `Job ${job.id.slice(0, 8)} — capturing assembled Motion Scenes…`,
    );
    appendLog(`Capture engine: ${COMPOSED_CAPTURE_ENGINE}`);
    appendLog("── Stage 1: Timeline → clips");
    const plan = job.render_plan;
    logVerify(
      appendLog,
      plan.clips.length > 0,
      "Clip order",
      `${plan.clips.length} scene clip(s), ${(plan.durationMs / 1000).toFixed(1)}s`,
    );
    for (const c of plan.clips) {
      logVerify(
        appendLog,
        Boolean(c.motionSceneId),
        `Scene ref ${c.name.slice(0, 24)}`,
        c.motionSceneId
          ? `${c.motionSceneId.slice(0, 8)} · ${(c.durationMs / 1000).toFixed(1)}s`
          : "missing motionSceneId",
      );
    }
    logVerify(
      appendLog,
      Boolean(plan.voiceUrl),
      "Voice reference",
      plan.voiceUrl ? plan.voiceUrl.slice(0, 56) : "none",
    );

    appendLog("── Stage 2–4: Scene Instance / Assets / Composition");
    for (const c of plan.clips) {
      logVerify(
        appendLog,
        Boolean(c.videoUrl || c.imageUrl),
        `Main media (${c.name.slice(0, 20)})`,
        c.videoUrl
          ? `video ${c.videoUrl.slice(0, 40)}…`
          : c.imageUrl
            ? `image ${c.imageUrl.slice(0, 40)}…`
            : "MISSING",
      );
      logVerify(
        appendLog,
        Boolean(c.headline?.trim()),
        "Headline",
        c.headline?.slice(0, 40) || "empty",
      );
      logVerify(
        appendLog,
        Boolean(c.subheadline?.trim()),
        "Subheadline",
        c.subheadline?.slice(0, 40) || "empty",
      );
      logVerify(
        appendLog,
        Boolean(c.tickerText?.trim()),
        "Ticker",
        c.tickerText?.slice(0, 40) || "empty (may use composer binding)",
      );
      logVerify(
        appendLog,
        Boolean(c.logoUrl),
        "Logo",
        c.logoUrl ? c.logoUrl.slice(0, 40) : "none on plan",
      );
      logVerify(
        appendLog,
        Boolean(c.advertisementUrl),
        "Advertisement",
        c.advertisementUrl ? c.advertisementUrl.slice(0, 40) : "none on plan",
      );
    }

    toast.message("Capturing assembled Motion Scenes…");
    let lastBucket = -1;
    let lastLoggedProgress = -1;

    const captured = await runBrowserTimelineRender(job.render_plan, {
      videoOnly: true,
      shouldCancel: () => cancelRef.current,
      verification: { renderId: job.id, enabled: true },
      capture: {
        warmUp: (p) => {
          const api = captureRef.current;
          if (!api) throw new Error("Composed scene capture host is not ready");
          return api.warmUp(p);
        },
        paintFrame: (timeMs, dest) => {
          const api = captureRef.current;
          if (!api) throw new Error("Composed scene capture host is not ready");
          return api.paintFrame(timeMs, dest);
        },
        verifyReadiness: (p) => {
          const api = captureRef.current;
          if (!api) throw new Error("Composed scene capture host is not ready");
          return api.verifyReadiness(p);
        },
      },
      onStatus: (status, progress, etaMs) => {
        const mapped = 5 + (progress / 100) * 47;
        patchLocal(job.id, {
          status,
          progress: mapped,
          eta_ms: etaMs ?? null,
        });
        const bucket = Math.floor(mapped / 5);
        if (bucket !== lastBucket || mapped >= 50) {
          lastBucket = bucket;
          void updateVideoRenderProgressAction({
            renderId: job.id,
            status: "preparing",
            progress: mapped,
            etaMs: etaMs ?? null,
          });
        }
        if (Math.floor(mapped) !== lastLoggedProgress && Math.floor(mapped) % 5 === 0) {
          lastLoggedProgress = Math.floor(mapped);
          appendLog(
            `Capture ${status} ${Math.round(mapped)}%` +
              (etaMs != null ? ` · ETA ${Math.round(etaMs / 1000)}s` : ""),
          );
        }
      },
      onLog: (message) => {
        appendLog(message);
      },
    });

    if (cancelRef.current) throw new Error("Cancelled");

    appendLog(
      `Composed WebM ready (${(captured.blob.size / (1024 * 1024)).toFixed(1)} MB) — staging…`,
    );
    const form = new FormData();
    form.append(
      "file",
      captured.blob,
      `composed-${job.id.slice(0, 8)}.${captured.extension}`,
    );
    form.append("frameCount", String(captured.frameCount ?? 0));
    const res = await fetch(`/api/video-renders/${job.id}/stage-composed`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      throw new Error(
        body?.error || `Failed to stage composed video (${res.status})`,
      );
    }
    logVerify(appendLog, true, "Composed WebM staged for FFmpeg");

    patchLocal(job.id, { status: "rendering", progress: 54 });
    appendLog("── Stage 7: FFmpeg (mux/encode only — no scene compose)");
    appendLog("Composed scenes staged — FFmpeg finalize starting…");
    toast.message("Composed scenes staged — FFmpeg finalize…");
  }

  async function runJob(job: VideoRenderRow) {
    cancelRef.current = false;
    setActiveRenderId(job.id);
    appendLog(
      `── Job ${job.id.slice(0, 8)} start · provider=${provider} · ${job.format.toUpperCase()} ${job.resolution_width}×${job.resolution_height} @ ${job.frame_rate}fps`,
    );

    const poll = window.setInterval(() => {
      void getVideoRenderAction(job.id).then((latest) => {
        if (!latest.success) return;
        setRenders((prev) =>
          prev.map((r) => {
            if (r.id !== job.id) return r;
            const next = latest.data;
            const keepProgress =
              Number(r.progress) > Number(next.progress) &&
              !["succeeded", "failed", "cancelled"].includes(next.status);
            return {
              ...next,
              progress: keepProgress ? r.progress : next.progress,
              status: keepProgress ? r.status : next.status,
            };
          }),
        );
      });
    }, 2000);

    try {
      if (provider === "local") {
        await stageComposedCapture(job);
      }

      appendLog("Calling RenderManager / provider execute…");
      const result = await executeProviderRenderAction({
        renderId: job.id,
        storyId,
        provider,
      });

      const latest = await getVideoRenderAction(job.id);
      const row = latest.success
        ? latest.data
        : result.success
          ? result.data.job
          : null;
      if (row) patchLocal(job.id, row);

      if (cancelRef.current || row?.status === "cancelled") {
        appendLog("Cancelled.");
        toast.message("Render cancelled");
        return;
      }

      if (!result.success || row?.status === "failed") {
        const err = result.success
          ? (row?.error ?? "Render failed")
          : result.error;
        appendLog(`FAILED: ${err}`);
        setPanelTab("log");
        toast.error(err);
        return;
      }

      appendLog(
        `Provider done: ${result.data.provider.displayName} · codec=${result.data.job.video_codec ?? "—"}`,
      );
      logVerify(appendLog, true, "FFmpeg Started / Provider execute done");
      logVerify(appendLog, true, "Export Completed");

      patchLocal(job.id, {
        ...(row ?? {}),
        status: "succeeded",
        progress: 100,
        eta_ms: null,
      });

      if (result.data.localFile) {
        rememberLocalFile(result.data.localFile.renderId, {
          downloadPath: result.data.localFile.downloadPath,
          filename: `${storyTitle.replace(/[^\w\-]+/g, "_").slice(0, 40) || "render"}-${job.id.slice(0, 8)}.${result.data.localFile.extension}`,
        });
        handleDownloadLocal(job.id);
        appendLog(
          `Local file ready (${(result.data.localFile.byteLength / (1024 * 1024)).toFixed(1)} MB)`,
        );
        setPanelTab("queue");
      } else if (provider === "local") {
        appendLog(
          "WARN: Provider finished without a local file — check FFmpeg / stage cache.",
        );
      }

      if (row?.error?.includes("Cloud upload skipped")) {
        appendLog(row.error);
        toast.message("Encode complete — use Local file (Storage size limit)");
      } else {
        toast.success(
          `Render complete via ${result.data.provider.displayName}`,
        );
        appendLog("Succeeded.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Render failed";
      appendLog(`ERROR: ${message}`);
      setPanelTab("log");
      if (/cancel/i.test(message)) {
        await cancelVideoRenderAction({ renderId: job.id });
        toast.message("Render cancelled");
      } else {
        await updateVideoRenderProgressAction({
          renderId: job.id,
          status: "failed",
          error: message,
          finished: true,
        });
        toast.error(message);
      }
    } finally {
      window.clearInterval(poll);
      setActiveRenderId(null);
      refresh();
    }
  }

  async function enqueueAndRun(
    settings: VideoExportSettings,
  ): Promise<VideoRenderRow | null> {
    const created = await createVideoRenderAction({ storyId, settings });
    if (!created.success) {
      toast.error(created.error);
      appendLog(`Create job failed: ${created.error}`);
      return null;
    }
    setRenders((prev) => [created.data, ...prev]);
    appendLog(`Queued job ${created.data.id.slice(0, 8)}`);
    toast.message(
      provider === "local"
        ? "Render queued — capturing assembled scenes, then Local FFmpeg"
        : "Render queued — RenderOS Cloud",
    );
    void runJob(created.data);
    return created.data;
  }

  function handleClearQueue() {
    startTransition(async () => {
      const keepId = activeRenderId;
      const result = await clearVideoRendersAction({
        storyId,
        finishedOnly: false,
        excludeIds: keepId ? [keepId] : undefined,
      });
      if (!result.success) {
        toast.error(result.error);
        appendLog(`Clear queue failed: ${result.error}`);
        return;
      }
      localFilesRef.current = {};
      setLocalReadyIds((prev) =>
        keepId ? prev.filter((id) => id === keepId) : [],
      );
      setRenders((prev) =>
        keepId ? prev.filter((r) => r.id === keepId) : [],
      );
      toast.message(
        result.data.cleared === 0
          ? keepId
            ? "Active job kept — nothing else to clear"
            : "Nothing to clear"
          : `Cleared ${result.data.cleared} job${result.data.cleared === 1 ? "" : "s"}`,
      );
      appendLog(`Cleared ${result.data.cleared} job(s) from queue`);
      refresh();
    });
  }

  return (
    <Card className="border-border/60">
      <ComposedSceneCaptureHost ref={captureRef} onLog={appendLog} />
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Film className="size-5" />
              Video Rendering & Export
            </CardTitle>
            <CardDescription>
              Module 3.1 — render the production Timeline for{" "}
              <strong>{storyTitle}</strong>. Non-destructive to Story, Panels,
              Scenes, and Timeline.
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
        <div className="space-y-2 rounded-lg border border-border/60 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label className="text-sm font-medium">Render engine</Label>
            {envDefault ? (
              <span className="text-[11px] text-muted-foreground">
                Env default: <code>{envDefault}</code>
              </span>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={Boolean(activeRenderId)}
              onClick={() => chooseProvider("local")}
              className={cn(
                "flex items-start gap-2 rounded-md border px-3 py-2 text-left text-xs transition-colors",
                provider === "local"
                  ? "border-foreground/30 bg-muted"
                  : "border-border/60 hover:bg-muted/50",
              )}
            >
              <HardDrive className="mt-0.5 size-4 shrink-0" />
              <span>
                <span className="block font-medium">Local FFmpeg</span>
                <span className="text-muted-foreground">
                  Assembled scenes + FFmpeg finalize
                </span>
              </span>
            </button>
            <button
              type="button"
              disabled={Boolean(activeRenderId)}
              onClick={() => chooseProvider("cloud")}
              className={cn(
                "flex items-start gap-2 rounded-md border px-3 py-2 text-left text-xs transition-colors",
                provider === "cloud"
                  ? "border-foreground/30 bg-muted"
                  : "border-border/60 hover:bg-muted/50",
              )}
            >
              <Cloud className="mt-0.5 size-4 shrink-0" />
              <span>
                <span className="block font-medium">RenderOS Cloud</span>
                <span className="text-muted-foreground">
                  Remote service via RENDER_API
                </span>
              </span>
            </button>
          </div>
        </div>

        <Alert>
          <AlertTitle>
            {provider === "local" ? "Local FFmpeg" : "RenderOS Cloud"} — active
            for next Export
          </AlertTitle>
          <AlertDescription className="text-xs">
            {provider === "local" ? (
              <>
                Captures assembled Motion Scenes, rematerializes media via a
                same-origin proxy (avoids canvas CORS taint), then FFmpeg muxes
                voice. Watch the <strong>Log</strong> tab for encode updates.
              </>
            ) : (
              <>
                Encode is submitted to <strong>RenderOS</strong> (
                <code>RENDER_API</code>).
              </>
            )}
          </AlertDescription>
        </Alert>

        <Tabs
          value={panelTab}
          onValueChange={(v) => {
            if (v === "queue" || v === "log") setPanelTab(v);
          }}
        >
          <TabsList>
            <TabsTrigger value="queue">Queue</TabsTrigger>
            <TabsTrigger value="log">
              Log
              {encodeLogs.length > 0 ? (
                <span className="ml-1 font-mono text-[10px] text-muted-foreground">
                  ({encodeLogs.length})
                </span>
              ) : null}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="queue" className="mt-3">
            <VideoRenderQueue
              renders={renders}
              activeRenderId={activeRenderId}
              pending={pending}
              localReadyIds={localReadyIds}
              onRefresh={refresh}
              onClearQueue={handleClearQueue}
              onDownloadLocal={handleDownloadLocal}
              onCancel={(id) => {
                cancelRef.current = true;
                appendLog(`Cancel requested for ${id.slice(0, 8)}`);
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
                  bitrateKbps:
                    job.bitrate_kbps || DEFAULT_EXPORT_SETTINGS.bitrateKbps,
                  includeVoice: Boolean(job.render_plan?.voiceUrl),
                  includeMusic: Boolean(job.render_plan?.musicUrl),
                });
              }}
            />
          </TabsContent>

          <TabsContent value="log" className="mt-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">Encode log</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7"
                  disabled={encodeLogs.length === 0}
                  onClick={() => setEncodeLogs([])}
                >
                  <Trash2 className="size-3.5" />
                  Clear log
                </Button>
              </div>
              <ScrollArea className="h-56 rounded-md border border-border/60 bg-muted/20 p-2">
                {encodeLogs.length === 0 ? (
                  <p className="p-2 text-xs text-muted-foreground">
                    Encode updates will appear here when you Export.
                  </p>
                ) : (
                  <ul className="space-y-1 font-mono text-[11px] leading-relaxed">
                    {encodeLogs.map((line) => (
                      <li key={line.id} className="flex gap-2">
                        <span className="shrink-0 text-muted-foreground">
                          {line.at}
                        </span>
                        <span className="break-all text-foreground/90">
                          {line.message}
                        </span>
                      </li>
                    ))}
                    <div ref={logEndRef} />
                  </ul>
                )}
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
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
