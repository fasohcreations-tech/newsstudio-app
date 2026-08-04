import "server-only";

import type { AssetDiscoveryProvider } from "@/features/ai-asset-discovery/providers/provider.types";
import type {
  AssetDiscoveryProviderId,
  ProviderHit,
} from "@/features/ai-asset-discovery/types/discovery.types";

/**
 * Stub providers for external catalogs — pluggable later without engine changes.
 */
function stubProvider(
  id: AssetDiscoveryProviderId,
  displayName: string,
): AssetDiscoveryProvider {
  return {
    id,
    displayName,
    enabled: true,
    async search(): Promise<ProviderHit[]> {
      // Intentionally empty until API keys / connectors are configured.
      return [];
    },
  };
}

export const freeImageProvider = stubProvider(
  "free_image",
  "Free Image Providers",
);
export const freeVideoProvider = stubProvider(
  "free_video",
  "Free Video Providers",
);
export const licensedStockProvider = stubProvider(
  "licensed_stock",
  "Licensed Stock Providers",
);
export const newsAgencyProvider = stubProvider(
  "news_agency",
  "News Agency Providers",
);
export const customSearchProvider = stubProvider(
  "custom_search",
  "Custom Search APIs",
);
