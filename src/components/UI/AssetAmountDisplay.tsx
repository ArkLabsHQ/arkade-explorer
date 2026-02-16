import { Link } from 'react-router-dom';
import { useAssetDetails } from '../../hooks/useAssetDetails';
import { truncateHash } from '../../lib/utils';

interface AssetAmountDisplayProps {
  amount: number;
  assetId: string;
  className?: string;
  valueClassName?: string;
  unitClassName?: string;
}

function formatAssetAmount(amount: number, decimals: number): string {
  if (decimals === 0) return amount.toLocaleString('en-US');
  const divisor = Math.pow(10, decimals);
  const formatted = (amount / divisor).toFixed(decimals);
  // Add thousand separators to the integer part
  const [intPart, decPart] = formatted.split('.');
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decPart ? `${formattedInt}.${decPart}` : formattedInt;
}

export function AssetAmountDisplay({
  amount,
  assetId,
  className = '',
  valueClassName = '',
  unitClassName = '',
}: AssetAmountDisplayProps) {
  const { assetDetails, isLoading } = useAssetDetails(assetId);
  const metadata = assetDetails?.metadata;
  const decimals = metadata?.decimals ?? 0;
  const ticker = metadata?.ticker || metadata?.name || truncateHash(assetId, 6, 6);
  const formatted = formatAssetAmount(amount, decimals);

  return (
    <span className={className}>
      <span className={valueClassName}>{formatted}</span>
      <Link
        to={`/asset/${assetId}`}
        className={`${unitClassName} hover:underline ${isLoading ? 'animate-pulse' : ''}`}
        title={assetId}
      >
        {' '}{metadata?.icon && (
          <img src={metadata.icon} alt="" className="inline w-3.5 h-3.5 rounded-full mr-0.5 align-text-bottom" />
        )}
        {ticker}
      </Link>
    </span>
  );
}
