import { useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronDown, ChevronRight } from "lucide-react";
import { AssetBadge } from "@/components/shared/asset-badge";
import { AssetAmountDisplay } from "@/components/shared/asset-amount-display";

interface TransactionAsset {
    assetId: string;
    amount: number | bigint;
}

const PREVIEW_COUNT = 8;

export function TransactionAssets({ assets }: { assets: TransactionAsset[] }) {
    const [expanded, setExpanded] = useState(false);

    if (assets.length === 0) return null;

    const hasMore = assets.length > PREVIEW_COUNT;

    return (
        <div className="min-w-0 space-y-1">
            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>Assets</span>
                <span className="tabular-nums">
                    {hasMore && !expanded && `${PREVIEW_COUNT} of `}
                    {assets.length.toLocaleString()}
                </span>
            </div>
            {expanded && hasMore ? (
                <VirtualizedAssetRows assets={assets} />
            ) : (
                <div role="list" aria-label="Transaction assets">
                    {assets.slice(0, PREVIEW_COUNT).map((asset, index) => (
                        <TransactionAssetRow key={`${asset.assetId}:${index}`} asset={asset} />
                    ))}
                </div>
            )}
            {hasMore && (
                <button
                    onClick={() => setExpanded(!expanded)}
                    aria-expanded={expanded}
                    className="flex items-center gap-1 rounded py-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                    {expanded ? (
                        <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {expanded
                        ? "Show fewer assets"
                        : `Show all ${assets.length.toLocaleString()} assets`}
                </button>
            )}
        </div>
    );
}

function TransactionAssetRow({ asset }: { asset: TransactionAsset }) {
    return (
        <div
            role="listitem"
            className="grid min-h-10 min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-3 border-b border-border/60 py-2 text-sm"
        >
            <AssetBadge assetId={asset.assetId} />
            <AssetAmountDisplay
                amount={asset.amount}
                assetId={asset.assetId}
                hideUnit
                className="min-w-0 justify-end"
                valueClassName="break-all text-right font-medium tabular-nums text-foreground"
            />
        </div>
    );
}

function VirtualizedAssetRows({ assets }: { assets: TransactionAsset[] }) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const virtualizer = useVirtualizer({
        count: assets.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => 40,
        overscan: 4,
        getItemKey: (index) => `${assets[index].assetId}:${index}`,
    });

    return (
        <div
            ref={scrollRef}
            role="region"
            aria-label="All transaction assets"
            tabIndex={0}
            className="max-h-80 overflow-x-hidden overflow-y-auto"
        >
            <div role="list" style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
                {virtualizer.getVirtualItems().map((item) => (
                    <div
                        key={item.key}
                        data-index={item.index}
                        ref={virtualizer.measureElement}
                        style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            transform: `translateY(${item.start}px)`,
                        }}
                    >
                        <TransactionAssetRow asset={assets[item.index]} />
                    </div>
                ))}
            </div>
        </div>
    );
}
