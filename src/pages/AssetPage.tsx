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
