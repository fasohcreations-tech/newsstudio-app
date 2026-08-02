"use client";

import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RelativeTime } from "@/features/newsroom/components/relative-time";
import { StoryStatusBadge } from "@/features/newsroom/components/story-status-badge";
import { StoryPriorityIndicator } from "@/features/newsroom/components/story-priority-indicator";
import { profileDisplayName } from "@/features/newsroom/lib/story-utils";
import type { StoryWithRelations } from "@/features/newsroom/types/story.types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type StoryListProps = {
  stories: StoryWithRelations[];
  selectedId: string | null;
  page: number;
  pageSize: number;
  total: number;
  onSelect: (storyId: string) => void;
  onPageChange: (page: number) => void;
};

export function StoryList({
  stories,
  selectedId,
  page,
  pageSize,
  total,
  onSelect,
  onPageChange,
}: StoryListProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Story</TableHead>
              <TableHead className="hidden md:table-cell">Status</TableHead>
              <TableHead className="hidden lg:table-cell">Priority</TableHead>
              <TableHead className="hidden lg:table-cell">Reporter</TableHead>
              <TableHead className="hidden xl:table-cell">Category</TableHead>
              <TableHead className="hidden sm:table-cell">Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stories.map((story) => {
              const selected = story.id === selectedId;
              return (
                <TableRow
                  key={story.id}
                  data-state={selected ? "selected" : undefined}
                  className={cn(
                    "cursor-pointer",
                    selected && "bg-muted/60",
                  )}
                  onClick={() => onSelect(story.id)}
                >
                  <TableCell>
                    <div className="space-y-1">
                      <Link
                        href={`/newsroom/stories/${story.id}`}
                        className="font-medium underline-offset-2 hover:underline"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {story.title}
                      </Link>
                      <div className="flex flex-wrap items-center gap-2 md:hidden">
                        <StoryStatusBadge status={story.status} />
                        <StoryPriorityIndicator
                          priority={story.priority}
                          showLabel={false}
                        />
                      </div>
                      {story.subtitle ? (
                        <p className="line-clamp-1 text-xs text-muted-foreground">
                          {story.subtitle}
                        </p>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <StoryStatusBadge status={story.status} />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <StoryPriorityIndicator priority={story.priority} />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {profileDisplayName(story.reporter)}
                  </TableCell>
                  <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">
                    {story.category ?? "—"}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    <RelativeTime value={story.updated_at} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border/60 px-3 py-2 text-xs text-muted-foreground">
        <span>
          {total === 0
            ? "0 stories"
            : `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`}
        </span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </Button>
          <span className="px-2">
            {page} / {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
