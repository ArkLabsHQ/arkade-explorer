import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useAssetDetails } from "@/hooks/use-asset-details";
import { useRecentSearches } from "@/hooks/use-recent-searches";
import { AssetDetail } from "@/components/shared/asset-detail";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { ErrorMessage } from "@/components/shared/error-message";
import { PageTransition } from "@/components/shared/page-transition";

export function AssetPage() {
    const { assetId } = useParams<{ assetId: string }>();
    const { assetDetails, isLoading, error } = useAssetDetails(assetId);
    const { addRecentSearch } = useRecentSearches();

    useEffect(() => {
        if (assetId) addRecentSearch(assetId, "asset");
    }, [assetId, addRecentSearch]);

    return (
        <PageTransition>
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <Link
                        to="/"
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
                    >
                        Home
                    </Link>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-sm text-foreground">Asset</span>
                </div>

                {isLoading ? (
                    <LoadingSpinner />
                ) : error ? (
                    <ErrorMessage message={error.message || "Failed to load asset details"} />
                ) : assetDetails ? (
                    <AssetDetail assetDetails={assetDetails} />
                ) : (
                    <ErrorMessage message="Asset not found" />
                )}
            </div>
        </PageTransition>
    );
}
