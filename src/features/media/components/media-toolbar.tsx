"use client";

import { useMemo, useState } from "react";
import { FolderPlus, LayoutGrid, List, Search, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  MEDIA_ACCEPT,
  MEDIA_FILE_TYPES,
  MEDIA_FILE_TYPE_LABELS,
} from "@/features/media/constants/media.constants";
import { createMediaFolderAction } from "@/features/media/actions/media.actions";
import { uploadMediaFiles, type UploadProgress } from "@/features/media/lib/upload-media";
import type { MediaBrowserView } from "@/features/media/types/media.types";
import type { MediaFileType } from "@/shared/types/database.types";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type MediaToolbarProps = {
  organizationId: string;
  folderId: string | null;
  search: string;
  fileType: MediaFileType | "all";
  storyId: string | null;
  stories: Array<{ id: string; title: string }>;
  view: MediaBrowserView;
  showTrash: boolean;
  onSearchChange: (value: string) => void;
  onFileTypeChange: (value: MediaFileType | "all") => void;
  onStoryChange: (value: string | null) => void;
  onViewChange: (value: MediaBrowserView) => void;
  onToggleTrash: () => void;
  onRefresh: () => void;
};

export function MediaToolbar({
  organizationId,
  folderId,
  search,
  fileType,
  storyId,
  stories,
  view,
  showTrash,
  onSearchChange,
  onFileTypeChange,
  onStoryChange,
  onViewChange,
  onToggleTrash,
  onRefresh,
}: MediaToolbarProps) {
  const [folderOpen, setFolderOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progressItems, setProgressItems] = useState<UploadProgress[]>([]);

  const overallProgress = useMemo(() => {
    if (!progressItems.length) return 0;
    return Math.round(
      progressItems.reduce((sum, item) => sum + item.progress, 0) /
        progressItems.length,
    );
  }, [progressItems]);

  async function handleCreateFolder() {
    const result = await createMediaFolderAction({
      organizationId,
      parentId: folderId,
      name: folderName,
    });
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Folder created");
    setFolderName("");
    setFolderOpen(false);
    onRefresh();
  }

  async function handleFilesSelected(fileList: FileList | null) {
    if (!fileList?.length) return;
    setUploading(true);
    const files = Array.from(fileList);
    const { errors } = await uploadMediaFiles({
      organizationId,
      folderId,
      files,
      onProgress: setProgressItems,
    });
    setUploading(false);
    if (errors.length) {
      toast.error(errors[0]);
    } else {
      toast.success(
        files.length === 1 ? "Asset uploaded" : `${files.length} assets uploaded`,
      );
    }
    setProgressItems([]);
    onRefresh();
  }

  return (
    <>
      <div className="flex flex-col gap-3 border-b border-border/60 bg-background/80 p-3 backdrop-blur md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <label className={cn("inline-flex")}>
            <input
              type="file"
              className="sr-only"
              accept={MEDIA_ACCEPT}
              multiple
              disabled={uploading || showTrash}
              onChange={(event) => {
                void handleFilesSelected(event.target.files);
                event.target.value = "";
              }}
            />
            <Button type="button" disabled={uploading || showTrash}
              onClick={(event) => {
                const input = (event.currentTarget.parentElement?.querySelector(
                  'input[type="file"]',
                ) ?? null) as HTMLInputElement | null;
                input?.click();
              }}
            >
              <Upload />
              Upload
            </Button>
          </label>

          <Button
            type="button"
            variant="outline"
            disabled={showTrash}
            onClick={() => setFolderOpen(true)}
          >
            <FolderPlus />
            New folder
          </Button>

          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search assets…"
              className="pl-8"
              aria-label="Search media assets"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={fileType}
            onValueChange={(value) =>
              onFileTypeChange((value ?? "all") as MediaFileType | "all")
            }
          >
            <SelectTrigger className="w-[150px]" aria-label="Filter by type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {MEDIA_FILE_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {MEDIA_FILE_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={storyId ?? "all"}
            onValueChange={(value) =>
              onStoryChange(!value || value === "all" ? null : value)
            }
          >
            <SelectTrigger className="w-[180px]" aria-label="Filter by story">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stories</SelectItem>
              {stories.map((story) => (
                <SelectItem key={story.id} value={story.id}>
                  {story.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex rounded-lg border border-border/60 p-0.5">
            <Button
              type="button"
              size="icon-sm"
              variant={view === "grid" ? "secondary" : "ghost"}
              onClick={() => onViewChange("grid")}
              aria-label="Grid view"
            >
              <LayoutGrid />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant={view === "list" ? "secondary" : "ghost"}
              onClick={() => onViewChange("list")}
              aria-label="List view"
            >
              <List />
            </Button>
          </div>

          <Button
            type="button"
            variant={showTrash ? "secondary" : "outline"}
            onClick={onToggleTrash}
          >
            <Trash2 />
            Trash
          </Button>
        </div>
      </div>

      {uploading ? (
        <div className="border-b border-border/60 px-3 py-2">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>Uploading {progressItems.length} file(s)…</span>
            <span>{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} />
        </div>
      ) : null}

      <Dialog open={folderOpen} onOpenChange={setFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
            <DialogDescription>
              Create a folder in the current location.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="folder-name">Name</Label>
            <Input
              id="folder-name"
              value={folderName}
              onChange={(event) => setFolderName(event.target.value)}
              placeholder="B-roll, Graphics, Audio…"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setFolderOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!folderName.trim()}
              onClick={() => void handleCreateFolder()}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
