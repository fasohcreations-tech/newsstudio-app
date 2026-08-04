"use client";

import { useEffect, useState } from "react";
import { ImageIcon, Loader2, Type, Video } from "lucide-react";

import { createSignedAssetUrl } from "@/features/media/services/media.service";
import { parseClipMediaRef } from "@/features/asset-clip-editor/lib/clip-media-reference";
import { parseLibraryMediaRef } from "@/features/story-production/lib/library-media-reference";
import type { SubHeadlineMediaKind } from "@/features/story-production/lib/sub-headlines";
import { createClient } from "@/shared/lib/supabase/client";
import { cn } from "@/lib/utils";

type SubHeadlineMediaThumbProps = {
  kind: SubHeadlineMediaKind | "";
  mediaRef: string;
  caption?: string;
  className?: string;
};

function isDirectPreviewUrl(value: string): boolean {
  return (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("/") ||
    value.startsWith("blob:") ||
    value.startsWith("data:")
  );
}

/**
 * Thumbnail for a Sub Headline media ref (`library://…`, `clip://…`, or URL).
 */
export function SubHeadlineMediaThumb({
  kind,
  mediaRef,
  caption,
  className,
}: SubHeadlineMediaThumbProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const ref = mediaRef.trim();

    if (!ref || kind === "caption" || !kind) {
      setUrl(null);
      setLoading(false);
      setFailed(false);
      return;
    }

    if (isDirectPreviewUrl(ref)) {
      setUrl(ref);
      setLoading(false);
      setFailed(false);
      return;
    }

    const clipId = parseClipMediaRef(ref);
    const assetId = parseLibraryMediaRef(ref);
    if (!clipId && !assetId) {
      setUrl(null);
      setLoading(false);
      setFailed(true);
      return;
    }

    setLoading(true);
    setFailed(false);

    void (async () => {
      const supabase = createClient();

      if (clipId) {
        const { data: clip } = await supabase
          .from("media_asset_clips")
          .select(
            "id, thumbnail_url, parent:media_assets!media_asset_clips_parent_asset_id_fkey(id, storage_bucket, storage_path, external_url, file_type)",
          )
          .eq("id", clipId)
          .is("deleted_at", null)
          .maybeSingle();

        if (cancelled) return;
        if (clip?.thumbnail_url) {
          setUrl(clip.thumbnail_url);
          setLoading(false);
          return;
        }
        const parentRaw = clip?.parent as
          | {
              storage_bucket: string;
              storage_path: string;
              external_url: string | null;
            }
          | {
              storage_bucket: string;
              storage_path: string;
              external_url: string | null;
            }[]
          | null
          | undefined;
        const parent = Array.isArray(parentRaw) ? parentRaw[0] : parentRaw;
        if (!parent) {
          setFailed(true);
          setLoading(false);
          return;
        }
        if (parent.external_url) {
          setUrl(parent.external_url);
          setLoading(false);
          return;
        }
        const { url: signed } = await createSignedAssetUrl(
          supabase,
          parent.storage_bucket,
          parent.storage_path,
        );
        if (cancelled) return;
        setUrl(signed);
        setFailed(!signed);
        setLoading(false);
        return;
      }

      const { data: asset, error } = await supabase
        .from("media_assets")
        .select("id, storage_bucket, storage_path, file_type, external_url")
        .eq("id", assetId!)
        .is("deleted_at", null)
        .maybeSingle();

      if (cancelled) return;
      if (error || !asset) {
        setFailed(true);
        setLoading(false);
        return;
      }
      if (asset.external_url) {
        setUrl(asset.external_url);
        setLoading(false);
        return;
      }
      const { url: signed } = await createSignedAssetUrl(
        supabase,
        asset.storage_bucket,
        asset.storage_path,
      );
      if (cancelled) return;
      setUrl(signed);
      setFailed(!signed);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [kind, mediaRef]);

  if (kind === "caption") {
    return (
      <div
        className={cn(
          "flex aspect-video w-full items-center justify-center gap-2 rounded-md border border-border/60 bg-muted/40 px-3 text-center",
          className,
        )}
      >
        <Type className="size-4 shrink-0 text-muted-foreground" />
        <p className="line-clamp-3 text-[11px] leading-snug text-foreground/80">
          {caption?.trim() || "Caption only"}
        </p>
      </div>
    );
  }

  if (!kind) return null;

  if (loading) {
    return (
      <div
        className={cn(
          "flex aspect-video w-full items-center justify-center rounded-md border border-dashed border-border/60 bg-muted/20",
          className,
        )}
      >
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (url && !failed && kind === "image") {
    return (
      <div
        className={cn(
          "relative aspect-video w-full overflow-hidden rounded-md border border-border/60 bg-muted/30",
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt="Sub headline media"
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  if (url && !failed && kind === "video") {
    return (
      <div
        className={cn(
          "relative aspect-video w-full overflow-hidden rounded-md border border-border/60 bg-black/80",
          className,
        )}
      >
        <video
          src={url}
          className="size-full object-cover"
          muted
          playsInline
          preload="metadata"
          onError={() => setFailed(true)}
        />
        <span className="absolute bottom-1.5 left-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-white">
          Video
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex aspect-video w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border/60 bg-muted/20 text-muted-foreground",
        className,
      )}
    >
      {kind === "video" ? (
        <Video className="size-5 opacity-70" />
      ) : (
        <ImageIcon className="size-5 opacity-70" />
      )}
      <span className="text-[10px]">
        {mediaRef.trim() ? "Preview unavailable" : "No media linked"}
      </span>
    </div>
  );
}
