import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAssetDetails } from '../hooks/useAssetDetails';
import { AssetDetailsCard } from '../components/Asset/AssetDetails';
import { LoadingSpinner } from '../components/UI/LoadingSpinner';
import { ErrorMessage } from '../components/UI/ErrorMessage';
import { useRecentSearches } from '../hooks/useRecentSearches';

export function AssetPage() {
  const { assetId } = useParams<{ assetId: string }>();
  const { assetDetails, isLoading, error } = useAssetDetails(assetId);
  const { addRecentSearch } = useRecentSearches();
  const addedRef = useRef<string | null>(null);

  useEffect(() => {
    if (assetId && assetId !== addedRef.current) {
      addedRef.current = assetId;
      addRecentSearch(assetId, 'asset');
    }
  }, [assetId, addRecentSearch]);

  useEffect(() => {
    const name = assetDetails?.metadata?.ticker || assetDetails?.metadata?.name;
    document.title = name ? `${name} | Arkade Explorer` : assetId ? `Asset ${assetId.slice(0, 8)}... | Arkade Explorer` : 'Arkade Explorer';
    return () => { document.title = 'Arkade Explorer'; };
  }, [assetId, assetDetails]);

  if (!assetId) {
    return <ErrorMessage message="No asset ID provided" />;
  }

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={`Failed to load asset: ${error.message}`} />;
  }

  if (!assetDetails) {
    return <ErrorMessage message="Asset not found" />;
  }

  return (
    <div className="space-y-6">
      <AssetDetailsCard assetDetails={assetDetails} />
    </div>
  );
}
