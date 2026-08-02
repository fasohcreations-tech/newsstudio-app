"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Star, Clock } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { MediaToolbar } from "@/features/media/components/media-toolbar";
import { MediaSidebar } from "@/features/media/components/media-sidebar";
import { MediaBrowser } from "@/features/media/components/media-browser";
import { MediaDetailsPanel } from "@/features/media/components/media-details-panel";
import { MediaDropzone } from "@/features/media/components/media-dropzone";
import {
  useMediaFolders,
  useMediaLibrary,
  useOrganizationStories,
} from "@/features/media/hooks/use-media";
import { useMediaCollections } from "@/features/media/hooks/use-media-collections";
import { MEDIA_PAGE_SIZE } from "@/features/media/constants/media.constants";
import type { MediaBrowserView } from "@/features/media/types/media.types";
import type { MediaFileType } from "@/shared/types/database.types";
import { uploadMediaFiles } from "@/features/media/lib/upload-media";
import { deleteMediaAssetAction } from "@/features/media/actions/media.actions";
import { AppBreadcrumbs } from "@/features/platform/components/app-breadcrumbs";
import { EmptyState } from "@/features/platform/components/empty-state";

type MediaLibraryWorkspaceProps = {
  organizationId: string;
  organizationName: string;
};

export function MediaLibraryWorkspace({
  organizationId,
  organizationName,
}: MediaLibraryWorkspaceProps) {
  const [folderId, setFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [fileType, setFileType] = useState<MediaFileType | "all">("all");
  const [storyId, setStoryId] = useState<string | null>(null);
  const [view, setView] = useState<MediaBrowserView>("grid");
  const [showTrash, setShowTrash] = useState(false);
  const [collection, setCollection] = useState<"all" | "favorites" | "recent">(
    "all",
  );
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);

  const collections = useMediaCollections(organizationId);

  const filters = useMemo(
    () => ({
      organizationId,
      folderId:
        showTrash || storyId || deferredSearch.trim() || collection !== "all"
          ? undefined
          : folderId,
      fileType,
      storyId,
      search: deferredSearch,
      includeDeleted: showTrash,
      page,
      pageSize: MEDIA_PAGE_SIZE,
    }),
    [
      organizationId,
      folderId,
      fileType,
      storyId,
      deferredSearch,
      showTrash,
      page,
      collection,
    ],
  );

  const libraryQuery = useMediaLibrary(filters);
  const foldersQuery = useMediaFolders(organizationId);
  const storiesQuery = useOrganizationStories(organizationId);

  useEffect(() => {
    setPage(1);
  }, [folderId, fileType, storyId, deferredSearch, showTrash, collection]);

  const assets = useMemo(() => {
    const list = libraryQuery.data?.assets ?? [];
    if (collection === "favorites") {
      return list.filter((a) => collections.favoriteIds.includes(a.id));
    }
    if (collection === "recent") {
      const order = new Map(collections.recentIds.map((id, i) => [id, i]));
      return list
        .filter((a) => order.has(a.id))
        .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    }
    return list;
  }, [libraryQuery.data?.assets, collection, collections.favoriteIds, collections.recentIds]);

  useEffect(() => {
    if (!assets.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !assets.some((asset) => asset.id === selectedId)) {
      setSelectedId(assets[0]?.id ?? null);
    }
  }, [assets, selectedId]);

  const selectedAsset = assets.find((asset) => asset.id === selectedId) ?? null;

  async function handleDropFiles(files: File[]) {
    if (showTrash) return;
    const { errors } = await uploadMediaFiles({
      organizationId,
      folderId,
      files,
    });
    if (errors.length) {
      toast.error(errors[0]);
    } else {
      toast.success(
        files.length === 1 ? "Asset uploaded" : `${files.length} assets uploaded`,
      );
    }
    await Promise.all([libraryQuery.refetch(), foldersQuery.refetch()]);
  }

  async function handleBulkTrash() {
    if (!selectedIds.length) return;
    const results = await Promise.all(
      selectedIds.map((id) => deleteMediaAssetAction(id)),
    );
    const failed = results.filter((r) => !r.success).length;
    if (failed) {
      toast.error(`Could not trash ${failed} asset(s)`);
    } else {
      toast.success(
        selectedIds.length === 1
          ? "Asset moved to trash"
          : `${selectedIds.length} assets moved to trash`,
      );
    }
    setSelectedIds([]);
    await libraryQuery.refetch();
  }

  return (
    <div
      className="relative -m-4 flex h-[calc(100svh-3.5rem-2.25rem)] min-h-[32rem] flex-col overflow-hidden border-y border-border/60 bg-background md:-m-6"
      onDragEnter={(event) => {
        event.preventDefault();
        if (!showTrash) setDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        const files = Array.from(event.dataTransfer.files ?? []);
        if (files.length) void handleDropFiles(files);
      }}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-2">
        <div className="min-w-0 space-y-1">
          <AppBreadcrumbs
            items={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Media Library" },
            ]}
          />
          <h1 className="text-sm font-semibold tracking-tight">Media Library</h1>
          <p className="text-xs text-muted-foreground">{organizationName}</p>
        </div>
      </div>

      <MediaToolbar
        organizationId={organizationId}
        folderId={folderId}
        search={search}
        fileType={fileType}
        storyId={storyId}
        stories={storiesQuery.data ?? []}
        view={view}
        showTrash={showTrash}
        onSearchChange={setSearch}
        onFileTypeChange={setFileType}
        onStoryChange={setStoryId}
        onViewChange={setView}
        onToggleTrash={() => {
          setShowTrash((value) => !value);
          setFolderId(null);
          setCollection("all");
        }}
        onRefresh={() => {
          void libraryQuery.refetch();
          void foldersQuery.refetch();
        }}
      />

      {selectedIds.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 bg-muted/30 px-4 py-2">
          <span className="text-xs font-medium">
            {selectedIds.length} selected
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setSelectedIds([])}
          >
            Clear
          </Button>
          {!showTrash ? (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => void handleBulkTrash()}
            >
              Move to trash
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              selectedIds.forEach((id) => collections.toggleFavorite(id));
              toast.success("Favorites updated");
            }}
          >
            Toggle favorites
          </Button>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <MediaSidebar
          folders={foldersQuery.data ?? []}
          activeFolderId={folderId}
          showTrash={showTrash}
          collection={collection}
          onSelectRoot={() => {
            setShowTrash(false);
            setFolderId(null);
            setCollection("all");
          }}
          onSelectFolder={(id) => {
            setShowTrash(false);
            setCollection("all");
            setFolderId(id);
          }}
          onSelectFavorites={() => {
            setShowTrash(false);
            setFolderId(null);
            setCollection("favorites");
          }}
          onSelectRecent={() => {
            setShowTrash(false);
            setFolderId(null);
            setCollection("recent");
          }}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          {libraryQuery.isLoading ? (
            <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
              <Skeleton className="aspect-square w-full" />
              <Skeleton className="aspect-square w-full" />
              <Skeleton className="aspect-square w-full" />
              <Skeleton className="aspect-square w-full" />
            </div>
          ) : null}

          {libraryQuery.isError ? (
            <div className="p-4">
              <Alert variant="destructive">
                <AlertTitle>Unable to load media library</AlertTitle>
                <AlertDescription>
                  {libraryQuery.error instanceof Error
                    ? libraryQuery.error.message
                    : "An unexpected error occurred. Apply the media migration if needed."}
                </AlertDescription>
              </Alert>
            </div>
          ) : null}

          {!libraryQuery.isLoading &&
          !libraryQuery.isError &&
          assets.length === 0 &&
          (collection !== "all" ||
            (libraryQuery.data?.folders.length ?? 0) === 0) ? (
            <div className="flex flex-1 items-center justify-center p-6">
              {collection === "favorites" ? (
                <EmptyState
                  title="No favorites yet"
                  description="Star assets in the browser to pin them here."
                  icon={<Star className="size-5" />}
                />
              ) : collection === "recent" ? (
                <EmptyState
                  title="No recent files"
                  description="Open assets to build your recent list on this device."
                  icon={<Clock className="size-5" />}
                />
              ) : (
                <MediaDropzone
                  disabled={showTrash}
                  onFiles={(files) => void handleDropFiles(files)}
                />
              )}
            </div>
          ) : null}

          {!libraryQuery.isLoading &&
          !libraryQuery.isError &&
          libraryQuery.data &&
          (assets.length > 0 ||
            (collection === "all" && libraryQuery.data.folders.length > 0)) ? (
            <MediaBrowser
              view={view}
              folders={
                showTrash || collection !== "all"
                  ? []
                  : libraryQuery.data.folders
              }
              assets={assets}
              selectedId={selectedId}
              selectedIds={selectedIds}
              favoriteIds={collections.favoriteIds}
              page={libraryQuery.data.page}
              pageSize={libraryQuery.data.pageSize}
              total={
                collection === "all" ? libraryQuery.data.total : assets.length
              }
              onSelectAsset={(id, options) => {
                collections.touchRecent(id);
                if (options?.additive) {
                  setSelectedIds((prev) =>
                    prev.includes(id)
                      ? prev.filter((x) => x !== id)
                      : [...prev, id],
                  );
                }
                setSelectedId(id);
              }}
              onToggleSelect={(id) => {
                setSelectedIds((prev) =>
                  prev.includes(id)
                    ? prev.filter((x) => x !== id)
                    : [...prev, id],
                );
                setSelectedId(id);
              }}
              onToggleSelectAll={() => {
                const ids = assets.map((a) => a.id);
                const allOn = ids.every((id) => selectedIds.includes(id));
                setSelectedIds(allOn ? [] : ids);
              }}
              onOpenFolder={(id) => {
                setShowTrash(false);
                setCollection("all");
                setFolderId(id);
              }}
              onPageChange={setPage}
              onToggleFavorite={collections.toggleFavorite}
            />
          ) : null}
        </div>

        <MediaDetailsPanel
          asset={selectedAsset}
          folders={foldersQuery.data ?? []}
        />
      </div>

      {dragging && !showTrash ? (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="rounded-xl border border-dashed border-foreground/30 px-8 py-6 text-sm font-medium">
            Drop files to upload
          </div>
        </div>
      ) : null}
    </div>
  );
}
