import { Link } from 'react-router-dom';
import { useAssetDetails } from '../../hooks/useAssetDetails';
import { truncateHash } from '../../lib/utils';
import { isSafeImageUrl } from '../../lib/api/indexer';
import { ImageLightbox } from './ImageLightbox';

interface AssetBadgeProps {
  assetId: string;
  className?: string;
}

export function AssetBadge({ assetId, className = '' }: AssetBadgeProps) {
  const { assetDetails } = useAssetDetails(assetId);
  const metadata = assetDetails?.metadata;
  const label = metadata?.ticker || metadata?.name || truncateHash(assetId, 6, 6);

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      {metadata?.icon && isSafeImageUrl(metadata.icon) && (
        <ImageLightbox src={metadata.icon} className="w-3.5 h-3.5 rounded-full" />
      )}
      <Link
        to={`/asset/${assetId}`}
        className={`inline-flex items-center px-2 py-0.5 text-xs font-bold uppercase
          bg-arkade-purple/20 border border-arkade-purple text-arkade-purple
          hover:bg-arkade-purple hover:text-white transition-colors`}
        title={assetId}
      >
        {label}
      </Link>
    </span>
  );
}
