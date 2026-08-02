"use client";

import {
  Clapperboard,
  FileText,
  ImageIcon,
  Sparkles,
  ArrowRight,
} from "lucide-react";

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
import type { StoryWithRelations } from "@/features/newsroom/types/story.types";
import type { StoryWorkspaceTabId } from "@/features/story-workspace/constants/workspace-tabs";

type OverviewTabProps = {
  story: StoryWithRelations;
  onOpenTab: (tab: StoryWorkspaceTabId) => void;
};

const WORKSPACE_MODULES: Array<{
  id: StoryWorkspaceTabId;
  title: string;
  description: string;
  icon: typeof FileText;
  ready: boolean;
  shortcut?: string;
}> = [
  {
    id: "script",
    title: "Script",
    description: "Write and auto-save the story script body.",
    icon: FileText,
    ready: true,
    shortcut: "Ctrl+2",
  },
  {
    id: "media",
    title: "Media",
    description: "Attach images, video, and audio from the library.",
    icon: ImageIcon,
    ready: true,
    shortcut: "Ctrl+3",
  },
  {
    id: "ai-producer",
    title: "AI Producer",
    description:
      "Generate research, headlines, summary, TV script, website article, SEO, and social — via Gemini.",
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

export function OverviewTab({ story, onOpenTab }: OverviewTabProps) {
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
          <div>
            <h3 className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Summary
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {story.summary?.trim() ||
                "No summary yet. Add one via Edit metadata — AI Producer uses it as context."}
            </p>
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
            Features live in the tabs above this panel — not only on Overview.
            Use the right sidebar for the Story AI chat assistant.
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
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenTab("script")}
          >
            <FileText className="size-4" />
            Write script
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
