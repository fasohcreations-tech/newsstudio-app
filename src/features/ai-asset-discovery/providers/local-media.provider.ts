import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  aspectRatioLabel,
  discoveryKindToMediaFileType,
  mediaFileTypeToDiscoveryKind,
  orientationLabel,
} from "@/features/ai-asset-discovery/lib/asset-kind";
import type { AssetDiscoveryProvider } from "@/features/ai-asset-discovery/providers/provider.types";
import type {
  AssetDiscoveryKind,
  ProviderHit,
  ProviderSearchInput,
} from "@/features/ai-asset-discovery/types/discovery.types";
import { listMediaAssets } from "@/features/media/services/media.service";
import type { MediaFileType } from "@/shared/types/database.types";

type Client = SupabaseClient;

function publicAssetUrl(
  client: Client,
  bucket: string,
  path: string,
): string | null {
  try {
    const { data } = client.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl ?? null;
  } catch {
    return null;
  }
}

function kindsToFileTypes(kinds: AssetDiscoveryKind[]): Array<MediaFileType | "all"> {
  const set = new Set<MediaFileType | "all">();
  for (const kind of kinds) {
    set.add(discoveryKindToMediaFileType(kind));
  }
  if (set.has("all") || set.size === 0) return ["all"];
  return [...set];
}

async function searchLibrary(
  client: Client,
  input: ProviderSearchInput,
  providerId: "local_media_library" | "organization_library" | "supabase_storage",
): Promise<ProviderHit[]> {
  const hits: ProviderHit[] = [];
  const seen = new Set<string>();
  const limit = input.limit ?? 12;

  for (const query of input.queries.slice(0, 4)) {
    const fileTypes = kindsToFileTypes(query.kinds);
    for (const fileType of fileTypes) {
      const listed = await listMediaAssets(client, {
        organizationId: input.organizationId,
        search: query.text,
        fileType,
        includeAllFolders: true,
        page: 1,
        pageSize: Math.min(24, limit * 2),
      });
      if (listed.error || !listed.data) continue;

      for (const asset of listed.data.assets) {
        if (seen.has(asset.id)) continue;
        seen.add(asset.id);
        const url = publicAssetUrl(
          client,
          asset.storage_bucket,
          asset.storage_path,
        );
        hits.push({
          provider: providerId,
          providerAssetId: asset.id,
          mediaAssetId: asset.id,
          assetKind: mediaFileTypeToDiscoveryKind(asset.file_type, asset.name),
          title: asset.name,
          thumbnailUrl: url,
          previewUrl: url,
          sourceUrl: url,
          licenseInfo: "Organization Media Library",
          resolution:
            asset.width && asset.height
              ? `${asset.width}×${asset.height}`
              : "",
          aspectRatio: aspectRatioLabel(asset.width, asset.height),
          orientation: orientationLabel(asset.width, asset.height),
          providerScore: 0.55,
          metadata: {
            mime_type: asset.mime_type,
            folder_id: asset.folder_id,
            file_type: asset.file_type,
          },
        });
        if (hits.length >= limit * 3) break;
      }
      if (hits.length >= limit * 3) break;
    }
    if (hits.length >= limit * 3) break;
  }

  return hits;
}

export function createLocalMediaLibraryProvider(
  client: Client,
): AssetDiscoveryProvider {
  return {
    id: "local_media_library",
    displayName: "Local Media Library",
    enabled: true,
    search: (input) => searchLibrary(client, input, "local_media_library"),
  };
}

export function createOrganizationLibraryProvider(
  client: Client,
): AssetDiscoveryProvider {
  return {
    id: "organization_library",
    displayName: "Organization Asset Library",
    enabled: true,
    search: (input) => searchLibrary(client, input, "organization_library"),
  };
}

export function createSupabaseStorageProvider(
  client: Client,
): AssetDiscoveryProvider {
  return {
    id: "supabase_storage",
    displayName: "Supabase Storage",
    enabled: true,
    search: (input) => searchLibrary(client, input, "supabase_storage"),
  };
}
