'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useAssetDetails } from '@/hooks/use-asset-details';
import { useRecentSearches } from '@/hooks/use-recent-searches';
import { AssetDetail } from '@/components/shared/asset-detail';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { ErrorMessage } from '@/components/shared/error-message';
import { PageTransition } from '@/components/shared/page-transition';

interface AssetPageClientProps {
  assetId: string;
}

export function AssetPageClient({ assetId }: AssetPageClientProps) {
  const { assetDetails, isLoading, error } = useAssetDetails(assetId);
  const { addRecentSearch } = useRecentSearches();

  // Add to recent searches on mount
  useEffect(() => {
    addRecentSearch(assetId, 'asset');
  }, [assetId, addRecentSearch]);

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
          >
            Home
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm text-foreground">Asset</span>
        </div>

        {/* Content */}
        {isLoading ? (
          <LoadingSpinner />
        ) : error ? (
          <ErrorMessage
            message={error.message || 'Failed to load asset details'}
          />
        ) : assetDetails ? (
          <AssetDetail assetDetails={assetDetails} />
        ) : (
          <ErrorMessage message="Asset not found" />
        )}
      </div>
    </PageTransition>
  );
}
