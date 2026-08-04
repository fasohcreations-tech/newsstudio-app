import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  createLocalMediaLibraryProvider,
  createOrganizationLibraryProvider,
  createSupabaseStorageProvider,
} from "@/features/ai-asset-discovery/providers/local-media.provider";
import {
  customSearchProvider,
  freeImageProvider,
  freeVideoProvider,
  licensedStockProvider,
  newsAgencyProvider,
} from "@/features/ai-asset-discovery/providers/external-stub.providers";
import { createPreviouslyUsedProvider } from "@/features/ai-asset-discovery/providers/previously-used.provider";
import type { AssetDiscoveryProvider } from "@/features/ai-asset-discovery/providers/provider.types";
import type { AssetDiscoveryProviderId } from "@/features/ai-asset-discovery/types/discovery.types";

type Client = SupabaseClient;

/**
 * Registry of discovery providers. New sources register here.
 */
export function getAssetDiscoveryProviders(
  client: Client,
): AssetDiscoveryProvider[] {
  return [
    createLocalMediaLibraryProvider(client),
    createOrganizationLibraryProvider(client),
    createSupabaseStorageProvider(client),
    createPreviouslyUsedProvider(client),
    freeImageProvider,
    freeVideoProvider,
    licensedStockProvider,
    newsAgencyProvider,
    customSearchProvider,
  ];
}

export function getEnabledDiscoveryProviders(
  client: Client,
  preferred?: AssetDiscoveryProviderId | null,
): AssetDiscoveryProvider[] {
  const all = getAssetDiscoveryProviders(client).filter((p) => p.enabled);
  if (!preferred) return all;
  return [
    ...all.filter((p) => p.id === preferred),
    ...all.filter((p) => p.id !== preferred),
  ];
}
