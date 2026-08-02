"use client";

import { STORY_DETAIL_TABS } from "@/features/newsroom/constants/story-tabs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { StoryWithRelations } from "@/features/newsroom/types/story.types";
import { StoryStatusBadge } from "@/features/newsroom/components/story-status-badge";
import { StoryPriorityIndicator } from "@/features/newsroom/components/story-priority-indicator";
import { RelativeTime } from "@/features/newsroom/components/relative-time";
import { profileDisplayName } from "@/features/newsroom/lib/story-utils";
import { StoryMediaPanel } from "@/features/media/components/story-media-panel";

type StoryDetailTabsProps = {
  story: StoryWithRelations;
};

export function StoryDetailTabs({ story }: StoryDetailTabsProps) {
  return (
    <Tabs defaultValue="overview" className="gap-4">
      <TabsList variant="line" className="h-auto w-full flex-wrap justify-start gap-1">
        {STORY_DETAIL_TABS.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="overview" className="space-y-4">
        <Card className="border-border/60">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <StoryStatusBadge status={story.status} />
              <StoryPriorityIndicator priority={story.priority} />
            </div>
            <CardTitle className="text-2xl">{story.title}</CardTitle>
            {story.subtitle ? (
              <CardDescription className="text-base">{story.subtitle}</CardDescription>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {story.summary?.trim() || "No summary provided for this story yet."}
            </p>
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Reporter</dt>
                <dd className="font-medium">{profileDisplayName(story.reporter)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Editor</dt>
                <dd className="font-medium">{profileDisplayName(story.editor)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Category</dt>
                <dd className="font-medium">{story.category ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Language</dt>
                <dd className="font-medium">{story.language}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Created</dt>
                <dd className="font-medium">
                  <RelativeTime value={story.created_at} />
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Updated</dt>
                <dd className="font-medium">
                  <RelativeTime value={story.updated_at} />
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Published</dt>
                <dd className="font-medium">
                  {story.published_at ? (
                    <RelativeTime value={story.published_at} />
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Slug</dt>
                <dd className="font-medium font-mono text-xs">{story.slug}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="media" className="space-y-4">
        <StoryMediaPanel story={story} />
      </TabsContent>

      {STORY_DETAIL_TABS.filter(
        (tab) => tab.id !== "overview" && tab.id !== "media",
      ).map((tab) => (
        <TabsContent key={tab.id} value={tab.id}>
          <Card className="border-dashed border-border/70 bg-muted/20 shadow-none">
            <CardHeader>
              <CardTitle className="text-base">{tab.label}</CardTitle>
              <CardDescription>
                Reserved for a future MediaOS module. This tab is part of the
                Story foundation and will connect without restructuring.
              </CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>
      ))}
    </Tabs>
  );
}
