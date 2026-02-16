import { Link } from 'react-router-dom';
import { useAssetDetails } from '../../hooks/useAssetDetails';
import { truncateHash } from '../../lib/utils';
import { isSafeImageUrl } from '../../lib/api/indexer';

interface AssetBadgeProps {
  assetId: string;
  className?: string;
}

export function AssetBadge({ assetId, className = '' }: AssetBadgeProps) {
  const { assetDetails } = useAssetDetails(assetId);
  const metadata = assetDetails?.metadata;
  const label = metadata?.ticker || metadata?.name || truncateHash(assetId, 6, 6);

  return (
    <Link
      to={`/asset/${assetId}`}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-bold uppercase
        bg-arkade-purple/20 border border-arkade-purple text-arkade-purple
        hover:bg-arkade-purple hover:text-white transition-colors ${className}`}
      title={assetId}
    >
      {metadata?.icon && isSafeImageUrl(metadata.icon) && (
        <img src={metadata.icon} alt="" className="w-3.5 h-3.5 rounded-full" />
      )}
      <span>{label}</span>
    </Link>
  );
}
