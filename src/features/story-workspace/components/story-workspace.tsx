"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

import { Button } from "@/components/ui/button";
import { StoryWorkspaceHeader } from "@/features/story-workspace/components/story-workspace-header";
import { StoryWorkspaceSidebar } from "@/features/story-workspace/components/story-workspace-sidebar";
import { StoryWorkspaceStatusBar } from "@/features/story-workspace/components/story-workspace-status-bar";
import { OverviewTab } from "@/features/story-workspace/components/tabs/overview-tab";
import { TimelineTab } from "@/features/story-workspace/components/tabs/timeline-tab";
import { StoryGraphicsTab } from "@/features/story-workspace/components/tabs/graphics-tab";
import { PublishingTab } from "@/features/story-workspace/components/tabs/publishing-tab";
import { WorkspacePlaceholderTab } from "@/features/story-workspace/components/tabs/workspace-placeholder-tab";
import { AiNewsProducerTab } from "@/features/ai-news-producer/components/ai-news-producer-tab";
import {
  STORY_WORKSPACE_TABS,
  type SaveStatus,
  type StoryWorkspaceTabId,
} from "@/features/story-workspace/constants/workspace-tabs";
import { saveStoryScriptAction } from "@/features/story-workspace/actions/script.actions";
import type {
  ScriptSavePayload,
  StoryScript,
  StoryWorkspaceUser,
} from "@/features/story-workspace/types/workspace.types";
import type { StoryWithRelations } from "@/features/newsroom/types/story.types";
import type { CreativeProject } from "@/features/creative-studio/types/creative-studio.types";
import { ResizablePanel } from "@/features/platform/components/resizable-panel";
import { usePersistedState } from "@/features/platform/hooks/use-persisted-state";
import { useKeyboardShortcut } from "@/features/platform/hooks/use-keyboard-shortcut";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const ScriptTab = dynamic(
  () =>
    import("@/features/story-workspace/components/tabs/script-tab").then(
      (m) => m.ScriptTab,
    ),
  {
    loading: () => <Skeleton className="h-64 w-full" />,
    ssr: false,
  },
);

const StoryMediaPanel = dynamic(
  () =>
    import("@/features/media/components/story-media-panel").then(
      (m) => m.StoryMediaPanel,
    ),
  {
    loading: () => <Skeleton className="h-48 w-full" />,
  },
);

const PRIMARY_TABS = STORY_WORKSPACE_TABS.filter((t) => t.ready);
const SOON_TABS = STORY_WORKSPACE_TABS.filter((t) => !t.ready);

type StoryWorkspaceProps = {
  story: StoryWithRelations;
  script: StoryScript;
  currentUser: StoryWorkspaceUser;
  creativeProjects?: CreativeProject[];
};

export function StoryWorkspace({
  story,
  script,
  currentUser,
  creativeProjects = [],
}: StoryWorkspaceProps) {
  const [tab, setTab] = usePersistedState<StoryWorkspaceTabId>(
    `mediaos.story-tab.${story.id}`,
    "overview",
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(script.updated_at);
  const [version, setVersion] = useState(script.version);
  const [wordCount, setWordCount] = useState(script.word_count);
  const [characterCount, setCharacterCount] = useState(script.character_count);
  const [showSoon, setShowSoon] = useState(false);
  const latestPayload = useRef<ScriptSavePayload | null>(null);
  const saveTimer = useRef<number | null>(null);

  const persistScript = useCallback(async () => {
    const payload = latestPayload.current;
    if (!payload) return;

    setSaveStatus("saving");
    const result = await saveStoryScriptAction({
      storyId: story.id,
      ...payload,
    });

    if (!result.success) {
      setSaveStatus("error");
      return;
    }

    setLastSavedAt(result.data.updatedAt);
    setVersion(result.data.version);
    setSaveStatus("saved");
  }, [story.id]);

  const handleScriptChange = useCallback(
    (payload: ScriptSavePayload) => {
      latestPayload.current = payload;
      setWordCount(payload.wordCount);
      setCharacterCount(payload.characterCount);
      setSaveStatus("dirty");

      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
      }

      saveTimer.current = window.setTimeout(() => {
        void persistScript();
      }, 1200);
    },
    [persistScript],
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
      }
    };
  }, []);

  useKeyboardShortcut("ctrl+1", () => setTab("overview"));
  useKeyboardShortcut("ctrl+2", () => setTab("script"));
  useKeyboardShortcut("ctrl+3", () => setTab("media"));
  useKeyboardShortcut("ctrl+4", () => setTab("ai-producer"));
  useKeyboardShortcut("ctrl+5", () => setTab("timeline"));
  useKeyboardShortcut(
    "ctrl+s",
    () => {
      void persistScript();
    },
    { allowInInputs: true },
  );

  const deleted = Boolean(story.deleted_at);
  const activeTab = STORY_WORKSPACE_TABS.some((t) => t.id === tab)
    ? tab
    : "overview";

  return (
    <div className="-m-4 flex h-[calc(100svh-3.5rem-2.25rem)] max-h-[calc(100svh-3.5rem-2.25rem)] min-h-0 flex-col overflow-hidden border-y border-border/60 bg-background md:-m-6">
      <div className="z-10 shrink-0 border-b border-border/60 bg-background">
        <StoryWorkspaceHeader
          story={story}
          saveStatus={saveStatus}
          lastSavedAt={lastSavedAt}
        />

        <nav
          className="flex flex-wrap items-center gap-1 border-t border-border/50 bg-muted/30 px-3 py-2 md:px-4"
          aria-label="Story workspace modules"
        >
          {PRIMARY_TABS.map((item) => (
            <Button
              key={item.id}
              type="button"
              size="sm"
              variant={activeTab === item.id ? "default" : "ghost"}
              className={cn(
                "h-8",
                activeTab === item.id ? "" : "text-muted-foreground",
              )}
              aria-current={activeTab === item.id ? "page" : undefined}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </Button>
          ))}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 text-muted-foreground"
            onClick={() => setShowSoon((v) => !v)}
          >
            {showSoon ? "Hide soon" : "More (soon)"}
          </Button>
          {showSoon
            ? SOON_TABS.map((item) => (
                <Button
                  key={item.id}
                  type="button"
                  size="sm"
                  variant={activeTab === item.id ? "secondary" : "ghost"}
                  className="h-8 text-muted-foreground"
                  onClick={() => setTab(item.id)}
                >
                  {item.label}
                </Button>
              ))
            : null}
        </nav>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="min-h-0 min-w-0 flex-1 overflow-auto p-4 md:p-5">
          {activeTab === "overview" ? (
            <OverviewTab story={story} onOpenTab={setTab} />
          ) : null}

          {activeTab === "script" ? (
            <ScriptTab
              storyId={story.id}
              initialHtml={script.content_html}
              wordCount={wordCount}
              characterCount={characterCount}
              disabled={deleted}
              onChange={handleScriptChange}
            />
          ) : null}

          {activeTab === "media" ? <StoryMediaPanel story={story} /> : null}

          {activeTab === "ai-producer" ? (
            <AiNewsProducerTab
              storyId={story.id}
              storyTitle={story.title}
            />
          ) : null}

          {activeTab === "timeline" ? (
            <TimelineTab
              storyId={story.id}
              storyTitle={story.title}
              organizationId={story.organization_id}
              initialProjects={creativeProjects}
            />
          ) : null}

          {activeTab === "graphics" ? (
            <StoryGraphicsTab
              storyId={story.id}
              storyTitle={story.title}
            />
          ) : null}

          {activeTab === "voice" ? (
            <WorkspacePlaceholderTab
              title="Voice"
              description="Voice-over generation and audio take management will dock here."
            />
          ) : null}

          {activeTab === "publishing" ? <PublishingTab /> : null}

          {activeTab === "broadcast" ? (
            <WorkspacePlaceholderTab
              title="Broadcast"
              description="BroadcastOS rundown and playout controls will integrate in this tab."
            />
          ) : null}

          {activeTab === "analytics" ? (
            <WorkspacePlaceholderTab
              title="Analytics"
              description="Story performance analytics will surface here after publishing pipelines ship."
            />
          ) : null}

          {activeTab === "history" ? (
            <WorkspacePlaceholderTab
              title="History"
              description="Version history will list prior script snapshots. Current version stays editable."
            />
          ) : null}
        </div>

        <ResizablePanel
          storageKey={`mediaos.story-sidebar-width.${story.id}`}
          defaultWidth={320}
          minWidth={280}
          maxWidth={440}
        >
          <StoryWorkspaceSidebar
            story={story}
            onFocusScript={() => setTab("script")}
            onFocusMedia={() => setTab("media")}
            onFocusProducer={() => setTab("ai-producer")}
          />
        </ResizablePanel>
      </div>

      <StoryWorkspaceStatusBar
        saveStatus={saveStatus}
        version={version}
        currentUser={currentUser}
      />
    </div>
  );
}
