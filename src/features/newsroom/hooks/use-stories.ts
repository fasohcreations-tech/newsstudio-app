"use client";

import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/shared/lib/supabase/client";
import { listStories } from "@/features/newsroom/services/story.service";
import { storyQueryKeys } from "@/features/newsroom/queries/story-keys";
import type { StoryListFilters } from "@/features/newsroom/types/story.types";

export function useStories(filters: StoryListFilters, enabled = true) {
  return useQuery({
    queryKey: storyQueryKeys.list(filters),
    enabled: enabled && Boolean(filters.organizationId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await listStories(supabase, filters);
      if (error || !data) {
        throw new Error(error ?? "Unable to load stories.");
      }
      return data;
    },
  });
}
