"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { StoryStatusBadge } from "@/features/newsroom/components/story-status-badge";
import { RelativeTime } from "@/features/newsroom/components/relative-time";
import { profileDisplayName } from "@/features/newsroom/lib/story-utils";
import type { StoryWithRelations } from "@/features/newsroom/types/story.types";
import type { SaveStatus } from "@/features/story-workspace/constants/workspace-tabs";
import { AppBreadcrumbs } from "@/features/platform/components/app-breadcrumbs";
import { cn } from "@/lib/utils";

type StoryWorkspaceHeaderProps = {
  story: StoryWithRelations;
  saveStatus: SaveStatus;
  lastSavedAt: string | null;
};

function saveLabel(status: SaveStatus, lastSavedAt: string | null) {
  if (status === "saving") return "Saving…";
  if (status === "dirty") return "Unsaved changes";
  if (status === "error") return "Save failed";
  if (status === "saved" || lastSavedAt) return "Saved";
  return "Ready";
}

export function StoryWorkspaceHeader({
  story,
  saveStatus,
  lastSavedAt,
}: StoryWorkspaceHeaderProps) {
  return (
    <header className="flex flex-col gap-3 border-b border-border/60 bg-background/90 px-4 py-3 backdrop-blur md:px-5">
      <div className="flex flex-wrap items-center gap-2">
        <AppBreadcrumbs
          items={[
            { label: "Newsroom", href: "/newsroom" },
            { label: story.title },
          ]}
        />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-semibold tracking-tight md:text-2xl">
              {story.title}
            </h1>
            <StoryStatusBadge status={story.status} />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground sm:text-sm">
            <span>
              Reporter:{" "}
              <span className="text-foreground">
                {profileDisplayName(story.reporter)}
              </span>
            </span>
            <span>
              Editor:{" "}
              <span className="text-foreground">
                {profileDisplayName(story.editor)}
              </span>
            </span>
            <span>
              Updated:{" "}
              <span className="text-foreground">
                <RelativeTime value={story.updated_at} />
              </span>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className={cn(
              "rounded-md border px-2.5 py-1.5 text-xs",
              saveStatus === "error"
                ? "border-destructive/40 text-destructive"
                : saveStatus === "dirty"
                  ? "border-amber-500/40 text-amber-700 dark:text-amber-300"
                  : "border-border/60 text-muted-foreground",
            )}
            aria-live="polite"
          >
            {saveLabel(saveStatus, lastSavedAt)}
            {lastSavedAt && saveStatus === "saved" ? (
              <>
                {" · "}
                <RelativeTime value={lastSavedAt} />
              </>
            ) : null}
          </div>
          <Link
            href={`/newsroom/${story.id}/edit`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <Pencil />
            Edit metadata
          </Link>
        </div>
      </div>
    </header>
  );
}
