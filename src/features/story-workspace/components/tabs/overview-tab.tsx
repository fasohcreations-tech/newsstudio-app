"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Clapperboard,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StoryStatusBadge } from "@/features/newsroom/components/story-status-badge";
import { StoryPriorityIndicator } from "@/features/newsroom/components/story-priority-indicator";
import { RelativeTime } from "@/features/newsroom/components/relative-time";
import { profileDisplayName } from "@/features/newsroom/lib/story-utils";
import { updateStoryAction } from "@/features/newsroom/actions/story.actions";
import { syncStoryScenesFromPanelsAction } from "@/features/story-scene-builder/actions/scene-builder.actions";
import type { StoryWithRelations } from "@/features/newsroom/types/story.types";
import type { StoryWorkspaceTabId } from "@/features/story-workspace/constants/workspace-tabs";
import { SubHeadlineSlotsEditor } from "@/features/story-production/components/form/sub-headline-slots-editor";
import {
  joinSubHeadlineSlots,
  parseSubHeadlineMedia,
  parseSubHeadlineSlots,
  serializeSubHeadlineMedia,
  type SubHeadlineMediaRef,
} from "@/features/story-production/lib/sub-headlines";

type OverviewTabProps = {
  story: StoryWithRelations;
  onOpenTab: (tab: StoryWorkspaceTabId) => void;
  onStoryUpdated?: (story: StoryWithRelations) => void;
};

const WORKSPACE_MODULES: Array<{
  id: StoryWorkspaceTabId;
  title: string;
  description: string;
  icon: typeof Sparkles;
  ready: boolean;
  shortcut?: string;
}> = [
  {
    id: "ai-producer",
    title: "AI Producer",
    description:
      "Script, media, research, sub-headlines, website, SEO, and social — via Gemini (Manglish editing).",
    icon: Sparkles,
    ready: true,
    shortcut: "Ctrl+4",
  },
  {
    id: "timeline",
    title: "Timeline",
    description: "Open Creative Studio to edit the story package on a timeline.",
    icon: Clapperboard,
    ready: true,
    shortcut: "Ctrl+5",
  },
];

export function OverviewTab({
  story,
  onOpenTab,
  onStoryUpdated,
}: OverviewTabProps) {
  const [pending, startTransition] = useTransition();
  const [slotTexts, setSlotTexts] = useState(() =>
    parseSubHeadlineSlots(story.summary),
  );
  const [slotMedia, setSlotMedia] = useState<SubHeadlineMediaRef[]>(() =>
    parseSubHeadlineMedia(story.sub_headline_media),
  );
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (dirty) return;
    setSlotTexts(parseSubHeadlineSlots(story.summary));
    setSlotMedia(parseSubHeadlineMedia(story.sub_headline_media));
  }, [story.id, story.summary, story.sub_headline_media, story.updated_at, dirty]);

  const hasContent =
    slotTexts.some(Boolean) || slotMedia.some((slot) => slot.kind);

  return (
    <div className="space-y-5">
      <Card className="border-border/60">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <StoryStatusBadge status={story.status} />
            <StoryPriorityIndicator priority={story.priority} />
          </div>
          <CardTitle className="text-2xl">{story.title}</CardTitle>
          {story.subtitle ? (
            <CardDescription className="text-base">
              {story.subtitle}
            </CardDescription>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Sub Headlines
            </h3>
            {hasContent || dirty ? (
              <>
                <SubHeadlineSlotsEditor
                  texts={slotTexts}
                  media={slotMedia}
                  organizationId={story.organization_id}
                  storyId={story.id}
                  disabled={pending}
                  onTextsChange={(texts) => {
                    setSlotTexts(texts);
                    setDirty(true);
                  }}
                  onMediaChange={(media) => {
                    setSlotMedia(media);
                    setDirty(true);
                  }}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={pending || !dirty}
                    onClick={() =>
                      startTransition(async () => {
                        const primary =
                          slotTexts.find((slot) => slot.trim()) ?? "";
                        const result = await updateStoryAction(story.id, {
                          title: story.title,
                          subtitle: primary || story.subtitle || "",
                          summary: joinSubHeadlineSlots(slotTexts),
                          sub_headline_media:
                            serializeSubHeadlineMedia(slotMedia),
                          status: story.status,
                          priority: story.priority,
                          category: story.category ?? "",
                          language: story.language,
                        });
                        if (!result.success) {
                          toast.error(result.error);
                          return;
                        }
                        setDirty(false);
                        onStoryUpdated?.({
                          ...story,
                          summary: joinSubHeadlineSlots(slotTexts),
                          subtitle: primary || story.subtitle,
                          sub_headline_media:
                            serializeSubHeadlineMedia(slotMedia),
                        });
                        const synced = await syncStoryScenesFromPanelsAction(
                          story.id,
                        );
                        if (synced.success) {
                          toast.success(
                            `Saved · synced ${synced.data.updatedCount} scene${synced.data.updatedCount === 1 ? "" : "s"}`,
                          );
                        } else {
                          toast.success("Sub headlines & media saved");
                          // No package yet is fine — user builds scenes later.
                          if (
                            !synced.error
                              .toLowerCase()
                              .includes("no scene collection")
                          ) {
                            toast.message(synced.error);
                          }
                        }
                      })
                    }
                  >
                    Save media & text
                  </Button>
                  {dirty ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => {
                        setSlotTexts(parseSubHeadlineSlots(story.summary));
                        setSlotMedia(
                          parseSubHeadlineMedia(story.sub_headline_media),
                        );
                        setDirty(false);
                      }}
                    >
                      Discard
                    </Button>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">
                      Link Image, Video, or Caption per slot for scene building.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  No sub-headlines yet. Generate them in AI Producer, or start
                  slots here.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setDirty(true)}
                >
                  Add Sub Headlines
                </Button>
              </div>
            )}
          </div>
          <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <Meta label="Category" value={story.category ?? "—"} />
            <Meta label="Language" value={story.language} />
            <Meta label="Reporter" value={profileDisplayName(story.reporter)} />
            <Meta label="Editor" value={profileDisplayName(story.editor)} />
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
          </dl>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">
            Story workspace
          </h3>
          <p className="text-sm text-muted-foreground">
            Script and media live in AI Producer. Voice stays in its own tab for
            TTS.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {WORKSPACE_MODULES.map((mod) => {
            const Icon = mod.icon;
            return (
              <button
                key={mod.id}
                type="button"
                disabled={!mod.ready}
                onClick={() => onOpenTab(mod.id)}
                className="rounded-xl border border-border/60 bg-background p-4 text-left transition hover:border-foreground/20 hover:bg-muted/30 disabled:cursor-not-allowed disabled:opacity-55"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md border border-border/60 p-1.5">
                      <Icon className="size-4" />
                    </span>
                    <span className="font-medium">{mod.title}</span>
                  </div>
                  {mod.ready ? (
                    <Badge variant="secondary">Ready</Badge>
                  ) : (
                    <Badge variant="outline">Soon</Badge>
                  )}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {mod.description}
                </p>
                {mod.ready ? (
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium">
                    Open {mod.title}
                    <ArrowRight className="size-3.5" />
                    {mod.shortcut ? (
                      <span className="ml-1 text-muted-foreground">
                        {mod.shortcut}
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => onOpenTab("ai-producer")}>
            <Sparkles className="size-4" />
            Open AI Producer
          </Button>
        </div>
      </section>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
