"use client";

import { useEffect, useMemo, useState } from "react";

import { createSignedAssetUrl } from "@/features/media/services/media.service";
import {
  collectLibraryAssetIds,
  resolveLibraryRefsInBindings,
} from "@/features/story-production/lib/library-media-reference";
import { createClient } from "@/shared/lib/supabase/client";

/**
 * Resolves `library://{assetId}` binding values to signed playback URLs.
 * Story SSOT keeps library refs; preview receives playable URLs.
 */
export function useResolvedStoryBindings(bindings: Record<string, string>) {
  const assetIds = useMemo(() => collectLibraryAssetIds(bindings), [bindings]);
  const assetKey = useMemo(() => assetIds.join(","), [assetIds]);
  const stableAssetIds = useMemo(
    () => (assetKey ? assetKey.split(",") : []),
    [assetKey],
  );
  const [urlByAssetId, setUrlByAssetId] = useState<Record<string, string>>({});

  useEffect(() => {
    if (stableAssetIds.length === 0) {
      setUrlByAssetId((prev) =>
        Object.keys(prev).length === 0 ? prev : {},
      );
      return;
    }

    let cancelled = false;
    const ids = stableAssetIds;

    void (async () => {
      const supabase = createClient();
      const { data: assets, error } = await supabase
        .from("media_assets")
        .select("id, storage_bucket, storage_path")
        .in("id", ids)
        .is("deleted_at", null);

      if (cancelled || error || !assets) return;

      const pairs = await Promise.all(
        assets.map(async (asset) => {
          const { url } = await createSignedAssetUrl(
            supabase,
            asset.storage_bucket,
            asset.storage_path,
            60 * 60,
          );
          return [asset.id, url] as const;
        }),
      );

      if (cancelled) return;
      const next: Record<string, string> = {};
      for (const [assetId, url] of pairs) {
        if (url) next[assetId] = url;
      }
      setUrlByAssetId(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [assetKey, stableAssetIds]);

  return useMemo(
    () => resolveLibraryRefsInBindings(bindings, urlByAssetId),
    [bindings, urlByAssetId],
  );
}
