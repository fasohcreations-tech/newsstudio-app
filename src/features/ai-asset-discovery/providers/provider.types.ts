/**
 * Asset Discovery provider contract — add sources without changing the engine core.
 */

import type {
  AssetDiscoveryProviderId,
  ProviderHit,
  ProviderSearchInput,
} from "@/features/ai-asset-discovery/types/discovery.types";

export type AssetDiscoveryProvider = {
  readonly id: AssetDiscoveryProviderId;
  readonly displayName: string;
  readonly enabled: boolean;
  search(input: ProviderSearchInput): Promise<ProviderHit[]>;
};
