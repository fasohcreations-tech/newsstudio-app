"use client";

import { useEffect, useMemo, useState } from "react";

import { createSignedAssetUrl } from "@/features/media/services/media.service";
import {
  collectClipIds,
  collectLibraryAssetIds,
  resolveLibraryRefsInBindings,
} from "@/features/story-production/lib/library-media-reference";
import { createClient } from "@/shared/lib/supabase/client";

/**
 * Resolves `library://{assetId}` and `clip://{clipId}` to playback URLs.
 * Clips resolve through their parent asset (or external_url).
 */
export function useResolvedStoryBindings(bindings: Record<string, string>) {
  const assetIds = useMemo(() => collectLibraryAssetIds(bindings), [bindings]);
  const clipIds = useMemo(() => collectClipIds(bindings), [bindings]);
  const assetKey = useMemo(() => assetIds.join(","), [assetIds]);
  const clipKey = useMemo(() => clipIds.join(","), [clipIds]);
  const [urlByAssetId, setUrlByAssetId] = useState<Record<string, string>>({});
  const [urlByClipId, setUrlByClipId] = useState<Record<string, string>>({});

  useEffect(() => {
    if (assetIds.length === 0 && clipIds.length === 0) {
      setUrlByAssetId({});
      setUrlByClipId({});
      return;
    }

    let cancelled = false;

    void (async () => {
      const supabase = createClient();
      const nextAssets: Record<string, string> = {};
      const nextClips: Record<string, string> = {};

      if (assetIds.length > 0) {
        const { data: assets } = await supabase
          .from("media_assets")
          .select("id, storage_bucket, storage_path, external_url")
          .in("id", assetIds)
          .is("deleted_at", null);

        for (const asset of assets ?? []) {
          if (asset.external_url) {
            nextAssets[asset.id] = asset.external_url;
            continue;
          }
          const { url } = await createSignedAssetUrl(
            supabase,
            asset.storage_bucket,
            asset.storage_path,
            60 * 60,
          );
          if (url) nextAssets[asset.id] = url;
        }
      }

      if (clipIds.length > 0) {
        const { data: clips } = await supabase
          .from("media_asset_clips")
          .select(
            "id, parent_asset_id, parent:media_assets!media_asset_clips_parent_asset_id_fkey(id, storage_bucket, storage_path, external_url)",
          )
          .in("id", clipIds)
          .is("deleted_at", null);

        for (const clip of clips ?? []) {
          const parentRaw = clip.parent as
            | {
                id: string;
                storage_bucket: string;
                storage_path: string;
                external_url: string | null;
              }
            | {
                id: string;
                storage_bucket: string;
                storage_path: string;
                external_url: string | null;
              }[]
            | null;
          const parent = Array.isArray(parentRaw)
            ? parentRaw[0] ?? null
            : parentRaw;
          if (!parent) continue;
          if (parent.external_url) {
            nextClips[clip.id] = parent.external_url;
            continue;
          }
          const { url } = await createSignedAssetUrl(
            supabase,
            parent.storage_bucket,
            parent.storage_path,
            60 * 60,
          );
          if (url) nextClips[clip.id] = url;
        }
      }

      if (cancelled) return;
      setUrlByAssetId(nextAssets);
      setUrlByClipId(nextClips);
    })();

    return () => {
      cancelled = true;
    };
  }, [assetKey, clipKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return useMemo(
    () => resolveLibraryRefsInBindings(bindings, urlByAssetId, urlByClipId),
    [bindings, urlByAssetId, urlByClipId],
  );
}
