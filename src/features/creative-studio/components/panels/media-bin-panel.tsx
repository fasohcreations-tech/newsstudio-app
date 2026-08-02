"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { FileText, Image, Music, Search, Star, Video } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  listMediaBinAssetsAction,
  type MediaBinItem,
} from "@/features/creative-studio/actions/media-bin.actions";
import { MEDIA_BIN_CATEGORIES } from "@/features/creative-studio/constants/creative-studio.constants";
import {
  MEDIA_BIN_DRAG_TYPE,
  type MediaBinDragPayload,
} from "@/features/creative-studio/lib/studio-utils";
import { useMediaCollections } from "@/features/media/hooks/use-media-collections";
import { cn } from "@/lib/utils";

type MediaBinPanelProps = {
  organizationId: string;
  storyId?: string | null;
  initialAssets?: MediaBinItem[];
};

export function MediaBinPanel({
  organizationId,
  storyId,
  initialAssets = [],
}: MediaBinPanelProps) {
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [assets, setAssets] = useState<MediaBinItem[]>(initialAssets);
  const [loading, setLoading] = useState(initialAssets.length === 0);
  const [pending, startTransition] = useTransition();
  const { favoriteIds, isFavorite } = useMediaCollections(organizationId);

  const loadAssets = useCallback(() => {
    startTransition(async () => {
      setLoading(true);
      const result = await listMediaBinAssetsAction({
        organizationId,
        storyId,
        category: category === "favorites" ? "all" : category,
        search: query.trim() || undefined,
      });
      setLoading(false);
      if (result.success) {
        setAssets(result.data);
      }
    });
  }, [category, organizationId, query, storyId]);

  useEffect(() => {
    const timer = window.setTimeout(loadAssets, query ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [loadAssets, query]);

  const items = useMemo(() => {
    let list = assets;
    if (category === "favorites") {
      list = list.filter((item) => isFavorite(item.id));
    }
    return list;
  }, [assets, category, isFavorite]);

  const handleDragStart = (
    event: React.DragEvent<HTMLLIElement>,
    item: MediaBinItem,
  ) => {
    const payload: MediaBinDragPayload = {
      assetId: item.id,
      name: item.name,
      clipKind: item.clipKind,
      category: item.category,
      durationMs: item.durationMs ?? undefined,
    };
    event.dataTransfer.setData(MEDIA_BIN_DRAG_TYPE, JSON.stringify(payload));
    event.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search media bin…"
          className="h-8 pl-8 text-xs"
        />
      </div>

      <div className="flex flex-wrap gap-1">
        {MEDIA_BIN_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={cn(
              "rounded-md border px-2 py-0.5 text-[10px]",
              category === cat.id
                ? "border-primary bg-primary/10"
                : "border-border/60 text-muted-foreground",
            )}
            onClick={() => setCategory(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {loading || pending ? (
        <div className="space-y-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
          No media found. Upload assets in Media Library or link story media.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li
              key={item.id}
              draggable
              onDragStart={(e) => handleDragStart(e, item)}
              className="flex cursor-grab items-center gap-2 rounded-md border border-border/60 bg-background px-2 py-2 text-xs active:cursor-grabbing"
            >
              {item.fileType === "video" ? (
                <Video className="size-3.5 text-blue-500" />
              ) : item.fileType === "audio" ? (
                <Music className="size-3.5 text-green-500" />
              ) : item.fileType === "pdf" ||
                item.fileType === "document" ||
                item.fileType === "text" ? (
                <FileText className="size-3.5 text-amber-600" />
              ) : (
                <Image className="size-3.5 text-purple-500" />
              )}
              <span className="min-w-0 flex-1 truncate">{item.name}</span>
              {isFavorite(item.id) || favoriteIds.includes(item.id) ? (
                <Star className="size-3 fill-amber-400 text-amber-400" />
              ) : null}
              <Badge variant="outline" className="text-[9px] capitalize">
                {item.isStoryAsset ? "story" : item.category}
              </Badge>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[10px] text-muted-foreground">
        Drag assets onto compatible timeline tracks.
      </p>
    </div>
  );
}
