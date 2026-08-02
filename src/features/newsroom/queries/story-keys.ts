import type { StoryListFilters } from "@/features/newsroom/types/story.types";

export const storyQueryKeys = {
  all: ["stories"] as const,
  lists: () => [...storyQueryKeys.all, "list"] as const,
  list: (filters: StoryListFilters) =>
    [...storyQueryKeys.lists(), filters] as const,
  details: () => [...storyQueryKeys.all, "detail"] as const,
  detail: (id: string) => [...storyQueryKeys.details(), id] as const,
  dashboard: (organizationId: string) =>
    [...storyQueryKeys.all, "dashboard", organizationId] as const,
};
