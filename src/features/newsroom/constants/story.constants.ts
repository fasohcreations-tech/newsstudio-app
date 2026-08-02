import type { StoryPriority, StoryStatus } from "@/shared/types/database.types";

export const STORY_STATUSES = [
  "draft",
  "assigned",
  "in_progress",
  "review",
  "approved",
  "published",
  "archived",
] as const satisfies readonly StoryStatus[];

export const STORY_STATUS_LABELS: Record<StoryStatus, string> = {
  draft: "Draft",
  assigned: "Assigned",
  in_progress: "In Progress",
  review: "Review",
  approved: "Approved",
  published: "Published",
  archived: "Archived",
};

export const STORY_PRIORITIES = [
  "low",
  "normal",
  "high",
  "urgent",
] as const satisfies readonly StoryPriority[];

export const STORY_PRIORITY_LABELS: Record<StoryPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

export const DEFAULT_STORY_LANGUAGE = "ml";

export const STORY_LANGUAGE_OPTIONS = [
  { value: "ml", label: "Malayalam (മലയാളം)" },
  { value: "en", label: "English" },
] as const;

export const STORY_PAGE_SIZE = 20;

export const STORY_SORT_OPTIONS = [
  { value: "updated_at_desc", label: "Last updated" },
  { value: "created_at_desc", label: "Newest created" },
  { value: "title_asc", label: "Title A–Z" },
  { value: "priority_desc", label: "Priority" },
] as const;

export type StorySortOption = (typeof STORY_SORT_OPTIONS)[number]["value"];
