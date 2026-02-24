import { Link } from 'react-router-dom';
import { useAssetDetails } from '../../hooks/useAssetDetails';
import { truncateHash } from '../../lib/utils';
import { isSafeImageUrl, formatAssetAmount } from '../../lib/api/indexer';
import { ImageLightbox } from './ImageLightbox';

interface AssetAmountDisplayProps {
  amount: number;
  assetId: string;
  className?: string;
  valueClassName?: string;
  unitClassName?: string;
  hideUnit?: boolean;
}

export function AssetAmountDisplay({
  amount,
  assetId,
  className = '',
  valueClassName = '',
  unitClassName = '',
  hideUnit = false,
}: AssetAmountDisplayProps) {
  const { assetDetails, isLoading } = useAssetDetails(assetId);
  const metadata = assetDetails?.metadata;
  const decimals = metadata?.decimals ?? 0;
  const ticker = metadata?.ticker || metadata?.name || truncateHash(assetId, 6, 6);
  const formatted = formatAssetAmount(amount, decimals);

  return (
    <span className={`${className} inline-flex items-center gap-1`}>
      <span className={valueClassName}>{formatted}</span>
      {!hideUnit && metadata?.icon && isSafeImageUrl(metadata.icon) && (
        <ImageLightbox src={metadata.icon} className="inline w-3.5 h-3.5 rounded-full" />
      )}
      {!hideUnit && (
        <Link
          to={`/asset/${assetId}`}
          className={`${unitClassName} hover:underline ${isLoading ? 'animate-pulse' : ''}`}
          title={assetId}
        >
          {ticker}
        </Link>
      )}
    </span>
  );
}
