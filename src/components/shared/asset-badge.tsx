import { Link } from "react-router-dom";
import { useAssetDetails } from "@/hooks/use-asset-details";

import { truncateHash } from "@/lib/utils";
import { isSafeImageUrl } from "@/lib/api/indexer";

interface AssetBadgeProps {
    assetId: string;
    className?: string;
}

export function AssetBadge({ assetId, className = "" }: AssetBadgeProps) {
    const { assetDetails } = useAssetDetails(assetId);

    const metadata = assetDetails?.metadata;
    const label = metadata?.ticker || metadata?.name || truncateHash(assetId, 6, 6);

    const hasIcon = metadata?.icon && isSafeImageUrl(metadata.icon);

    return (
        <span className={`inline-flex min-w-0 max-w-full items-center gap-1.5 ${className}`}>
            <Link
                to={`/asset/${assetId}`}
                className="inline-flex min-w-0 max-w-full items-center gap-1.5 px-2 py-0.5 text-xs font-medium
          bg-accent border border-border text-accent-foreground
          rounded-md hover:bg-accent/80 transition-colors duration-150"
                title={assetId}
            >
                <span className="truncate">{label}</span>
                {hasIcon && (
                    <img src={metadata.icon} alt="" className="w-3.5 h-3.5 shrink-0 rounded-full" />
                )}
            </Link>
        </span>
    );
}
