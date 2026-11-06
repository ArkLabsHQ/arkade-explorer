import { useRef } from "react";
import type { VirtualCoin } from "@arkade-os/sdk";
import { useVirtualizer } from "@tanstack/react-virtual";
import { MoneyDisplay } from "@/components/shared/money-display";
import { AssetBadge } from "@/components/shared/asset-badge";
import { AssetAmountDisplay } from "@/components/shared/asset-amount-display";
import {
    isVtxoActive,
    sumActiveVtxoValue,
    sumVtxoValue,
    aggregateAssetBalances,
} from "@/lib/vtxo-aggregation";

interface AddressStatsProps {
    vtxos: VirtualCoin[];
    className?: string;
    isDraining?: boolean;
}

export function AddressStats({ vtxos, className = "", isDraining }: AddressStatsProps) {
    const activeCount = vtxos.filter(isVtxoActive).length;
    const totalBalance = sumActiveVtxoValue(vtxos);
    const totalReceived = sumVtxoValue(vtxos);
    const assetEntries = Array.from(aggregateAssetBalances(vtxos).entries());

    return (
        <section
            className={`min-w-0 overflow-hidden rounded-xl border border-border bg-card ${className}`}
        >
            <div className="grid gap-6 p-5 sm:grid-cols-2 sm:p-6 md:grid-cols-[1.4fr_1fr_auto] md:items-center">
                <div className="min-w-0 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        Balance
                        {isDraining && <span className="text-xs">Updating…</span>}
                    </div>
                    <MoneyDisplay
                        sats={totalBalance}
                        className="block break-all text-2xl font-semibold text-foreground sm:text-3xl"
                        valueClassName="tabular-nums"
                        unitClassName="text-sm font-normal text-muted-foreground"
                    />
                </div>
                <div className="min-w-0 space-y-2">
                    <div className="text-sm text-muted-foreground">Total received</div>
                    <MoneyDisplay
                        sats={totalReceived}
                        className="block break-all text-lg font-medium text-foreground"
                        unitClassName="text-sm font-normal text-muted-foreground"
                    />
                </div>
                <div className="flex gap-6 border-t border-border pt-4 text-sm sm:col-span-2 md:col-span-1 md:border-t-0 md:border-l md:pl-6 md:pt-0">
                    <div>
                        <div className="text-xl font-semibold tabular-nums text-foreground">
                            {activeCount.toLocaleString()}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">Active outputs</div>
                    </div>
                    <div>
                        <div className="text-xl font-semibold tabular-nums text-foreground">
                            {(vtxos.length - activeCount).toLocaleString()}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">Spent outputs</div>
                    </div>
                </div>
            </div>

            {assetEntries.length > 0 && (
                <div className="border-t border-border">
                    <div className="flex items-center justify-between gap-3 px-5 py-4 sm:px-6">
                        <h2 className="text-sm font-medium text-foreground">Asset holdings</h2>
                        <span className="text-xs text-muted-foreground">
                            {assetEntries.length.toLocaleString()} asset
                            {assetEntries.length !== 1 ? "s" : ""}
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <div className="min-w-0 px-5 pb-2 sm:px-6">
                            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-4 border-b border-border pb-3 text-xs text-muted-foreground">
                                <span>Asset</span>
                                <span className="text-right">Balance</span>
                                <span className="text-right">Received</span>
                            </div>
                            <AssetRowsVirtualized assetEntries={assetEntries} />
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

function AssetRowsVirtualized({
    assetEntries,
}: {
    assetEntries: [string, { active: number; total: number }][];
}) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const virtualizer = useVirtualizer({
        count: assetEntries.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => 48,
        overscan: 10,
        getItemKey: (index) => assetEntries[index][0],
    });

    return (
        <div ref={scrollRef} className="max-h-96 overflow-y-auto overflow-x-hidden">
            <div
                style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    position: "relative",
                    width: "100%",
                }}
            >
                {virtualizer.getVirtualItems().map((item) => {
                    const [assetId, balances] = assetEntries[item.index];
                    return (
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
                            className="grid min-h-12 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-x-4 border-b border-border py-3 text-xs sm:text-sm last:border-b-0"
                        >
                            <AssetBadge
                                assetId={assetId}
                                className="min-w-0 [&_a]:max-w-full [&_a]:truncate"
                            />
                            <AssetAmountDisplay
                                amount={balances.active}
                                assetId={assetId}
                                hideUnit
                                className="min-w-0 justify-end"
                                valueClassName="break-all text-right font-medium tabular-nums text-foreground"
                            />
                            <AssetAmountDisplay
                                amount={balances.total}
                                assetId={assetId}
                                hideUnit
                                className="min-w-0 justify-end"
                                valueClassName="break-all text-right tabular-nums text-muted-foreground"
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
