"use client";

import Link from "next/link";
import { ArchiveRestore, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StoryStatusBadge } from "@/features/newsroom/components/story-status-badge";
import { StoryPriorityIndicator } from "@/features/newsroom/components/story-priority-indicator";
import { RelativeTime } from "@/features/newsroom/components/relative-time";
import {
  deleteStoryAction,
  restoreStoryAction,
} from "@/features/newsroom/actions/story.actions";
import { storyQueryKeys } from "@/features/newsroom/queries/story-keys";
import { profileDisplayName } from "@/features/newsroom/lib/story-utils";
import type { StoryWithRelations } from "@/features/newsroom/types/story.types";
import { cn } from "@/lib/utils";

type StoryContextPanelProps = {
  story: StoryWithRelations | null;
};

export function StoryContextPanel({ story }: StoryContextPanelProps) {
  const queryClient = useQueryClient();

  async function handleDelete() {
    if (!story) return;
    const result = await deleteStoryAction(story.id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Story moved to trash");
    await queryClient.invalidateQueries({ queryKey: storyQueryKeys.all });
  }

  async function handleRestore() {
    if (!story) return;
    const result = await restoreStoryAction(story.id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Story restored");
    await queryClient.invalidateQueries({ queryKey: storyQueryKeys.all });
  }

  if (!story) {
    return (
      <aside className="hidden h-full w-80 flex-col border-l border-border/60 bg-muted/10 xl:flex">
        <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
          Select a story to view summary, activity, and quick actions.
        </div>
      </aside>
    );
  }

  return (
    <aside className="hidden h-full w-80 flex-col border-l border-border/60 bg-muted/10 xl:flex">
      <div className="border-b border-border/60 px-4 py-3">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Context
        </p>
        <h2 className="mt-1 line-clamp-2 text-sm font-semibold">{story.title}</h2>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-5 p-4">
          <section className="space-y-2">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Story summary
            </h3>
            <p className="text-sm text-muted-foreground">
              {story.summary?.trim() || "No summary provided."}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <StoryStatusBadge status={story.status} />
              <StoryPriorityIndicator priority={story.priority} />
            </div>
            <dl className="grid grid-cols-2 gap-2 pt-2 text-xs">
              <div>
                <dt className="text-muted-foreground">Reporter</dt>
                <dd className="font-medium">
                  {profileDisplayName(story.reporter)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Language</dt>
                <dd className="font-medium">{story.language}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Category</dt>
                <dd className="font-medium">{story.category ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Updated</dt>
                <dd className="font-medium">
                  <RelativeTime value={story.updated_at} />
                </dd>
              </div>
            </dl>
          </section>

          <Separator />

          <section className="space-y-2">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Activity
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                Created <RelativeTime value={story.created_at} />
              </li>
              <li>
                Last updated <RelativeTime value={story.updated_at} />
              </li>
              {story.published_at ? (
                <li>
                  Published <RelativeTime value={story.published_at} />
                </li>
              ) : null}
            </ul>
          </section>

          <Separator />

          <section className="space-y-2">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Comments
            </h3>
            <p className="rounded-lg border border-dashed border-border/70 bg-background/50 px-3 py-4 text-sm text-muted-foreground">
              Comments will land in a later newsroom collaboration feature.
            </p>
          </section>

          <Separator />

          <section className="space-y-2">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Quick actions
            </h3>
            <div className="flex flex-col gap-2">
              <Link
                href={`/newsroom/stories/${story.id}`}
                className={cn(buttonVariants({ variant: "outline" }), "justify-start")}
              >
                <ExternalLink />
                Open story
              </Link>
              {!story.deleted_at ? (
                <>
                  <Link
                    href={`/newsroom/${story.id}/edit`}
                    className={cn(buttonVariants({ variant: "outline" }), "justify-start")}
                  >
                    <Pencil />
                    Edit story
                  </Link>
                  <Button
                    type="button"
                    variant="destructive"
                    className="justify-start"
                    onClick={handleDelete}
                  >
                    <Trash2 />
                    Move to trash
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="justify-start"
                  onClick={handleRestore}
                >
                  <ArchiveRestore />
                  Restore story
                </Button>
              )}
            </div>
          </section>
        </div>
      </ScrollArea>
    </aside>
  );
}
