"use client";

import { MessageSquare, ListTodo, Zap, Activity } from "lucide-react";
import Link from "next/link";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button, buttonVariants } from "@/components/ui/button";
import { RelativeTime } from "@/features/newsroom/components/relative-time";
import type { StoryWithRelations } from "@/features/newsroom/types/story.types";
import { AIWorkspacePanel } from "@/features/ai-workspace/components/ai-workspace-panel";
import { cn } from "@/lib/utils";

type StoryWorkspaceSidebarProps = {
  story: StoryWithRelations;
  onFocusScript: () => void;
  onFocusMedia: () => void;
  onFocusProducer?: () => void;
};

export function StoryWorkspaceSidebar({
  story,
  onFocusScript,
  onFocusMedia,
  onFocusProducer,
}: StoryWorkspaceSidebarProps) {
  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-muted/10">
      <div className="border-b border-border/60 px-4 py-3">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Workspace
        </p>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-5 p-4">
          <section className="space-y-2">
            <AIWorkspacePanel storyId={story.id} storyTitle={story.title} />
          </section>

          <Separator />

          <section className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              <Zap className="size-3.5" />
              Quick actions
            </h3>
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                className="justify-start"
                onClick={onFocusScript}
              >
                Open script
              </Button>
              <Button
                type="button"
                variant="outline"
                className="justify-start"
                onClick={onFocusMedia}
              >
                Manage media
              </Button>
              {onFocusProducer ? (
                <Button
                  type="button"
                  variant="outline"
                  className="justify-start"
                  onClick={onFocusProducer}
                >
                  Open AI Producer
                </Button>
              ) : null}
              <Link
                href={`/newsroom/${story.id}/edit`}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "justify-start",
                )}
              >
                Edit story metadata
              </Link>
            </div>
          </section>

          <Separator />

          <section className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              <ListTodo className="size-3.5" />
              Tasks
            </h3>
            <p className="rounded-lg border border-dashed border-border/70 px-3 py-4 text-sm text-muted-foreground">
              Editorial task assignments will appear in a later collaboration
              release.
            </p>
          </section>

          <Separator />

          <section className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              <MessageSquare className="size-3.5" />
              Comments
            </h3>
            <p className="rounded-lg border border-dashed border-border/70 px-3 py-4 text-sm text-muted-foreground">
              Threaded comments are reserved for the collaboration feature track.
            </p>
          </section>

          <Separator />

          <section className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              <Activity className="size-3.5" />
              Recent activity
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                Story created <RelativeTime value={story.created_at} />
              </li>
              <li>
                Last updated <RelativeTime value={story.updated_at} />
              </li>
              {story.published_at ? (
                <li>
                  Published <RelativeTime value={story.published_at} />
                </li>
              ) : (
                <li>Not published yet</li>
              )}
            </ul>
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}
