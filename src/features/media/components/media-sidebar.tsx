"use client";

import { Clock, Folder, FolderOpen, Home, Star } from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { MediaFolder } from "@/features/media/types/media.types";

type MediaSidebarProps = {
  folders: MediaFolder[];
  activeFolderId: string | null;
  showTrash: boolean;
  collection?: "all" | "favorites" | "recent";
  onSelectRoot: () => void;
  onSelectFolder: (folderId: string) => void;
  onSelectFavorites?: () => void;
  onSelectRecent?: () => void;
};

export function MediaSidebar({
  folders,
  activeFolderId,
  showTrash,
  collection = "all",
  onSelectRoot,
  onSelectFolder,
  onSelectFavorites,
  onSelectRecent,
}: MediaSidebarProps) {
  const rootFolders = folders.filter((folder) => !folder.parent_id);

  function renderChildren(parentId: string, depth: number) {
    return folders
      .filter((folder) => folder.parent_id === parentId)
      .map((folder) => (
        <div key={folder.id}>
          <button
            type="button"
            onClick={() => onSelectFolder(folder.id)}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors",
              activeFolderId === folder.id && !showTrash && collection === "all"
                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            style={{ paddingLeft: `${0.625 + depth * 0.75}rem` }}
          >
            {activeFolderId === folder.id ? (
              <FolderOpen className="size-4 shrink-0" />
            ) : (
              <Folder className="size-4 shrink-0" />
            )}
            <span className="truncate">{folder.name}</span>
          </button>
          {renderChildren(folder.id, depth + 1)}
        </div>
      ));
  }

  return (
    <aside className="flex h-full w-full flex-col border-r border-border/60 bg-muted/15 md:w-56 lg:w-60">
      <div className="border-b border-border/60 px-3 py-3">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Library
        </p>
      </div>
      <ScrollArea className="flex-1">
        <nav className="space-y-1 p-2" aria-label="Media folders">
          <button
            type="button"
            onClick={onSelectRoot}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
              !activeFolderId && !showTrash && collection === "all"
                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Home className="size-4 shrink-0" />
            All library
          </button>
          {onSelectFavorites ? (
            <button
              type="button"
              onClick={onSelectFavorites}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                collection === "favorites"
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Star className="size-4 shrink-0" />
              Favorites
            </button>
          ) : null}
          {onSelectRecent ? (
            <button
              type="button"
              onClick={onSelectRecent}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                collection === "recent"
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Clock className="size-4 shrink-0" />
              Recent files
            </button>
          ) : null}

          <p className="px-2.5 pt-3 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Folders
          </p>
          {rootFolders.map((folder) => (
            <div key={folder.id}>
              <button
                type="button"
                onClick={() => onSelectFolder(folder.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                  activeFolderId === folder.id &&
                    !showTrash &&
                    collection === "all"
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {activeFolderId === folder.id ? (
                  <FolderOpen className="size-4 shrink-0" />
                ) : (
                  <Folder className="size-4 shrink-0" />
                )}
                <span className="truncate">{folder.name}</span>
              </button>
              {renderChildren(folder.id, 1)}
            </div>
          ))}
        </nav>
      </ScrollArea>
    </aside>
  );
}
