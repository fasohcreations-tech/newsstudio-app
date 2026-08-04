"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  ChevronLeft,
  Copy,
  FastForward,
  Loader2,
  Pause,
  Play,
  Rewind,
  Save,
  Scissors,
  SkipBack,
  SkipForward,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { toast } from "sonner";

import {
  createAssetClipAction,
  duplicateAssetClipAction,
  importYoutubeForClipEditorAction,
  listAssetClipsAction,
  listVideoAssetsForClipEditorAction,
  queueClipOperationAction,
  resolveClipPlaybackUrlAction,
  updateAssetClipAction,
} from "@/features/asset-clip-editor/actions/clip.actions";
import { AssetClipPreview } from "@/features/asset-clip-editor/components/asset-clip-preview";
import { AssetClipTimeline } from "@/features/asset-clip-editor/components/asset-clip-timeline";
import { ClipAiRecommendationRail } from "@/features/ai-visual-understanding/components/clip-ai-recommendation-rail";
import {
  clamp,
  extractYouTubeVideoId,
  formatTimecode,
  frameStepMs,
  parseTimecode,
} from "@/features/asset-clip-editor/lib/timecode";
import { CLIP_IMPORT_PROVIDERS } from "@/features/asset-clip-editor/providers/import-providers";
import type { MediaAssetClipWithParent } from "@/features/asset-clip-editor/types/clip.types";
import { uploadMediaFiles } from "@/features/media/lib/upload-media";
import type { MediaAssetWithMeta } from "@/features/media/types/media.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const MAX_ZOOM = 8;

type AssetClipEditorWorkspaceProps = {
  organizationId: string;
  initialAssetId?: string | null;
  initialClipId?: string | null;
  /** Module 2.6 — Story Panel context for AI clip suggestions. */
  storyId?: string | null;
  panelIndex?: number | null;
};

export function AssetClipEditorWorkspace({
  organizationId,
  initialAssetId = null,
  initialClipId = null,
  storyId = null,
  panelIndex = null,
}: AssetClipEditorWorkspaceProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [videos, setVideos] = useState<MediaAssetWithMeta[]>([]);
  const [clips, setClips] = useState<MediaAssetClipWithParent[]>([]);
  const [assetId, setAssetId] = useState(initialAssetId ?? "");
  const [activeClipId, setActiveClipId] = useState<string | null>(
    initialClipId,
  );
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [external, setExternal] = useState(false);
  const [localDraftFile, setLocalDraftFile] = useState<File | null>(null);
  const [localDraftUrl, setLocalDraftUrl] = useState<string | null>(null);
  const [name, setName] = useState("Untitled Clip");
  const [notes, setNotes] = useState("");
  const [inMs, setInMs] = useState(0);
  const [outMs, setOutMs] = useState(10_000);
  const [currentMs, setCurrentMs] = useState(0);
  const [durationMs, setDurationMs] = useState(60_000);
  const [playing, setPlaying] = useState(false);
  /** Bumped on every user seek so preview re-syncs (and keeps playing from that point). */
  const [seekEpoch, setSeekEpoch] = useState(0);
  const [loopSelection, setLoopSelection] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [timecodeDraft, setTimecodeDraft] = useState("00:00:00");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [meta, setMeta] = useState<{
    width: number | null;
    height: number | null;
    frameRate: number;
  }>({ width: null, height: null, frameRate: 30 });

  const siblings = useMemo(
    () =>
      clips
        .filter((c) => c.parent_asset_id === assetId && c.id !== activeClipId)
        .map((c) => ({
          id: c.id,
          name: c.name,
          startMs: c.in_point_ms,
          endMs: c.out_point_ms,
        })),
    [clips, assetId, activeClipId],
  );

  const loadLibrary = useCallback(() => {
    startTransition(async () => {
      const listed = await listVideoAssetsForClipEditorAction();
      if (!listed.success) {
        toast.error(listed.error);
        return;
      }
      setVideos(listed.data);
      if (!assetId && !localDraftFile && listed.data[0]) {
        setAssetId(listed.data[0].id);
      }
    });
  }, [assetId, localDraftFile]);

  const loadClips = useCallback(
    (parentId?: string) => {
      startTransition(async () => {
        const result = await listAssetClipsAction(parentId);
        if (!result.success) {
          if (!/relation|does not exist|schema cache/i.test(result.error)) {
            toast.error(result.error);
          }
          return;
        }
        setClips(result.data);
        if (initialClipId) {
          const found = result.data.find((c) => c.id === initialClipId);
          if (found) {
            setActiveClipId(found.id);
            setAssetId(found.parent_asset_id);
            setName(found.name);
            setNotes(found.notes ?? "");
            setInMs(found.in_point_ms);
            setOutMs(found.out_point_ms);
            setCurrentMs(found.in_point_ms);
            setMeta((m) => ({
              ...m,
              frameRate: found.frame_rate || 30,
              width: found.width,
              height: found.height,
            }));
          }
        }
      });
    },
    [initialClipId],
  );

  useEffect(() => {
    loadLibrary();
    loadClips();
  }, [loadLibrary, loadClips]);

  useEffect(() => {
    if (!assetId) return;
    startTransition(async () => {
      const result = await resolveClipPlaybackUrlAction(assetId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setSourceUrl(result.data.url);
      setExternal(result.data.external);
      if (result.data.durationSeconds) {
        const dur = Math.round(result.data.durationSeconds * 1000);
        setDurationMs(dur);
        if (!activeClipId) {
          setOutMs(dur);
        }
      }
      setMeta((m) => ({
        ...m,
        width: result.data.width,
        height: result.data.height,
      }));
      if (!activeClipId) {
        setName(`${result.data.name} clip`);
      }
      loadClips(assetId);
    });
  }, [assetId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!localDraftFile) return;
    const url = URL.createObjectURL(localDraftFile);
    setLocalDraftUrl(url);
    setSourceUrl(url);
    setExternal(true);
    setActiveClipId(null);
    setAssetId("");
    setCurrentMs(0);
    setInMs(0);
    setOutMs(10_000);
    setPlaying(false);
    setName(`${localDraftFile.name.replace(/\.[^.]+$/, "")} clip`);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [localDraftFile]);

  useEffect(() => {
    setTimecodeDraft(formatTimecode(currentMs, meta.frameRate));
  }, [currentMs, meta.frameRate]);

  function seek(ms: number) {
    const next = clamp(ms, 0, durationMs);
    setCurrentMs(next);
    setSeekEpoch((n) => n + 1);
    // If already playing, keep playing from the new playhead (no re-click needed).
    // If paused, preview still seeks so the frame updates under the playhead.
  }

  function markIn() {
    setInMs(Math.min(currentMs, outMs - 1));
  }

  function markOut() {
    setOutMs(Math.max(currentMs, inMs + 1));
  }

  function saveClip() {
    startTransition(async () => {
      let parentAssetId = assetId;
      if (!parentAssetId && localDraftFile) {
        const uploaded = await uploadMediaFiles({
          organizationId,
          files: [localDraftFile],
        });
        if (uploaded.errors.length > 0 || !uploaded.assets[0]) {
          toast.error(
            uploaded.errors[0] ?? "Failed to upload local draft source.",
          );
          return;
        }
        parentAssetId = uploaded.assets[0].id;
        setAssetId(parentAssetId);
        setLocalDraftFile(null);
        setLocalDraftUrl(null);
        toast.success("Local draft uploaded to Media Library");
        loadLibrary();
      }
      if (!parentAssetId) {
        toast.error("Select a source asset first.");
        return;
      }
      if (activeClipId) {
        const result = await updateAssetClipAction(activeClipId, {
          name,
          notes,
          inPointMs: inMs,
          outPointMs: outMs,
          frameRate: meta.frameRate,
        });
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success("Clip updated");
        setClips((prev) =>
          prev.map((c) => (c.id === result.data.id ? result.data : c)),
        );
        return;
      }

      const result = await createAssetClipAction({
        parentAssetId,
        name,
        notes,
        tags: [],
        inPointMs: inMs,
        outPointMs: outMs,
        frameRate: meta.frameRate,
        width: meta.width,
        height: meta.height,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Clip saved to Asset Library");
      setActiveClipId(result.data.id);
      setClips((prev) => [result.data, ...prev]);
      router.replace(
        `/media-library/clip-editor?asset=${parentAssetId}&clipId=${result.data.id}`,
      );
    });
  }

  function importYoutube() {
    startTransition(async () => {
      const result = await importYoutubeForClipEditorAction({
        url: youtubeUrl,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("YouTube source registered");
      setAssetId(result.data.assetId);
      setActiveClipId(null);
      setYoutubeUrl("");
      loadLibrary();
    });
  }

  const youtubePreview = sourceUrl ? extractYouTubeVideoId(sourceUrl) : null;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col bg-background">
      <header className="flex flex-wrap items-center gap-2 border-b border-border/70 px-4 py-2">
        <Link
          href="/media-library/clips"
          className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-sm hover:bg-muted"
        >
          <ChevronLeft className="size-4" />
          Clips
        </Link>
        <Scissors className="size-4 text-muted-foreground" />
        <h1 className="text-sm font-semibold">Asset Clip Editor</h1>
        <Badge variant="secondary" className="text-[10px]">
          Module 2.5 + 2.6
        </Badge>
        <div className="ml-auto flex flex-wrap gap-1.5">
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1"
            disabled={pending || !assetId}
            onClick={saveClip}
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            {activeClipId ? "Update clip" : "Save clip"}
          </Button>
          {activeClipId ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  const result = await duplicateAssetClipAction(activeClipId);
                  if (!result.success) {
                    toast.error(result.error);
                    return;
                  }
                  toast.success("Clip duplicated");
                  setClips((prev) => [result.data, ...prev]);
                  setActiveClipId(result.data.id);
                  setName(result.data.name);
                });
              }}
            >
              <Copy className="size-3.5" />
              Duplicate
            </Button>
          ) : null}
        </div>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[260px_minmax(0,1fr)_280px_270px]">
        {/* Sources */}
        <aside className="space-y-3 overflow-auto border-r border-border/60 p-3">
          <div>
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Import providers
            </p>
            <ul className="space-y-1">
              {CLIP_IMPORT_PROVIDERS.map((p) => (
                <li
                  key={p.id}
                  className="rounded-md border border-border/50 px-2 py-1.5 text-[11px]"
                >
                  <span className="font-medium">{p.label}</span>
                  <span className="mt-0.5 block text-muted-foreground">
                    {p.description}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px]">Local device video (draft)</Label>
            <Input
              type="file"
              accept="video/*"
              className="h-8 text-xs"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                if (!file) return;
                setLocalDraftFile(file);
              }}
            />
            <p className="text-[10px] text-muted-foreground">
              Preview locally now. File uploads only when you Save clip.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px]">YouTube URL</Label>
            <Input
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=…"
              className="h-8 text-xs"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 w-full"
              disabled={pending || !youtubeUrl.trim()}
              onClick={importYoutube}
            >
              Import YouTube
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px]">Media Library video</Label>
            <Select
              value={assetId || null}
              onValueChange={(v: string | null) => {
                if (!v) return;
                setLocalDraftFile(null);
                setLocalDraftUrl(null);
                setAssetId(v);
                setActiveClipId(null);
                setPlaying(false);
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select video asset" />
              </SelectTrigger>
              <SelectContent>
                {videos.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Link
              href="/media-library"
              className="inline-flex h-7 w-full items-center justify-center rounded-lg text-xs hover:bg-muted"
            >
              Open Media Library
            </Link>
          </div>

          <div className="space-y-1.5">
            <p className="text-[11px] font-medium text-muted-foreground">
              Clips on this source
            </p>
            <div className="max-h-48 space-y-1 overflow-auto">
              {clips
                .filter((c) => !assetId || c.parent_asset_id === assetId)
                .map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={cn(
                      "w-full rounded border px-2 py-1.5 text-left text-[11px]",
                      c.id === activeClipId
                        ? "border-foreground/40 bg-muted"
                        : "border-border/50 hover:border-foreground/20",
                    )}
                    onClick={() => {
                      setActiveClipId(c.id);
                      setAssetId(c.parent_asset_id);
                      setName(c.name);
                      setNotes(c.notes ?? "");
                      setInMs(c.in_point_ms);
                      setOutMs(c.out_point_ms);
                      setCurrentMs(c.in_point_ms);
                    }}
                  >
                    <span className="font-medium">{c.name}</span>
                    <span className="mt-0.5 block text-muted-foreground">
                      {formatTimecode(c.in_point_ms)} →{" "}
                      {formatTimecode(c.out_point_ms)}
                    </span>
                  </button>
                ))}
              {clips.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">
                  No clips yet. Set IN/OUT and Save.
                </p>
              ) : null}
            </div>
          </div>
        </aside>

        {/* Preview + timeline */}
        <section className="flex min-h-0 flex-col">
          <div className="relative min-h-[240px] flex-1 bg-zinc-950">
            <AssetClipPreview
              sourceUrl={sourceUrl}
              currentMs={currentMs}
              playing={playing}
              seekEpoch={seekEpoch}
              inMs={inMs}
              outMs={outMs}
              loopSelection={loopSelection}
              onTimeUpdate={setCurrentMs}
              onDuration={(ms) => {
                setDurationMs(ms);
                if (!activeClipId && outMs > ms) setOutMs(ms);
              }}
              onPlayingChange={setPlaying}
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 border-t border-border/60 bg-muted/20 px-3 py-2">
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="size-8"
              onClick={() => seek(inMs)}
              title="Jump to IN"
            >
              <SkipBack className="size-3.5" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="size-8"
              onClick={() =>
                seek(currentMs + frameStepMs(-1, false, meta.frameRate))
              }
            >
              <Rewind className="size-3.5" />
            </Button>
            <Button
              type="button"
              size="icon"
              className="size-8"
              onClick={() => setPlaying((p) => !p)}
            >
              {playing ? (
                <Pause className="size-3.5" />
              ) : (
                <Play className="size-3.5" />
              )}
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="size-8"
              onClick={() =>
                seek(currentMs + frameStepMs(1, false, meta.frameRate))
              }
            >
              <FastForward className="size-3.5" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="size-8"
              onClick={() => seek(outMs)}
              title="Jump to OUT"
            >
              <SkipForward className="size-3.5" />
            </Button>

            <Button type="button" size="sm" variant="secondary" className="h-8" onClick={markIn}>
              Mark IN
            </Button>
            <Button type="button" size="sm" variant="secondary" className="h-8" onClick={markOut}>
              Mark OUT
            </Button>
            <Button
              type="button"
              size="sm"
              variant={loopSelection ? "default" : "outline"}
              className="h-8"
              onClick={() => setLoopSelection((v) => !v)}
            >
              Loop
            </Button>

            <div className="ml-auto flex items-center gap-1">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-8"
                onClick={() => setZoom((z) => Math.max(1, z / 1.5))}
              >
                <ZoomOut className="size-3.5" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-8"
                onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z * 1.5))}
              >
                <ZoomIn className="size-3.5" />
              </Button>
            </div>
          </div>

          <AssetClipTimeline
            durationMs={durationMs}
            currentMs={currentMs}
            inMs={inMs}
            outMs={outMs}
            zoom={zoom}
            frameRate={meta.frameRate}
            onSeek={seek}
            onChangeIn={setInMs}
            onChangeOut={setOutMs}
            siblingClips={siblings}
            thumbnailUrl={
              youtubePreview
                ? `https://i.ytimg.com/vi/${youtubePreview}/hqdefault.jpg`
                : null
            }
          />
        </section>

        {/* Metadata */}
        <aside className="space-y-3 overflow-auto border-l border-border/60 p-3">
          <div className="space-y-1.5">
            <Label className="text-[11px]">Clip name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px]">Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-20 text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px]">Timecode (seek)</Label>
            <div className="flex gap-1">
              <Input
                value={timecodeDraft}
                onChange={(e) => setTimecodeDraft(e.target.value)}
                className="h-8 font-mono text-xs"
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  const ms = parseTimecode(timecodeDraft, meta.frameRate);
                  if (ms == null) {
                    toast.error("Invalid timecode");
                    return;
                  }
                  seek(ms);
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8"
                onClick={() => {
                  const ms = parseTimecode(timecodeDraft, meta.frameRate);
                  if (ms == null) {
                    toast.error("Invalid timecode");
                    return;
                  }
                  seek(ms);
                }}
              >
                Go
              </Button>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-2 rounded-lg border border-border/60 p-2 text-[11px]">
            <div>
              <dt className="text-muted-foreground">Current</dt>
              <dd className="font-mono">{formatTimecode(currentMs, meta.frameRate)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Duration</dt>
              <dd className="font-mono">{formatTimecode(durationMs, meta.frameRate)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Selection</dt>
              <dd className="font-mono">
                {formatTimecode(Math.max(0, outMs - inMs), meta.frameRate)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Frame rate</dt>
              <dd>{meta.frameRate} fps</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Resolution</dt>
              <dd>
                {meta.width && meta.height
                  ? `${meta.width}×${meta.height}`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Source</dt>
              <dd>{external ? "External" : "Library"}</dd>
            </div>
            {localDraftUrl ? (
              <div>
                <dt className="text-muted-foreground">Draft source</dt>
                <dd>Local device</dd>
              </div>
            ) : null}
          </dl>

          <div className="space-y-1.5">
            <p className="text-[11px] font-medium text-muted-foreground">
              Clip operations
            </p>
            <div className="flex flex-wrap gap-1">
              {(
                [
                  ["generate_poster", "Poster"],
                  ["extract_audio", "Extract audio"],
                  ["create_proxy", "Create proxy"],
                ] as const
              ).map(([op, label]) => (
                <Button
                  key={op}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px]"
                  disabled={!activeClipId || pending}
                  onClick={() => {
                    if (!activeClipId) return;
                    startTransition(async () => {
                      const result = await queueClipOperationAction(
                        activeClipId,
                        op,
                      );
                      if (!result.success) {
                        toast.error(result.error);
                        return;
                      }
                      toast.success(`${label} queued`);
                    });
                  }}
                >
                  {label}
                </Button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">
              Operations queue metadata jobs. Original assets are never modified.
            </p>
          </div>

          {activeClipId ? (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2 text-[11px]">
              <p className="font-medium text-emerald-700 dark:text-emerald-400">
                Saved clip
              </p>
              <p className="mt-1 break-all font-mono text-muted-foreground">
                clip://{activeClipId}
              </p>
              <p className="mt-1 text-muted-foreground">
                Attach this ref to a Story Panel. Scene Builder prefers clips over
                originals.
              </p>
            </div>
          ) : null}
        </aside>

        <ClipAiRecommendationRail
          mediaAssetId={assetId || null}
          durationMs={durationMs}
          storyId={storyId}
          panelIndex={panelIndex}
          currentInMs={inMs}
          currentOutMs={outMs}
          onApplySuggestion={(nextIn, nextOut) => {
            setInMs(nextIn);
            setOutMs(nextOut);
            setCurrentMs(nextIn);
            setSeekEpoch((n) => n + 1);
            setPlaying(true);
          }}
        />
      </div>
    </div>
  );
}
