'use client';

import Link from 'next/link';
import { useAssetDetails } from '@/hooks/use-asset-details';
import { useAssetIconApproval } from '@/providers/asset-icon-approval-provider';
import { truncateHash } from '@/lib/utils';
import { isSafeImageUrl } from '@/lib/api/indexer';

interface AssetBadgeProps {
  assetId: string;
  className?: string;
}

export function AssetBadge({ assetId, className = '' }: AssetBadgeProps) {
  const { assetDetails } = useAssetDetails(assetId);
  const { isApproved } = useAssetIconApproval();
  const metadata = assetDetails?.metadata;
  const label = metadata?.ticker || metadata?.name || truncateHash(assetId, 6, 6);

  const hasIcon = metadata?.icon && isSafeImageUrl(metadata.icon);

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <Link
        href={`/asset/${assetId}`}
        className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-bold uppercase
          bg-primary/10 border border-primary/30 text-primary
          rounded-md hover:bg-primary/20 transition-colors duration-150"
        title={assetId}
      >
        {label}
        {hasIcon && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={metadata.icon}
            alt={label}
            className="w-3.5 h-3.5 rounded-full"
          />
        )}
      </Link>
    </span>
  );
}
