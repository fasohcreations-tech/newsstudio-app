"use client";

import { useCallback, useMemo } from "react";

import { usePersistedState } from "@/features/platform/hooks/use-persisted-state";

const FAVORITES_KEY = "mediaos.media.favorites";
const RECENT_KEY = "mediaos.media.recent";

/**
 * Client-only favorites + recent media (no DB changes).
 */
export function useMediaCollections(organizationId: string) {
  const favKey = `${FAVORITES_KEY}.${organizationId}`;
  const recentKey = `${RECENT_KEY}.${organizationId}`;
  const [favoriteIds, setFavoriteIds] = usePersistedState<string[]>(favKey, []);
  const [recentIds, setRecentIds] = usePersistedState<string[]>(recentKey, []);

  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const toggleFavorite = useCallback(
    (assetId: string) => {
      setFavoriteIds((prev) =>
        prev.includes(assetId)
          ? prev.filter((id) => id !== assetId)
          : [assetId, ...prev].slice(0, 200),
      );
    },
    [setFavoriteIds],
  );

  const touchRecent = useCallback(
    (assetId: string) => {
      setRecentIds((prev) =>
        [assetId, ...prev.filter((id) => id !== assetId)].slice(0, 24),
      );
    },
    [setRecentIds],
  );

  return {
    favoriteIds,
    recentIds,
    isFavorite: (id: string) => favoriteSet.has(id),
    toggleFavorite,
    touchRecent,
  };
}
