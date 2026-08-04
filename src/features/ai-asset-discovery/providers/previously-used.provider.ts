import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  aspectRatioLabel,
  mediaFileTypeToDiscoveryKind,
  orientationLabel,
} from "@/features/ai-asset-discovery/lib/asset-kind";
import type { AssetDiscoveryProvider } from "@/features/ai-asset-discovery/providers/provider.types";
import type { ProviderHit } from "@/features/ai-asset-discovery/types/discovery.types";

type Client = SupabaseClient;

/**
 * Surfaces assets previously attached to stories in this org (GNN reuse pool).
 */
export function createPreviouslyUsedProvider(
  client: Client,
): AssetDiscoveryProvider {
  return {
    id: "previously_used",
    displayName: "Previously Used GNN Assets",
    enabled: true,
    async search(input) {
      const limit = input.limit ?? 12;
      const { data: links, error } = await client
        .from("story_media")
        .select(
          `
          id,
          story_id,
          media_asset_id,
          label,
          deleted_at,
          asset:media_assets(
            id,
            name,
            storage_bucket,
            storage_path,
            file_type,
            mime_type,
            width,
            height,
            organization_id,
            deleted_at
          )
        `,
        )
        .eq("organization_id", input.organizationId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(80);

      if (error || !links) return [];

      const needles = [
        input.context.sceneHeadline,
        input.context.storyHeadline,
        ...input.context.keywords,
        ...input.queries.map((q) => q.text),
      ]
        .join(" ")
        .toLowerCase();

      const hits: ProviderHit[] = [];
      const seen = new Set<string>();

      for (const row of links as Array<{
        media_asset_id: string;
        story_id: string;
        label: string | null;
        asset:
          | {
              id: string;
              name: string;
              storage_bucket: string;
              storage_path: string;
              file_type: string;
              mime_type: string;
              width: number | null;
              height: number | null;
              organization_id: string;
              deleted_at: string | null;
            }
          | Array<{
              id: string;
              name: string;
              storage_bucket: string;
              storage_path: string;
              file_type: string;
              mime_type: string;
              width: number | null;
              height: number | null;
              organization_id: string;
              deleted_at: string | null;
            }>
          | null;
      }>) {
        const asset = Array.isArray(row.asset) ? row.asset[0] : row.asset;
        if (!asset || asset.deleted_at) continue;
        if (seen.has(asset.id)) continue;
        // Prefer assets from other stories; still allow same story reuse.
        seen.add(asset.id);

        const hay = `${asset.name} ${row.label ?? ""}`.toLowerCase();
        const tokens = needles.split(/\s+/).filter((t) => t.length > 2);
        const matchCount = tokens.filter((t) => hay.includes(t)).length;
        const providerScore = Math.min(
          0.9,
          0.4 + matchCount * 0.08 + (row.story_id !== input.storyId ? 0.05 : 0),
        );

        let url: string | null = null;
        try {
          url = client.storage
            .from(asset.storage_bucket)
            .getPublicUrl(asset.storage_path).data.publicUrl;
        } catch {
          url = null;
        }

        hits.push({
          provider: "previously_used",
          providerAssetId: asset.id,
          mediaAssetId: asset.id,
          assetKind: mediaFileTypeToDiscoveryKind(asset.file_type, asset.name),
          title: asset.name,
          thumbnailUrl: url,
          previewUrl: url,
          sourceUrl: url,
          licenseInfo: "Previously used organization asset",
          resolution:
            asset.width && asset.height
              ? `${asset.width}×${asset.height}`
              : "",
          aspectRatio: aspectRatioLabel(asset.width, asset.height),
          orientation: orientationLabel(asset.width, asset.height),
          providerScore,
          metadata: {
            prior_story_id: row.story_id,
            label: row.label,
          },
        });
      }

      return hits
        .sort((a, b) => (b.providerScore ?? 0) - (a.providerScore ?? 0))
        .slice(0, limit);
    },
  };
}
