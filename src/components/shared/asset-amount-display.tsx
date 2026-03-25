'use client';

import Link from 'next/link';
import { useAssetDetails } from '@/hooks/use-asset-details';
import { useAssetIconApproval } from '@/providers/asset-icon-approval-provider';
import { truncateHash } from '@/lib/utils';
import { isSafeImageUrl, formatAssetAmount } from '@/lib/api/indexer';

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
  const { isApproved } = useAssetIconApproval();
  const metadata = assetDetails?.metadata;
  const decimals = metadata?.decimals ?? 0;
  const ticker = metadata?.ticker || metadata?.name || truncateHash(assetId, 6, 6);
  const formatted = formatAssetAmount(amount, decimals);

  return (
    <span className={`${className} inline-flex items-center gap-1`}>
      <span className={valueClassName}>{formatted}</span>
      {!hideUnit && metadata?.icon && isSafeImageUrl(metadata.icon) && isApproved(assetId) && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={metadata.icon}
          alt={ticker}
          className="inline w-3.5 h-3.5 rounded-full"
        />
      )}
      {!hideUnit && (
        <Link
          href={`/asset/${assetId}`}
          className={`${unitClassName} hover:underline ${isLoading ? 'animate-pulse' : ''}`}
          title={assetId}
        >
          {ticker}
        </Link>
      )}
    </span>
  );
}
