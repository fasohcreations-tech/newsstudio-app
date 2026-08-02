import type { MediaListFilters } from "@/features/media/types/media.types";

export const mediaQueryKeys = {
  all: ["media"] as const,
  lists: () => [...mediaQueryKeys.all, "list"] as const,
  list: (filters: MediaListFilters) =>
    [...mediaQueryKeys.lists(), filters] as const,
  folders: (organizationId: string) =>
    [...mediaQueryKeys.all, "folders", organizationId] as const,
  stories: (organizationId: string) =>
    [...mediaQueryKeys.all, "stories", organizationId] as const,
  detail: (id: string) => [...mediaQueryKeys.all, "detail", id] as const,
  storyAssets: (storyId: string) =>
    [...mediaQueryKeys.all, "story-assets", storyId] as const,
};
