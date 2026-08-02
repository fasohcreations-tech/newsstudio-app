"use client";

import Link from "next/link";
import {
  Filter,
  Plus,
  RefreshCw,
  Search,
  ArrowUpDown,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  STORY_PRIORITIES,
  STORY_PRIORITY_LABELS,
  STORY_SORT_OPTIONS,
  STORY_STATUSES,
  STORY_STATUS_LABELS,
  type StorySortOption,
} from "@/features/newsroom/constants/story.constants";
import type { StoryPriority, StoryStatus } from "@/shared/types/database.types";

type NewsroomToolbarProps = {
  search: string;
  status: StoryStatus | "all";
  priority: StoryPriority | "all";
  sort: StorySortOption;
  categories: string[];
  category: string | null;
  isRefreshing?: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: StoryStatus | "all") => void;
  onPriorityChange: (value: StoryPriority | "all") => void;
  onCategoryChange: (value: string | null) => void;
  onSortChange: (value: StorySortOption) => void;
  onRefresh: () => void;
};

export function NewsroomToolbar({
  search,
  status,
  priority,
  sort,
  categories,
  category,
  isRefreshing,
  onSearchChange,
  onStatusChange,
  onPriorityChange,
  onCategoryChange,
  onSortChange,
  onRefresh,
}: NewsroomToolbarProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-border/60 bg-background/80 p-3 backdrop-blur md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
        <Link
          href="/newsroom/new"
          className={cn(buttonVariants(), "inline-flex")}
        >
          <Plus />
          New Story
        </Link>
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search stories…"
            className="pl-8"
            aria-label="Search stories"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={status}
          onValueChange={(value) =>
            onStatusChange((value ?? "all") as StoryStatus | "all")
          }
        >
          <SelectTrigger className="w-[140px]" aria-label="Filter by status">
            <Filter className="size-3.5 opacity-60" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STORY_STATUSES.map((item) => (
              <SelectItem key={item} value={item}>
                {STORY_STATUS_LABELS[item]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={priority}
          onValueChange={(value) =>
            onPriorityChange((value ?? "all") as StoryPriority | "all")
          }
        >
          <SelectTrigger className="w-[130px]" aria-label="Filter by priority">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {STORY_PRIORITIES.map((item) => (
              <SelectItem key={item} value={item}>
                {STORY_PRIORITY_LABELS[item]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={category ?? "all"}
          onValueChange={(value) =>
            onCategoryChange(!value || value === "all" ? null : value)
          }
        >
          <SelectTrigger className="w-[140px]" aria-label="Filter by category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={sort}
          onValueChange={(value) =>
            onSortChange((value ?? "updated_at_desc") as StorySortOption)
          }
        >
          <SelectTrigger className="w-[150px]" aria-label="Sort stories">
            <ArrowUpDown className="size-3.5 opacity-60" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STORY_SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-label="Refresh stories"
        >
          <RefreshCw className={isRefreshing ? "animate-spin" : undefined} />
        </Button>
      </div>
    </div>
  );
}
