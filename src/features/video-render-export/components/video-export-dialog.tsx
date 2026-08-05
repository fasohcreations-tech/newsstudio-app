"use client";

import { useState } from "react";
import { Film, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_EXPORT_SETTINGS,
  VIDEO_EXPORT_FORMATS,
  VIDEO_EXPORT_FRAME_RATES,
  VIDEO_EXPORT_RESOLUTIONS,
} from "@/features/video-render-export/constants/render.constants";
import type {
  VideoExportSettings,
  VideoRenderRow,
} from "@/features/video-render-export/types/render.types";

type ExportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  onSubmit: (settings: VideoExportSettings) => Promise<VideoRenderRow | null>;
};

export function VideoExportDialog({
  open,
  onOpenChange,
  pending,
  onSubmit,
}: ExportDialogProps) {
  const [settings, setSettings] = useState<VideoExportSettings>({
    ...DEFAULT_EXPORT_SETTINGS,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="size-4" />
            Export Video
          </DialogTitle>
          <DialogDescription>
            Render the assembled Timeline into a publishable file. Sources are
            never modified.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="export-format">Format</Label>
            <select
              id="export-format"
              className="h-9 rounded-md border border-border bg-background px-2 text-sm"
              value={settings.format}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  format: e.target.value as VideoExportSettings["format"],
                }))
              }
            >
              {VIDEO_EXPORT_FORMATS.map((f) => (
                <option key={f.id} value={f.id} disabled={!f.ready}>
                  {f.label}
                  {f.note ? ` — ${f.note}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="export-res">Resolution</Label>
            <select
              id="export-res"
              className="h-9 rounded-md border border-border bg-background px-2 text-sm"
              value={settings.resolution}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  resolution: e.target
                    .value as VideoExportSettings["resolution"],
                }))
              }
            >
              {VIDEO_EXPORT_RESOLUTIONS.map((r) => (
                <option key={r.id} value={r.id} disabled={!r.ready}>
                  {r.label}
                  {!r.ready ? " (soon)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="export-fps">Frame rate</Label>
              <select
                id="export-fps"
                className="h-9 rounded-md border border-border bg-background px-2 text-sm"
                value={settings.frameRate}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    frameRate: Number(e.target.value),
                  }))
                }
              >
                {VIDEO_EXPORT_FRAME_RATES.map((fps) => (
                  <option key={fps} value={fps}>
                    {fps} fps
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="export-bitrate">Bitrate (kbps)</Label>
              <input
                id="export-bitrate"
                type="number"
                min={500}
                max={100000}
                step={500}
                className="h-9 rounded-md border border-border bg-background px-2 text-sm"
                value={settings.bitrateKbps}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    bitrateKbps: Number(e.target.value) || 8000,
                  }))
                }
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-md border border-border/60 p-3 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.includeVoice}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    includeVoice: e.target.checked,
                  }))
                }
              />
              Include story voiceover (AAC · stereo · 48 kHz)
            </label>
            <label className="flex items-center gap-2 text-muted-foreground">
              <input
                type="checkbox"
                checked={settings.includeMusic}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    includeMusic: e.target.checked,
                  }))
                }
              />
              Include background music (when present on Timeline)
            </label>
          </div>

          <div className="rounded-md border border-border/60 p-3 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.previewScope === "shortest"}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    previewScope: e.target.checked ? "shortest" : "full",
                  }))
                }
              />
              Test render — shortest scene only
            </label>
            <p className="mt-1 text-xs text-muted-foreground">
              Captures one scene at full frame rate to check motion fidelity in
              minutes. A full timeline render takes roughly a minute of
              rasterizing per second of output.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={pending}
            onClick={async () => {
              const row = await onSubmit(settings);
              if (row) onOpenChange(false);
            }}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Film className="size-4" />
            )}
            Start render
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
