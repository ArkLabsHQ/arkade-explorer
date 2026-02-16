import { useParams } from 'react-router-dom';
import { useAssetDetails } from '../hooks/useAssetDetails';
import { AssetDetailsCard } from '../components/Asset/AssetDetails';
import { LoadingSpinner } from '../components/UI/LoadingSpinner';
import { ErrorMessage } from '../components/UI/ErrorMessage';

export function AssetPage() {
  const { assetId } = useParams<{ assetId: string }>();
  const { assetDetails, isLoading, error } = useAssetDetails(assetId);

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
