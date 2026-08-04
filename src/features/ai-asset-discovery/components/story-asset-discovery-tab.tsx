"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  Check,
  ImageIcon,
  Loader2,
  RefreshCw,
  Search,
  Video,
} from "lucide-react";
import { toast } from "sonner";

import {
  getStoryAssetDiscoveryAction,
  importWebMediaAsAssetAction,
  searchWebMediaForSubHeadlineAction,
} from "@/features/ai-asset-discovery/actions/discovery.actions";
import type { WebMediaHit } from "@/features/ai-asset-discovery/services/web-media-search.service";
import type { StoryDiscoveryBundle } from "@/features/ai-asset-discovery/types/discovery.types";
import type { StoryWithRelations } from "@/features/newsroom/types/story.types";
import {
  parseSubHeadlineMedia,
  parseSubHeadlineSlots,
} from "@/features/story-production/lib/sub-headlines";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type MediaFilter = "both" | "image" | "video";

type PanelWebResults = {
  panelIndex: number;
  query: string;
  providers: string[];
  hits: WebMediaHit[];
  warning?: string;
};

type StoryAssetDiscoveryTabProps = {
  story: StoryWithRelations;
  disabled?: boolean;
};

function WebHitCard({
  hit,
  disabled,
  importing,
  onAdd,
}: {
  hit: WebMediaHit;
  disabled?: boolean;
  importing?: boolean;
  onAdd: () => void;
}) {
  const isVideo = hit.kind === "video";
  return (
    <div className="overflow-hidden rounded-lg border border-border/60 bg-background">
      <div className="relative aspect-video bg-muted/40">
        {hit.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hit.thumbnailUrl}
            alt={hit.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            {isVideo ? <Video className="size-6" /> : <ImageIcon className="size-6" />}
          </div>
        )}
        <Badge className="absolute left-2 top-2 text-[10px]" variant="secondary">
          {isVideo ? "Video" : "Image"}
        </Badge>
        {importing ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/55">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : null}
      </div>
      <div className="space-y-2 p-2.5">
        <p className="line-clamp-2 text-[12px] font-medium leading-snug">
          {hit.title || "Untitled"}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {hit.provider}
          {hit.photographer ? ` · ${hit.photographer}` : ""}
        </p>
        <Button
          type="button"
          size="sm"
          className="h-7 w-full gap-1 text-[11px]"
          disabled={disabled || importing}
          onClick={onAdd}
        >
          <Check className="size-3.5" />
          {hit.linkOnly ||
          hit.provider === "youtube" ||
          hit.provider === "facebook"
            ? "Link video"
            : "Add as asset"}
        </Button>
      </div>
    </div>
  );
}

function PanelSection({
  panelIndex,
  subHeadlineText,
  linkedKind,
  linkedRef,
  results,
  disabled,
  busy,
  importingId,
  onSearch,
  onAdd,
}: {
  panelIndex: number;
  subHeadlineText: string;
  linkedKind?: string;
  linkedRef?: string;
  results?: PanelWebResults;
  disabled?: boolean;
  busy: boolean;
  importingId: string | null;
  onSearch: (filter: MediaFilter) => void;
  onAdd: (hit: WebMediaHit) => void;
}) {
  const videos = (results?.hits ?? []).filter((h) => h.kind === "video");
  const images = (results?.hits ?? []).filter((h) => h.kind === "image");
  const hasLink = Boolean(linkedRef);

  return (
    <section className="space-y-3 rounded-xl border border-border/70 bg-muted/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Sub Headline {String(panelIndex + 1).padStart(2, "0")}
          </p>
          <h3 className="text-[15px] font-semibold leading-snug">
            {subHeadlineText || "Empty Sub Headline"}
          </h3>
          {results?.query ? (
            <p className="text-[11px] text-muted-foreground">
              Search: “{results.query}”
              {results.providers.length
                ? ` · ${results.providers.join(", ")}`
                : ""}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1.5"
            disabled={disabled || busy}
            onClick={() => onSearch("image")}
          >
            <ImageIcon className="size-3.5" />
            Find images
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1.5"
            disabled={disabled || busy}
            onClick={() => onSearch("video")}
          >
            <Video className="size-3.5" />
            Find videos
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1.5"
            disabled={disabled || busy}
            onClick={() => onSearch("both")}
          >
            {busy ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Search className="size-3.5" />
            )}
            AI web search
          </Button>
        </div>
      </div>

      {hasLink ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
          <p className="mb-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
            Linked to this Sub Headline
          </p>
          <p className="truncate text-[12px] text-muted-foreground">
            {linkedKind || "media"} · {linkedRef}
          </p>
        </div>
      ) : (
        <p className="text-[12px] text-muted-foreground">
          AI turns this Sub Headline into a web search, then{" "}
          <strong>Add as asset</strong> imports it into your Media Library and
          links the slot.
        </p>
      )}

      {videos.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[12px] font-medium">Videos</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {videos.slice(0, 6).map((hit) => (
              <WebHitCard
                key={hit.id}
                hit={hit}
                disabled={disabled || busy}
                importing={importingId === hit.id}
                onAdd={() => onAdd(hit)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {images.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[12px] font-medium">Images</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {images.slice(0, 8).map((hit) => (
              <WebHitCard
                key={hit.id}
                hit={hit}
                disabled={disabled || busy}
                importing={importingId === hit.id}
                onAdd={() => onAdd(hit)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {!busy && results && results.hits.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          {results.warning ||
            "No web results. Try different Sub Headline wording."}
        </p>
      ) : null}
    </section>
  );
}

/**
 * Per Sub Headline: AI web search for image/video, then import as library asset.
 */
export function StoryAssetDiscoveryTab({
  story,
  disabled,
}: StoryAssetDiscoveryTabProps) {
  const [bundle, setBundle] = useState<StoryDiscoveryBundle | null>(null);
  const [webByPanel, setWebByPanel] = useState<Record<number, PanelWebResults>>(
    {},
  );
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("both");
  const [pendingPanel, setPendingPanel] = useState<number | "all" | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const subHeadlines = useMemo(
    () => parseSubHeadlineSlots(story.summary),
    [story.summary],
  );
  const currentMedia = useMemo(
    () => parseSubHeadlineMedia(story.sub_headline_media),
    [story.sub_headline_media],
  );

  const panelIndexes = useMemo(
    () =>
      subHeadlines
        .map((text, index) => ({ text, index }))
        .filter((row) => row.text.trim())
        .map((row) => row.index),
    [subHeadlines],
  );

  const load = useCallback(() => {
    startTransition(async () => {
      const result = await getStoryAssetDiscoveryAction(story.id);
      if (!result.success) {
        if (!/relation|does not exist|schema cache/i.test(result.error)) {
          // Soft: discovery tables optional for web-first flow
        }
        setBundle({ run: null, panels: [] });
        return;
      }
      setBundle(result.data);
    });
  }, [story.id]);

  useEffect(() => {
    load();
  }, [load]);

  function runWebSearch(panelIndex: number, filter: MediaFilter = mediaFilter) {
    setPendingPanel(panelIndex);
    startTransition(async () => {
      const result = await searchWebMediaForSubHeadlineAction({
        storyId: story.id,
        panelIndex,
        sceneHeadline: subHeadlines[panelIndex]?.trim() || undefined,
        mediaFilter: filter,
      });
      setPendingPanel(null);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setWebByPanel((prev) => ({
        ...prev,
        [panelIndex]: {
          panelIndex,
          query: result.data.query,
          providers: result.data.providersUsed,
          hits: result.data.hits,
          warning: result.data.warning,
        },
      }));
      toast.success(
        result.data.hits.length
          ? `Found ${result.data.hits.length} · ${result.data.providersUsed.join(", ") || "web"} · “${result.data.query}”`
          : result.data.warning || "No web results",
      );
      if (result.data.warning && result.data.hits.length > 0) {
        toast.message(result.data.warning);
      }
    });
  }

  function runAll(filter: MediaFilter = mediaFilter) {
    if (panelIndexes.length === 0) return;
    setPendingPanel("all");
    startTransition(async () => {
      let total = 0;
      const next: Record<number, PanelWebResults> = {};
      for (const panelIndex of panelIndexes) {
        const result = await searchWebMediaForSubHeadlineAction({
          storyId: story.id,
          panelIndex,
          sceneHeadline: subHeadlines[panelIndex]?.trim() || undefined,
          mediaFilter: filter,
        });
        if (!result.success) {
          toast.error(`Sub Headline ${panelIndex + 1}: ${result.error}`);
          continue;
        }
        next[panelIndex] = {
          panelIndex,
          query: result.data.query,
          providers: result.data.providersUsed,
          hits: result.data.hits,
          warning: result.data.warning,
        };
        total += result.data.hits.length;
      }
      setWebByPanel((prev) => ({ ...prev, ...next }));
      setPendingPanel(null);
      toast.success(
        total > 0
          ? `Found ${total} web result${total === 1 ? "" : "s"} across Sub Headlines`
          : "No web results — check API keys or Sub Headline wording",
      );
    });
  }

  function addAsAsset(panelIndex: number, hit: WebMediaHit) {
    setImportingId(hit.id);
    startTransition(async () => {
      const result = await importWebMediaAsAssetAction({
        storyId: story.id,
        panelIndex,
        hit,
      });
      setImportingId(null);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(
        result.data.linkedExternally
          ? `Linked ${result.data.kind} · Sub Headline ${panelIndex + 1}`
          : `Added to library · linked to Sub Headline ${panelIndex + 1}`,
      );
      setWebByPanel((prev) => {
        const panel = prev[panelIndex];
        if (!panel) return prev;
        return {
          ...prev,
          [panelIndex]: {
            ...panel,
            hits: panel.hits.filter((h) => h.id !== hit.id),
          },
        };
      });
      // Soft reload linked state from story would need parent refresh;
      // optimistic: rely on toast + media field update on next story load.
      load();
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="space-y-2">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Production Pipeline · Step 2A
        </p>
        <h2 className="text-xl font-semibold tracking-tight">
          Sub Headline media
        </h2>
        <p className="max-w-2xl text-[13px] text-muted-foreground">
          AI searches stock libraries plus <strong>YouTube</strong>,{" "}
          <strong>Google</strong>, and <strong>Facebook</strong> from each Sub
          Headline. Stock hits import into your library; social videos are linked
          by URL for Scene Builder.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-muted/10 p-3">
        <Select
          value={mediaFilter}
          onValueChange={(v: string | null) => {
            if (v === "image" || v === "video" || v === "both") setMediaFilter(v);
          }}
          disabled={disabled || pending}
        >
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue placeholder="Media type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="both">Images + videos</SelectItem>
            <SelectItem value="image">Images only</SelectItem>
            <SelectItem value="video">Videos only</SelectItem>
          </SelectContent>
        </Select>
        <Button
          type="button"
          className="h-9 gap-1.5"
          disabled={disabled || pending || panelIndexes.length === 0}
          onClick={() => runAll(mediaFilter)}
        >
          {pending && pendingPanel === "all" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Search className="size-4" />
          )}
          Search all Sub Headlines
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-9 gap-1.5"
          disabled={disabled || pending}
          onClick={load}
        >
          <RefreshCw className="size-4" />
          Reload
        </Button>
        {bundle?.run ? (
          <Badge
            variant="secondary"
            className={cn(
              "ml-auto",
              bundle.run.status === "failed" && "text-destructive",
            )}
          >
            {bundle.run.status}
          </Badge>
        ) : null}
      </div>

      {panelIndexes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 p-8 text-center">
          <p className="text-[14px] font-medium">No Sub Headlines yet</p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Add Sub Headlines in Overview, then run AI web search here.
          </p>
        </div>
      ) : (
        panelIndexes.map((panelIndex) => {
          const slot = currentMedia[panelIndex];
          return (
            <PanelSection
              key={panelIndex}
              panelIndex={panelIndex}
              subHeadlineText={subHeadlines[panelIndex] || ""}
              linkedKind={slot?.kind}
              linkedRef={slot?.ref}
              results={webByPanel[panelIndex]}
              disabled={disabled}
              busy={
                pending &&
                (pendingPanel === panelIndex || pendingPanel === "all")
              }
              importingId={importingId}
              onSearch={(filter) => runWebSearch(panelIndex, filter)}
              onAdd={(hit) => addAsAsset(panelIndex, hit)}
            />
          );
        })
      )}
    </div>
  );
}
