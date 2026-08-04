"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Loader2, Scissors, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  deleteAssetClipAction,
  listAssetClipsAction,
} from "@/features/asset-clip-editor/actions/clip.actions";
import { formatTimecode } from "@/features/asset-clip-editor/lib/timecode";
import type { MediaAssetClipWithParent } from "@/features/asset-clip-editor/types/clip.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function AssetClipsLibrary({
  organizationId: _organizationId,
}: {
  organizationId: string;
}) {
  const [clips, setClips] = useState<MediaAssetClipWithParent[]>([]);
  const [pending, startTransition] = useTransition();

  function reload() {
    startTransition(async () => {
      const result = await listAssetClipsAction();
      if (!result.success) {
        if (!/relation|does not exist|schema cache/i.test(result.error)) {
          toast.error(result.error);
        }
        setClips([]);
        return;
      }
      setClips(result.data);
    });
  }

  useEffect(() => {
    reload();
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Asset Engine · Module 2.5
          </p>
          <h1 className="text-xl font-semibold tracking-tight">Asset Clips</h1>
          <p className="mt-1 max-w-xl text-[13px] text-muted-foreground">
            Reusable production clips (IN/OUT on parent assets). Originals are
            never modified. Attach via <code className="text-[11px]">clip://</code>{" "}
            on Story Panels.
          </p>
        </div>
        <Link
          href="/media-library/clip-editor"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80"
        >
          <Scissors className="size-4" />
          Open Clip Editor
        </Link>
      </header>

      {pending && clips.length === 0 ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : clips.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 p-10 text-center">
          <p className="font-medium">No clips yet</p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Import a video and save an IN/OUT range in the Clip Editor.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clips.map((clip) => (
            <div
              key={clip.id}
              className="overflow-hidden rounded-xl border border-border/60 bg-muted/10"
            >
              <div className="aspect-video bg-muted/40">
                {clip.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={clip.thumbnail_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="space-y-2 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[13px] font-medium leading-snug">
                    {clip.name}
                  </p>
                  <Badge variant="secondary" className="shrink-0 text-[10px]">
                    {formatTimecode(clip.duration_ms)}
                  </Badge>
                </div>
                <p className="truncate text-[11px] text-muted-foreground">
                  {clip.parent_asset?.name ?? "Parent asset"}
                </p>
                <p className="font-mono text-[10px] text-muted-foreground">
                  {formatTimecode(clip.in_point_ms)} →{" "}
                  {formatTimecode(clip.out_point_ms)}
                </p>
                <div className="flex gap-1.5">
                  <Link
                    href={`/media-library/clip-editor?asset=${clip.parent_asset_id}&clipId=${clip.id}`}
                    className="inline-flex h-7 flex-1 items-center justify-center rounded-lg bg-primary text-[11px] font-medium text-primary-foreground hover:bg-primary/80"
                  >
                    Edit
                  </Link>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 px-2"
                    disabled={pending}
                    onClick={() => {
                      startTransition(async () => {
                        const result = await deleteAssetClipAction(clip.id);
                        if (!result.success) {
                          toast.error(result.error);
                          return;
                        }
                        toast.success("Clip deleted");
                        reload();
                      });
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
