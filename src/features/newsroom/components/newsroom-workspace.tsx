"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useDeferredValue } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { NewsroomToolbar } from "@/features/newsroom/components/newsroom-toolbar";
import { NewsroomSidebar } from "@/features/newsroom/components/newsroom-sidebar";
import { StoryList } from "@/features/newsroom/components/story-list";
import { StoryContextPanel } from "@/features/newsroom/components/story-context-panel";
import { StoryEmptyState } from "@/features/newsroom/components/story-empty-state";
import { useStories } from "@/features/newsroom/hooks/use-stories";
import type { NewsroomView } from "@/features/newsroom/constants/newsroom-nav";
import {
  STORY_PAGE_SIZE,
  type StorySortOption,
} from "@/features/newsroom/constants/story.constants";
import type { StoryPriority, StoryStatus } from "@/shared/types/database.types";

type NewsroomWorkspaceProps = {
  organizationId: string;
  organizationName: string;
};

export function NewsroomWorkspace({
  organizationId,
  organizationName,
}: NewsroomWorkspaceProps) {
  const router = useRouter();
  const [view, setView] = useState<NewsroomView>("all");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [status, setStatus] = useState<StoryStatus | "all">("all");
  const [priority, setPriority] = useState<StoryPriority | "all">("all");
  const [category, setCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<StorySortOption>("updated_at_desc");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      organizationId,
      view,
      status: view === "all" || view === "categories" || view === "assignments"
        ? status
        : "all",
      priority,
      category,
      search: deferredSearch,
      sort,
      page,
      pageSize: STORY_PAGE_SIZE,
      includeDeleted: view === "trash",
    }),
    [
      organizationId,
      view,
      status,
      priority,
      category,
      deferredSearch,
      sort,
      page,
    ],
  );

  const { data, isLoading, isFetching, isError, error, refetch } =
    useStories(filters);

  useEffect(() => {
    setPage(1);
  }, [view, status, priority, category, deferredSearch, sort]);

  useEffect(() => {
    if (!data?.stories.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !data.stories.some((story) => story.id === selectedId)) {
      setSelectedId(data.stories[0]?.id ?? null);
    }
  }, [data?.stories, selectedId]);

  const selectedStory =
    data?.stories.find((story) => story.id === selectedId) ?? null;

  function handleViewChange(nextView: NewsroomView) {
    setView(nextView);
    if (nextView !== "all" && nextView !== "categories" && nextView !== "assignments") {
      setStatus("all");
    }
  }

  return (
    <div className="-m-4 flex h-[calc(100svh-3.5rem-2.25rem)] min-h-[32rem] flex-col overflow-hidden border-y border-border/60 bg-background md:-m-6">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-2">
        <div>
          <h1 className="text-sm font-semibold tracking-tight">Newsroom</h1>
          <p className="text-xs text-muted-foreground">{organizationName}</p>
        </div>
      </div>

      <NewsroomToolbar
        search={search}
        status={status}
        priority={priority}
        sort={sort}
        categories={data?.categories ?? []}
        category={category}
        isRefreshing={isFetching}
        onSearchChange={setSearch}
        onStatusChange={setStatus}
        onPriorityChange={setPriority}
        onCategoryChange={setCategory}
        onSortChange={setSort}
        onRefresh={() => {
          void refetch();
        }}
      />

      <div className="flex min-h-0 flex-1">
        <NewsroomSidebar
          activeView={view}
          categories={data?.categories ?? []}
          selectedCategory={category}
          onViewChange={handleViewChange}
          onCategorySelect={(value) => {
            setCategory(value);
            setView("categories");
          }}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          {isLoading ? (
            <div className="space-y-3 p-4" aria-busy="true">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-3/4" />
            </div>
          ) : null}

          {isError ? (
            <div className="p-4">
              <Alert variant="destructive">
                <AlertTitle>Unable to load stories</AlertTitle>
                <AlertDescription>
                  {error instanceof Error
                    ? error.message
                    : "An unexpected error occurred."}
                </AlertDescription>
              </Alert>
            </div>
          ) : null}

          {!isLoading && !isError && view === "assignments" ? (
            <div className="p-4">
              <StoryEmptyState
                title="Assignments"
                description="Assignment workflows are reserved for a later newsroom collaboration feature."
              />
            </div>
          ) : null}

          {!isLoading &&
          !isError &&
          view !== "assignments" &&
          data &&
          data.stories.length === 0 ? (
            <div className="p-4">
              <StoryEmptyState
                title={
                  view === "trash"
                    ? "Trash is empty"
                    : deferredSearch
                      ? "No matching stories"
                      : "No stories in this view"
                }
                description={
                  view === "trash"
                    ? "Soft-deleted stories will appear here."
                    : "Start coverage by creating a new story."
                }
                onAction={
                  view === "trash"
                    ? undefined
                    : () => router.push("/newsroom/new")
                }
              />
            </div>
          ) : null}

          {!isLoading &&
          !isError &&
          view !== "assignments" &&
          data &&
          data.stories.length > 0 ? (
            <StoryList
              stories={data.stories}
              selectedId={selectedId}
              page={data.page}
              pageSize={data.pageSize}
              total={data.total}
              onSelect={setSelectedId}
              onPageChange={setPage}
            />
          ) : null}
        </div>

        <StoryContextPanel story={selectedStory} />
      </div>
    </div>
  );
}
