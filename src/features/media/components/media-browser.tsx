"use client";

import { Folder, Star } from "lucide-react";

import { MediaThumbnail } from "@/features/media/components/media-thumbnail";
import { MEDIA_FILE_TYPE_LABELS } from "@/features/media/constants/media.constants";
import { formatFileSize } from "@/features/media/lib/media-utils";
import type {
  MediaAssetWithMeta,
  MediaBrowserView,
  MediaFolder,
} from "@/features/media/types/media.types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RelativeTime } from "@/features/newsroom/components/relative-time";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

type MediaBrowserProps = {
  view: MediaBrowserView;
  folders: MediaFolder[];
  assets: MediaAssetWithMeta[];
  selectedId: string | null;
  selectedIds: string[];
  favoriteIds?: string[];
  page: number;
  pageSize: number;
  total: number;
  onSelectAsset: (assetId: string, options?: { additive?: boolean }) => void;
  onToggleSelect: (assetId: string) => void;
  onToggleSelectAll: () => void;
  onOpenFolder: (folderId: string) => void;
  onPageChange: (page: number) => void;
  onToggleFavorite?: (assetId: string) => void;
};

export function MediaBrowser({
  view,
  folders,
  assets,
  selectedId,
  selectedIds,
  favoriteIds = [],
  page,
  pageSize,
  total,
  onSelectAsset,
  onToggleSelect,
  onToggleSelectAll,
  onOpenFolder,
  onPageChange,
  onToggleFavorite,
}: MediaBrowserProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const allSelected =
    assets.length > 0 && assets.every((a) => selectedIds.includes(a.id));
  const favoriteSet = new Set(favoriteIds);

  if (view === "list") {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={() => onToggleSelectAll()}
                    aria-label="Select all assets on this page"
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Type</TableHead>
                <TableHead className="hidden lg:table-cell">Size</TableHead>
                <TableHead className="hidden sm:table-cell">Updated</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {folders.map((folder) => (
                <TableRow
                  key={folder.id}
                  className="cursor-pointer"
                  onClick={() => onOpenFolder(folder.id)}
                >
                  <TableCell />
                  <TableCell>
                    <div className="flex items-center gap-2 font-medium">
                      <Folder className="size-4 text-muted-foreground" />
                      {folder.name}
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    Folder
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">—</TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    <RelativeTime value={folder.updated_at} />
                  </TableCell>
                  <TableCell />
                </TableRow>
              ))}
              {assets.map((asset) => (
                <TableRow
                  key={asset.id}
                  data-state={
                    selectedId === asset.id || selectedIds.includes(asset.id)
                      ? "selected"
                      : undefined
                  }
                  className={cn(
                    "cursor-pointer",
                    (selectedId === asset.id || selectedIds.includes(asset.id)) &&
                      "bg-muted/60",
                  )}
                  onClick={(e) =>
                    onSelectAsset(asset.id, {
                      additive: e.metaKey || e.ctrlKey || e.shiftKey,
                    })
                  }
                >
                  <TableCell
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSelect(asset.id);
                    }}
                  >
                    <Checkbox
                      checked={selectedIds.includes(asset.id)}
                      aria-label={`Select ${asset.name}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="size-10 overflow-hidden rounded-md border border-border/60">
                        <MediaThumbnail asset={asset} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{asset.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {asset.original_filename}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {MEDIA_FILE_TYPE_LABELS[asset.file_type]}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">
                    {formatFileSize(asset.file_size)}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    <RelativeTime value={asset.updated_at} />
                  </TableCell>
                  <TableCell>
                    {onToggleFavorite ? (
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={
                          favoriteSet.has(asset.id)
                            ? "Remove favorite"
                            : "Add favorite"
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(asset.id);
                        }}
                      >
                        <Star
                          className={cn(
                            "size-3.5",
                            favoriteSet.has(asset.id) &&
                              "fill-amber-400 text-amber-500",
                          )}
                        />
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <PaginationBar
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
          onPageChange={onPageChange}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
        <Checkbox
          checked={allSelected}
          onCheckedChange={() => onToggleSelectAll()}
          aria-label="Select all assets on this page"
        />
        <span className="text-xs text-muted-foreground">Select page</span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {folders.map((folder) => (
            <button
              key={folder.id}
              type="button"
              onClick={() => onOpenFolder(folder.id)}
              className="flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card text-left transition-colors hover:border-foreground/20"
            >
              <div className="flex aspect-square items-center justify-center bg-muted/40">
                <Folder className="size-10 text-muted-foreground" />
              </div>
              <div className="truncate px-2.5 py-2 text-sm font-medium">
                {folder.name}
              </div>
            </button>
          ))}
          {assets.map((asset) => (
            <div
              key={asset.id}
              className={cn(
                "relative flex flex-col overflow-hidden rounded-xl border bg-card text-left transition-colors",
                selectedId === asset.id || selectedIds.includes(asset.id)
                  ? "border-foreground/40 ring-1 ring-foreground/20"
                  : "border-border/60 hover:border-foreground/20",
              )}
            >
              <div className="absolute top-2 left-2 z-10">
                <Checkbox
                  checked={selectedIds.includes(asset.id)}
                  onCheckedChange={() => onToggleSelect(asset.id)}
                  aria-label={`Select ${asset.name}`}
                  className="bg-background/80"
                />
              </div>
              {onToggleFavorite ? (
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  className="absolute top-1 right-1 z-10 bg-background/70"
                  aria-label={
                    favoriteSet.has(asset.id) ? "Remove favorite" : "Favorite"
                  }
                  onClick={() => onToggleFavorite(asset.id)}
                >
                  <Star
                    className={cn(
                      "size-3.5",
                      favoriteSet.has(asset.id) &&
                        "fill-amber-400 text-amber-500",
                    )}
                  />
                </Button>
              ) : null}
              <button
                type="button"
                className="flex flex-1 flex-col text-left"
                onClick={(e) =>
                  onSelectAsset(asset.id, {
                    additive: e.metaKey || e.ctrlKey || e.shiftKey,
                  })
                }
              >
                <div className="aspect-square overflow-hidden bg-muted/40">
                  <MediaThumbnail asset={asset} />
                </div>
                <div className="space-y-0.5 px-2.5 py-2">
                  <p className="truncate text-sm font-medium">{asset.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {MEDIA_FILE_TYPE_LABELS[asset.file_type]} ·{" "}
                    {formatFileSize(asset.file_size)}
                  </p>
                </div>
              </button>
            </div>
          ))}
        </div>
      </div>
      <PaginationBar
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        onPageChange={onPageChange}
      />
    </div>
  );
}

function PaginationBar({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-t border-border/60 px-3 py-2 text-xs text-muted-foreground">
      <span>
        {total === 0
          ? "0 assets"
          : `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`}
      </span>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <span className="px-2">
          {page} / {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
