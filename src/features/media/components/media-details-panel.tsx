"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArchiveRestore, FolderInput, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MediaThumbnail } from "@/features/media/components/media-thumbnail";
import {
  deleteMediaAssetAction,
  detachStoryMediaAction,
  moveMediaAssetAction,
  renameMediaAssetAction,
  restoreMediaAssetAction,
} from "@/features/media/actions/media.actions";
import { mediaQueryKeys } from "@/features/media/queries/media-keys";
import { MEDIA_FILE_TYPE_LABELS } from "@/features/media/constants/media.constants";
import { formatFileSize } from "@/features/media/lib/media-utils";
import { RelativeTime } from "@/features/newsroom/components/relative-time";
import type {
  MediaAssetWithMeta,
  MediaFolder,
} from "@/features/media/types/media.types";
import { cn } from "@/lib/utils";
import { ModulePlaceholder } from "@/shared/components/layout/module-placeholder";

type MediaDetailsPanelProps = {
  asset: MediaAssetWithMeta | null;
  folders: MediaFolder[];
};

export function MediaDetailsPanel({ asset, folders }: MediaDetailsPanelProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(asset?.name ?? "");
  const [folderId, setFolderId] = useState<string | null>(asset?.folder_id ?? null);

  useEffect(() => {
    setName(asset?.name ?? "");
    setFolderId(asset?.folder_id ?? null);
  }, [asset?.id, asset?.name, asset?.folder_id]);

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: mediaQueryKeys.all });
  }

  async function handleRename() {
    if (!asset) return;
    const result = await renameMediaAssetAction(asset.id, { name });
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Asset renamed");
    await invalidate();
  }

  async function handleMove() {
    if (!asset) return;
    const result = await moveMediaAssetAction(asset.id, { folderId });
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Asset moved");
    await invalidate();
  }

  async function handleDelete() {
    if (!asset) return;
    const result = await deleteMediaAssetAction(asset.id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Asset moved to trash");
    await invalidate();
  }

  async function handleRestore() {
    if (!asset) return;
    const result = await restoreMediaAssetAction(asset.id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Asset restored");
    await invalidate();
  }

  async function handleDetach(storyMediaId: string, storyId: string) {
    const result = await detachStoryMediaAction(storyMediaId, storyId);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Detached from story");
    await invalidate();
  }

  if (!asset) {
    return (
      <aside className="hidden h-full w-80 flex-col border-l border-border/60 bg-muted/10 xl:flex">
        <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
          Select an asset to inspect metadata, story links, and file details.
        </div>
      </aside>
    );
  }

  return (
    <aside className="hidden h-full w-80 flex-col border-l border-border/60 bg-muted/10 xl:flex">
      <div className="border-b border-border/60 px-4 py-3">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Asset details
        </p>
        <h2 className="mt-1 line-clamp-2 text-sm font-semibold">{asset.name}</h2>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-5 p-4">
          <div className="aspect-video overflow-hidden rounded-lg border border-border/60">
            <MediaThumbnail asset={asset} />
          </div>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Metadata
            </h3>
            <div className="space-y-2">
              <Label htmlFor="asset-name">Name</Label>
              <div className="flex gap-2">
                <Input
                  id="asset-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={Boolean(asset.deleted_at)}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  disabled={Boolean(asset.deleted_at) || name.trim() === asset.name}
                  onClick={() => void handleRename()}
                  aria-label="Rename asset"
                >
                  <Pencil />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Folder</Label>
              <div className="flex gap-2">
                <Select
                  value={folderId ?? "root"}
                  onValueChange={(value) =>
                    setFolderId(!value || value === "root" ? null : value)
                  }
                  disabled={Boolean(asset.deleted_at)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="root">Library root</SelectItem>
                    {folders.map((folder) => (
                      <SelectItem key={folder.id} value={folder.id}>
                        {folder.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  disabled={
                    Boolean(asset.deleted_at) ||
                    folderId === (asset.folder_id ?? null)
                  }
                  onClick={() => void handleMove()}
                  aria-label="Move asset"
                >
                  <FolderInput />
                </Button>
              </div>
            </div>
          </section>

          <Separator />

          <section className="space-y-2">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              File details
            </h3>
            <dl className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <dt className="text-muted-foreground">Type</dt>
                <dd className="font-medium">
                  {MEDIA_FILE_TYPE_LABELS[asset.file_type]}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Size</dt>
                <dd className="font-medium">{formatFileSize(asset.file_size)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">MIME</dt>
                <dd className="truncate font-medium">{asset.mime_type}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Updated</dt>
                <dd className="font-medium">
                  <RelativeTime value={asset.updated_at} />
                </dd>
              </div>
              {asset.width && asset.height ? (
                <div>
                  <dt className="text-muted-foreground">Dimensions</dt>
                  <dd className="font-medium">
                    {asset.width} × {asset.height}
                  </dd>
                </div>
              ) : null}
              {asset.duration_seconds != null ? (
                <div>
                  <dt className="text-muted-foreground">Duration</dt>
                  <dd className="font-medium">{asset.duration_seconds}s</dd>
                </div>
              ) : null}
            </dl>
            <p className="break-all font-mono text-[10px] text-muted-foreground">
              {asset.storage_bucket}/{asset.storage_path}
            </p>
          </section>

          <Separator />

          <section className="space-y-2">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Story links
            </h3>
            {!asset.story_links?.length ? (
              <p className="text-sm text-muted-foreground">
                Not linked to any stories yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {asset.story_links.map((link) => (
                  <li
                    key={link.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-2 py-1.5 text-sm"
                  >
                    <Link
                      href={`/newsroom/stories/${link.story_id}`}
                      className="truncate underline-offset-2 hover:underline"
                    >
                      {link.story?.title ?? "Story"}
                    </Link>
                    <Button
                      type="button"
                      size="xs"
                      variant="ghost"
                      onClick={() => void handleDetach(link.id, link.story_id)}
                    >
                      Detach
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/newsroom"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full")}
            >
              Open newsroom
            </Link>
          </section>

          <Separator />

          <section className="space-y-2">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              AI
            </h3>
            <ModulePlaceholder
              title="Future AI section"
              description="Auto-tagging, face recognition, and smart search will connect here later."
            />
          </section>

          <Separator />

          <section className="space-y-2">
            {asset.deleted_at ? (
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start"
                onClick={() => void handleRestore()}
              >
                <ArchiveRestore />
                Restore asset
              </Button>
            ) : (
              <Button
                type="button"
                variant="destructive"
                className="w-full justify-start"
                onClick={() => void handleDelete()}
              >
                <Trash2 />
                Move to trash
              </Button>
            )}
          </section>
        </div>
      </ScrollArea>
    </aside>
  );
}
