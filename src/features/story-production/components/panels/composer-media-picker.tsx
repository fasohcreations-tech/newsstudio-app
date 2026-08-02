"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Film, FolderOpen, Image as ImageIcon, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MediaThumbnail } from "@/features/media/components/media-thumbnail";
import { useMediaLibrary } from "@/features/media/hooks/use-media";
import {
  importUrlToMediaLibrary,
  uploadFilesToMediaLibrary,
} from "@/features/story-production/lib/import-media-to-library";
import { toLibraryMediaRef } from "@/features/story-production/lib/library-media-reference";
import { mediaQueryKeys } from "@/features/media/queries/media-keys";
import {
  DEMO_STORY_ASSETS,
  STORY_ASSET_CATEGORIES,
} from "@/features/story-production/constants/demo-assets.constants";
import type { StoryMediaTarget } from "@/features/story-production/lib/resolve-media-target";
import type { StoryAssetCategory } from "@/features/story-production/types/story-data.types";

type ComposerMediaPickerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: StoryMediaTarget;
  organizationId?: string | null;
  onPick: (url: string, label?: string) => void;
  appendOnPick?: boolean;
};

function categoriesForKind(
  kind: StoryMediaTarget["kind"],
): StoryAssetCategory[] {
  if (kind === "video") return ["videos", "images"];
  if (kind === "audio") return ["voice_over", "music"];
  if (kind === "image") return ["images", "logos"];
  return STORY_ASSET_CATEGORIES.map((c) => c.id);
}

/**
 * Browse dialog for assigning media to a Story placeholder/field.
 * Sources: Demo pack · Media Library · Local files.
 */
export function ComposerMediaPicker({
  open,
  onOpenChange,
  target,
  organizationId,
  onPick,
  appendOnPick = false,
}: ComposerMediaPickerProps) {
  const queryClient = useQueryClient();
  const allowedCategories = useMemo(
    () => categoriesForKind(target.kind),
    [target.kind],
  );
  const [category, setCategory] = useState<StoryAssetCategory>(
    () => allowedCategories[0] ?? "videos",
  );
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!allowedCategories.includes(category)) {
      setCategory(allowedCategories[0] ?? "videos");
    }
  }, [allowedCategories, category]);

  const libraryFilters = useMemo(
    () => ({
      organizationId: organizationId ?? "",
      page: 1,
      pageSize: 48,
      includeAllFolders: true,
      fileType: "all" as const,
    }),
    [organizationId],
  );

  const demoAssets = useMemo(
    () =>
      DEMO_STORY_ASSETS.filter((asset) =>
        allowedCategories.includes(asset.category),
      ).filter((asset) =>
        category ? asset.category === category : true,
      ),
    [allowedCategories, category],
  );

  const libraryQuery = useMediaLibrary(
    libraryFilters,
    Boolean(organizationId) && open,
  );

  const libraryAssets = useMemo(() => {
    const all = libraryQuery.data?.assets ?? [];
    return all.filter((asset) => {
      if (target.kind === "video") {
        return asset.file_type === "video" || asset.file_type === "image";
      }
      if (target.kind === "image") {
        return asset.file_type === "image";
      }
      if (target.kind === "audio") {
        return asset.file_type === "audio";
      }
      return true;
    });
  }, [libraryQuery.data?.assets, target.kind]);

  const invalidateLibrary = useCallback(() => {
    if (!organizationId) return;
    void queryClient.invalidateQueries({
      queryKey: mediaQueryKeys.list(libraryFilters),
    });
  }, [libraryFilters, organizationId, queryClient]);

  const assignLibraryAsset = useCallback(
    (assetId: string, label?: string) => {
      onPick(toLibraryMediaRef(assetId), label);
      onOpenChange(false);
      toast.success(`Assigned to ${target.label}`);
    },
    [onOpenChange, onPick, target.label],
  );

  async function uploadFilesToLibrary(files: FileList | File[] | null) {
    const list = files ? Array.from(files) : [];
    if (list.length === 0) return;

    if (!organizationId) {
      toast.error("Sign in to an organization to upload media to the library.");
      return;
    }

    setUploading(true);
    try {
      const { refs, errors } = await uploadFilesToMediaLibrary({
        organizationId,
        files: list,
      });

      if (errors.length > 0) {
        toast.error(errors[0] ?? "Upload failed");
      }

      if (refs.length === 0) return;

      invalidateLibrary();
      onPick(refs[0]!, list[0]?.name);
      onOpenChange(false);
      toast.success(`Assigned to ${target.label}`);

      if (refs.length > 1) {
        toast.message(
          `${refs.length} files uploaded — first file assigned to ${target.label}`,
        );
      }
    } finally {
      setUploading(false);
    }
  }

  function pickLibraryAsset(assetId: string) {
    const asset = libraryAssets.find((item) => item.id === assetId);
    if (!asset) return;
    assignLibraryAsset(asset.id, asset.name);
  }

  async function importDemoAssetToLibrary(url: string, label: string) {
    if (!organizationId) {
      toast.error("Sign in to an organization to use the Media Library.");
      return;
    }

    setUploading(true);
    try {
      const { ref, error } = await importUrlToMediaLibrary({
        organizationId,
        url,
        name: label,
      });

      if (error || !ref) {
        toast.error(error ?? "Unable to import demo file to library");
        return;
      }

      invalidateLibrary();
      onPick(ref, label);
      onOpenChange(false);
      toast.success(`Assigned to ${target.label}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-0 p-0 sm:max-w-3xl">
        <DialogHeader className="border-b border-border/60 px-5 py-4">
          <DialogTitle className="text-[18px]">Browse Media</DialogTitle>
          <DialogDescription className="text-[14px]">
            Assign media to <strong>{target.label}</strong>{" "}
            <code className="text-[12px]">{`{{${target.bindingKey}}}`}</code>
            {appendOnPick ? " · each pick adds to slideshow" : ""}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="demo" className="min-h-0">
          <TabsList className="mx-4 mt-3 grid h-auto w-auto grid-cols-3">
            <TabsTrigger value="demo" className="text-[14px]">
              Demo
            </TabsTrigger>
            <TabsTrigger value="library" className="text-[14px]">
              Library
            </TabsTrigger>
            <TabsTrigger value="upload" className="text-[14px]">
              Computer
            </TabsTrigger>
          </TabsList>

          <TabsContent value="demo" className="m-0">
            <div className="flex flex-wrap gap-1.5 border-b border-border/40 px-4 py-2">
              {allowedCategories.map((id) => {
                const label =
                  STORY_ASSET_CATEGORIES.find((c) => c.id === id)?.label ?? id;
                return (
                  <Button
                    key={id}
                    type="button"
                    size="sm"
                    variant={category === id ? "secondary" : "ghost"}
                    className="h-8 text-[13px]"
                    onClick={() => setCategory(id)}
                  >
                    {label}
                  </Button>
                );
              })}
            </div>
            <ScrollArea className="h-[42vh] px-4 py-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {demoAssets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    className="overflow-hidden rounded-xl border border-border/60 text-left hover:border-primary/50 hover:bg-muted/30"
                    onClick={() => {
                      if (asset.url === "#") {
                        toast.error("This demo item has no file");
                        return;
                      }
                      void importDemoAssetToLibrary(asset.url, asset.label);
                    }}
                    disabled={uploading}
                  >
                    <div className="flex aspect-video items-center justify-center bg-muted">
                      {asset.mimeType?.startsWith("video/") ? (
                        <Film className="size-8 text-muted-foreground" />
                      ) : asset.mimeType?.startsWith("image/") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={asset.url}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="size-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="truncate px-2.5 py-2 text-[14px] font-medium">
                      {asset.label}
                    </div>
                  </button>
                ))}
              </div>
              {demoAssets.length === 0 ? (
                <p className="py-10 text-center text-[14px] text-muted-foreground">
                  No demo assets for this target.
                </p>
              ) : null}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="library" className="m-0">
            <ScrollArea className="h-[48vh] px-4 py-3">
              {!organizationId ? (
                <p className="py-10 text-center text-[14px] text-muted-foreground">
                  Sign in to an organization to browse the Media Library.
                </p>
              ) : libraryQuery.isLoading ? (
                <p className="py-10 text-center text-[14px] text-muted-foreground">
                  Loading library…
                </p>
              ) : libraryAssets.length === 0 ? (
                <p className="py-10 text-center text-[14px] text-muted-foreground">
                  No compatible assets found for this target. Upload a supported
                  file or switch target.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {libraryAssets.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      className="overflow-hidden rounded-xl border border-border/60 text-left hover:border-primary/50"
                      onClick={() => void pickLibraryAsset(asset.id)}
                    >
                      <div className="aspect-video">
                        <MediaThumbnail asset={asset} />
                      </div>
                      <div className="truncate px-2.5 py-2 text-[14px] font-medium">
                        {asset.name}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="upload" className="m-0 px-4 py-8">
            <label
              className={`flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/70 px-6 py-12 ${
                uploading || !organizationId
                  ? "cursor-not-allowed opacity-60"
                  : "cursor-pointer hover:bg-muted/30"
              }`}
            >
              {uploading ? (
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
              ) : (
                <Upload className="size-8 text-muted-foreground" />
              )}
              <p className="text-[16px] font-medium">
                {uploading ? "Uploading to library…" : "Choose a file"}
              </p>
              <p className="text-center text-[13px] text-muted-foreground">
                {organizationId
                  ? `${target.accept} · uploads to Media Library · assigns to ${target.label}`
                  : "Sign in to an organization to upload files to the Media Library."}
              </p>
              <input
                type="file"
                className="sr-only"
                accept={target.accept}
                disabled={uploading || !organizationId}
                onChange={(event) => {
                  void uploadFilesToLibrary(event.target.files);
                  event.target.value = "";
                }}
              />
            </label>
          </TabsContent>
        </Tabs>

        <DialogFooter className="border-t border-border/60 px-5 py-3">
          <Button
            type="button"
            variant="outline"
            className="h-9 text-[15px]"
            onClick={() => onOpenChange(false)}
          >
            <FolderOpen className="mr-1.5 size-4" />
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
