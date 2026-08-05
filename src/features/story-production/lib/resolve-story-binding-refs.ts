"use client";

import { createSignedAssetUrl } from "@/features/media/services/media.service";
import {
  collectClipIds,
  collectLibraryAssetIds,
  resolveLibraryRefsInBindings,
} from "@/features/story-production/lib/library-media-reference";
import { createClient } from "@/shared/lib/supabase/client";

/**
 * Imperative twin of `useResolvedStoryBindings` for non-React callers
 * (the Canvas render session resolves bindings once during warm-up).
 *
 * Resolves `library://{assetId}` and `clip://{clipId}` to playback URLs; clips
 * resolve through their parent asset (or external_url).
 */
export async function resolveStoryBindingRefs(
  bindings: Record<string, string>,
): Promise<Record<string, string>> {
  const assetIds = collectLibraryAssetIds(bindings);
  const clipIds = collectClipIds(bindings);
  if (assetIds.length === 0 && clipIds.length === 0) return bindings;

  const supabase = createClient();
  const urlByAssetId: Record<string, string> = {};
  const urlByClipId: Record<string, string> = {};

  if (assetIds.length > 0) {
    const { data: assets } = await supabase
      .from("media_assets")
      .select("id, storage_bucket, storage_path, external_url")
      .in("id", assetIds)
      .is("deleted_at", null);

    for (const asset of assets ?? []) {
      if (asset.external_url) {
        urlByAssetId[asset.id] = asset.external_url;
        continue;
      }
      const { url } = await createSignedAssetUrl(
        supabase,
        asset.storage_bucket,
        asset.storage_path,
        60 * 60,
      );
      if (url) urlByAssetId[asset.id] = url;
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
      const parent = Array.isArray(parentRaw) ? (parentRaw[0] ?? null) : parentRaw;
      if (!parent) continue;
      if (parent.external_url) {
        urlByClipId[clip.id] = parent.external_url;
        continue;
      }
      const { url } = await createSignedAssetUrl(
        supabase,
        parent.storage_bucket,
        parent.storage_path,
        60 * 60,
      );
      if (url) urlByClipId[clip.id] = url;
    }
  }

  return resolveLibraryRefsInBindings(bindings, urlByAssetId, urlByClipId);
}
