"use client";

import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/shared/lib/supabase/client";
import {
  listAllMediaFolders,
  listMediaAssets,
  listOrganizationStories,
  listStoryAssets,
} from "@/features/media/services/media.service";
import { mediaQueryKeys } from "@/features/media/queries/media-keys";
import type { MediaListFilters } from "@/features/media/types/media.types";

export function useMediaLibrary(filters: MediaListFilters, enabled = true) {
  return useQuery({
    queryKey: mediaQueryKeys.list(filters),
    enabled: enabled && Boolean(filters.organizationId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await listMediaAssets(supabase, filters);
      if (error || !data) {
        throw new Error(error ?? "Unable to load media library.");
      }
      return data;
    },
  });
}

export function useMediaFolders(organizationId: string) {
  return useQuery({
    queryKey: mediaQueryKeys.folders(organizationId),
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const supabase = createClient();
      const { folders, error } = await listAllMediaFolders(
        supabase,
        organizationId,
      );
      if (error) throw new Error(error);
      return folders;
    },
  });
}

export function useOrganizationStories(organizationId: string) {
  return useQuery({
    queryKey: mediaQueryKeys.stories(organizationId),
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const supabase = createClient();
      const { stories, error } = await listOrganizationStories(
        supabase,
        organizationId,
      );
      if (error) throw new Error(error);
      return stories;
    },
  });
}

export function useStoryAssets(storyId: string) {
  return useQuery({
    queryKey: mediaQueryKeys.storyAssets(storyId),
    enabled: Boolean(storyId),
    queryFn: async () => {
      const supabase = createClient();
      const { assets, error } = await listStoryAssets(supabase, storyId);
      if (error) throw new Error(error);
      return assets;
    },
  });
}
