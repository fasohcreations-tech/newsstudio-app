"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Link2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MediaThumbnail } from "@/features/media/components/media-thumbnail";
import { useMediaLibrary, useStoryAssets } from "@/features/media/hooks/use-media";
import { attachStoryMediaAction } from "@/features/media/actions/media.actions";
import { uploadMediaFiles } from "@/features/media/lib/upload-media";
import { mediaQueryKeys } from "@/features/media/queries/media-keys";
import { MEDIA_ACCEPT } from "@/features/media/constants/media.constants";
import { formatFileSize } from "@/features/media/lib/media-utils";
import type { StoryWithRelations } from "@/features/newsroom/types/story.types";

type StoryMediaPanelProps = {
  story: StoryWithRelations;
};

export function StoryMediaPanel({ story }: StoryMediaPanelProps) {
  const queryClient = useQueryClient();
  const storyAssetsQuery = useStoryAssets(story.id);
  const libraryQuery = useMediaLibrary({
    organizationId: story.organization_id,
    page: 1,
    pageSize: 40,
  });
  const [pickerOpen, setPickerOpen] = useState(false);

  const attachedIds = useMemo(
    () => new Set((storyAssetsQuery.data ?? []).map((asset) => asset.id)),
    [storyAssetsQuery.data],
  );

  async function refresh() {
    await queryClient.invalidateQueries({
      queryKey: mediaQueryKeys.storyAssets(story.id),
    });
    await queryClient.invalidateQueries({ queryKey: mediaQueryKeys.lists() });
  }

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return;
    const { assets, errors } = await uploadMediaFiles({
      organizationId: story.organization_id,
      files: Array.from(files),
      storyId: story.id,
    });
    if (errors.length) toast.error(errors[0]);
    else toast.success(`${assets.length} asset(s) attached`);
    await refresh();
  }

  async function handleAttach(mediaAssetId: string) {
    const result = await attachStoryMediaAction({
      organizationId: story.organization_id,
      storyId: story.id,
      mediaAssetId,
    });
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Asset linked to story");
    setPickerOpen(false);
    await refresh();
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">Story media</CardTitle>
          <CardDescription>
            Attach library assets to this story. Assets can belong to many stories.
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <label>
            <input
              type="file"
              className="sr-only"
              accept={MEDIA_ACCEPT}
              multiple
              onChange={(event) => {
                void handleUpload(event.target.files);
                event.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={(event) => {
                const input = event.currentTarget.parentElement?.querySelector(
                  'input[type="file"]',
                ) as HTMLInputElement | null;
                input?.click();
              }}
            >
              <Upload />
              Upload
            </Button>
          </label>
          <Button type="button" onClick={() => setPickerOpen(true)}>
            <Link2 />
            Link from library
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {storyAssetsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading story media…</p>
        ) : null}
        {!storyAssetsQuery.isLoading && !(storyAssetsQuery.data ?? []).length ? (
          <p className="text-sm text-muted-foreground">
            No media attached yet. Upload new files or link existing library assets.
          </p>
        ) : null}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {(storyAssetsQuery.data ?? []).map((asset) => (
            <div
              key={asset.id}
              className="overflow-hidden rounded-lg border border-border/60"
            >
              <div className="aspect-square">
                <MediaThumbnail asset={asset} />
              </div>
              <div className="space-y-0.5 px-2.5 py-2">
                <p className="truncate text-sm font-medium">{asset.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(asset.file_size)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Link media from library</DialogTitle>
            <DialogDescription>
              Select an existing asset to attach to this story.
            </DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[50vh] grid-cols-2 gap-3 overflow-auto sm:grid-cols-3">
            {(libraryQuery.data?.assets ?? [])
              .filter((asset) => !attachedIds.has(asset.id))
              .map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  className="overflow-hidden rounded-lg border border-border/60 text-left hover:border-foreground/30"
                  onClick={() => void handleAttach(asset.id)}
                >
                  <div className="aspect-square">
                    <MediaThumbnail asset={asset} />
                  </div>
                  <div className="truncate px-2 py-1.5 text-sm">{asset.name}</div>
                </button>
              ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPickerOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
