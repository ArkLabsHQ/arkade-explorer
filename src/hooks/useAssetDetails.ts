import { useQuery } from '@tanstack/react-query';
import { indexerClient } from '../lib/api/indexer';
import type { AssetDetails } from '../lib/api/indexer';

const CACHE_PREFIX = 'asset-details:';

function readFromSessionStorage(assetId: string): AssetDetails | null {
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + assetId);
    if (!raw) return null;
    return JSON.parse(raw) as AssetDetails;
  } catch {
    return null;
  }
}

function writeToSessionStorage(assetId: string, details: AssetDetails): void {
  try {
    sessionStorage.setItem(CACHE_PREFIX + assetId, JSON.stringify(details));
  } catch {
    // Session storage full or unavailable — ignore
  }
}

/**
 * Hook to fetch and cache asset details.
 * Two-tier cache: session storage (persists across page nav) + react-query (in-memory dedup).
 */
export function useAssetDetails(assetId: string | undefined) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['asset-details', assetId],
    queryFn: async () => {
      if (!assetId) throw new Error('No assetId');

      // Check session storage first
      const cached = readFromSessionStorage(assetId);
      if (cached) return cached;

      // Fetch from indexer
      const details = await indexerClient.getAssetDetails(assetId);
      writeToSessionStorage(assetId, details);
      return details;
    },
    enabled: !!assetId,
    staleTime: Infinity, // Asset metadata is immutable
    retry: 1,
  });

  return {
    assetDetails: data ?? null,
    isLoading,
    error: error as Error | null,
  };
}
