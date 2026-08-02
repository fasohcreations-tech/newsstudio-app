"use client";

import type { SaveStatus } from "@/features/story-workspace/constants/workspace-tabs";
import type { StoryWorkspaceUser } from "@/features/story-workspace/types/workspace.types";

type StoryWorkspaceStatusBarProps = {
  saveStatus: SaveStatus;
  version: number;
  currentUser: StoryWorkspaceUser;
};

export function StoryWorkspaceStatusBar({
  saveStatus,
  version,
  currentUser,
}: StoryWorkspaceStatusBarProps) {
  const autoSaveLabel =
    saveStatus === "saving"
      ? "Auto-save in progress"
      : saveStatus === "dirty"
        ? "Waiting to auto-save"
        : saveStatus === "error"
          ? "Auto-save error"
          : "Auto-save on";

  return (
    <footer className="flex h-9 shrink-0 items-center justify-between gap-3 border-t border-border/60 bg-muted/30 px-3 text-xs text-muted-foreground md:px-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="inline-flex items-center gap-1.5">
          <span
            className={
              saveStatus === "error"
                ? "size-1.5 rounded-full bg-destructive"
                : saveStatus === "dirty" || saveStatus === "saving"
                  ? "size-1.5 rounded-full bg-amber-500"
                  : "size-1.5 rounded-full bg-emerald-500"
            }
            aria-hidden="true"
          />
          {autoSaveLabel}
        </span>
        <span>Version {version}</span>
      </div>
      <div className="truncate">
        {currentUser.full_name?.trim() || currentUser.email}
      </div>
    </footer>
  );
}
